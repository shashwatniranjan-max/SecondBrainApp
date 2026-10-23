import { YoutubeTranscript } from 'youtube-transcript';

interface CaptionTrack {
  baseUrl: string;
  name?: { runs?: Array<{ text: string }> };
  vssId?: string;
  languageCode: string;
  kind?: string;
  isTranslatable?: boolean;
}

const INNERTUBE_CLIENTS = [
  {
    name: 'ANDROID',
    context: {
      client: {
        clientName: 'ANDROID',
        clientVersion: '20.10.38',
        androidSdkVersion: 34,
      },
    },
    userAgent: 'com.google.android.youtube/20.10.38 (Linux; U; Android 14)',
  },
  {
    name: 'TV_EMBEDDED',
    context: {
      client: {
        clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
        clientVersion: '2.0',
      },
    },
    userAgent: 'Mozilla/5.0 (PlayStation 4 5.05) AppleWebKit/605.1.15 (KHTML, like Gecko)',
  },
  {
    name: 'WEB',
    context: {
      client: {
        clientName: 'WEB',
        clientVersion: '2.20240101.00.00',
      },
    },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  },
  {
    name: 'IOS',
    context: {
      client: {
        clientName: 'IOS',
        clientVersion: '19.45.4',
        deviceModel: 'iPhone16,2',
      },
    },
    userAgent: 'com.google.ios.youtube/19.45.4 (iPhone16,2; U; CPU iOS 17_5 like Mac OS X)',
  },
];

export class YouTubeService {
  /**
   * Extracts an 11-character YouTube video ID from various URL patterns or bare IDs.
   */
  static extractVideoId(rawUrl: string): string | null {
    if (!rawUrl || typeof rawUrl !== 'string') return null;
    const trimmed = rawUrl.trim();

    // Check if it's already an 11-char video ID
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    // Support watch, embed, v, shorts, live, and youtu.be URLs
    const match = trimmed.match(
      /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i
    );
    return match ? match[1] : null;
  }

  /**
   * Retrieves video title and metadata using YouTube's official oEmbed service,
   * with fallback to HTML scraping.
   */
  static async getMetadata(url: string, videoId?: string): Promise<{ title: string; author?: string }> {
    const id = videoId || this.extractVideoId(url);
    const targetUrl = id ? `https://www.youtube.com/watch?v=${id}` : url.trim();

    // 1. Official YouTube oEmbed API (does not block, requires no API key)
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`;
      const res = await fetch(oembedUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.title && typeof data.title === 'string' && data.title.trim()) {
          return {
            title: data.title.trim(),
            author: data.author_name || undefined,
          };
        }
      }
    } catch {
      // ignore and fallback
    }

    // 2. Fallback to HTML title extraction
    try {
      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        },
      });
      const text = await res.text();
      const ogTitle = text.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
      if (ogTitle && ogTitle[1] && ogTitle[1] !== 'YouTube') {
        return { title: ogTitle[1].trim() };
      }
      const titleMatch = text.match(/<title>(.*?)<\/title>/i);
      let title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : '';
      if (title && title !== 'YouTube' && !title.startsWith('http')) {
        return { title };
      }
    } catch {
      // ignore
    }

    return { title: 'YouTube Video' };
  }

  /**
   * Formats milliseconds into [mm:ss] or [hh:mm:ss]
   */
  private static formatTimestamp(startMs: number): string {
    const totalSeconds = Math.max(0, Math.floor(startMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `[${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}]`;
    }
    return `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}]`;
  }

  /**
   * Parses XML transcript response supporting format 3 (<p t="..." d="...">) and legacy (<text start="..." dur="...">).
   */
  private static parseTranscriptXml(xml: string): string[] {
    const lines: string[] = [];

    // Modern InnerTube format 3 (<p t="18640" d="3240">text</p>)
    const pRegex = /<p\s+t="(\d+)"[^>]*>([\s\S]*?)<\/p>/gi;
    let match;
    while ((match = pRegex.exec(xml)) !== null) {
      const startMs = parseInt(match[1], 10);
      const timeString = this.formatTimestamp(startMs);
      const rawText = match[2].replace(/<[^>]+>/g, '').trim();
      if (!rawText) continue;
      const decoded = rawText
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
      lines.push(`${timeString} ${decoded}`);
    }

    if (lines.length > 0) return lines;

    // Legacy format (<text start="18.64" dur="3.24">text</text>)
    const textRegex = /<text\s+start="([^"]*)"[^>]*>([\s\S]*?)<\/text>/gi;
    let tMatch;
    while ((tMatch = textRegex.exec(xml)) !== null) {
      const startSec = Math.floor(parseFloat(tMatch[1]));
      const timeString = this.formatTimestamp(startSec * 1000);
      const rawText = tMatch[2].replace(/<[^>]+>/g, '').trim();
      if (!rawText) continue;
      const decoded = rawText
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
      lines.push(`${timeString} ${decoded}`);
    }

    return lines;
  }

  /**
   * Queries InnerTube player endpoints across multiple clients to locate caption tracks.
   */
  private static async fetchCaptionTracks(
    videoId: string
  ): Promise<{ tracks: CaptionTrack[]; playability?: string; reason?: string }> {
    let lastPlayability: string | undefined;
    let lastReason: string | undefined;

    for (const client of INNERTUBE_CLIENTS) {
      try {
        const resp = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': client.userAgent,
          },
          body: JSON.stringify({
            context: client.context,
            videoId,
          }),
        });

        if (!resp.ok) continue;

        const data = await resp.json();
        const playability = data?.playabilityStatus?.status;
        const reason = data?.playabilityStatus?.reason;
        if (playability) lastPlayability = playability;
        if (reason) lastReason = reason;

        const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (Array.isArray(tracks) && tracks.length > 0) {
          return { tracks, playability, reason };
        }
      } catch {
        // try next client
      }
    }

    return { tracks: [], playability: lastPlayability, reason: lastReason };
  }

  /**
   * Retrieves captions and metadata for a YouTube URL.
   */
  static async getTranscript(url: string, preferredLang: string = 'en') {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL. Please provide a valid YouTube video link or video ID.');
    }

    // 1. Fetch metadata in parallel with caption tracks
    const metadataPromise = this.getMetadata(url, videoId);

    // 2. Fetch caption tracks using multi-client InnerTube
    const { tracks, playability, reason } = await this.fetchCaptionTracks(videoId);

    if (tracks && tracks.length > 0) {
      // Find requested language or fallback to English or first track
      const selectedTrack =
        tracks.find((t) => t.languageCode === preferredLang || t.languageCode.startsWith(preferredLang)) ||
        tracks.find((t) => t.languageCode.startsWith('en')) ||
        tracks[0];

      try {
        const captionRes = await fetch(selectedTrack.baseUrl);
        if (captionRes.ok) {
          const xml = await captionRes.text();
          const parsedLines = this.parseTranscriptXml(xml);

          if (parsedLines.length > 0) {
            const metadata = await metadataPromise;
            return {
              title: metadata.title,
              author: metadata.author,
              originalUrl: `https://www.youtube.com/watch?v=${videoId}`,
              transcript: parsedLines,
            };
          }
        }
      } catch (err) {
        console.warn('Failed to parse caption track from InnerTube baseUrl:', err);
      }
    }

    // 3. Fallback to youtube-transcript package if InnerTube direct parser returned empty
    try {
      const fallbackTranscript = await YoutubeTranscript.fetchTranscript(videoId);
      if (Array.isArray(fallbackTranscript) && fallbackTranscript.length > 0) {
        const metadata = await metadataPromise;
        const formatted = fallbackTranscript.map((t) => {
          const timeString = this.formatTimestamp(t.offset);
          return `${timeString} ${t.text}`;
        });

        return {
          title: metadata.title,
          author: metadata.author,
          originalUrl: `https://www.youtube.com/watch?v=${videoId}`,
          transcript: formatted,
        };
      }
    } catch {
      // If fallback also fails, formulate a clear, informative error below
    }

    // 4. Formulate an accurate, actionable user error message
    if (playability === 'LOGIN_REQUIRED') {
      throw new Error(
        `Could not retrieve transcript: This YouTube video is private, age-restricted, or requires login (${reason || 'Login required'}).`
      );
    }
    if (playability && playability !== 'OK') {
      throw new Error(`Could not retrieve transcript: Video is unavailable (${reason || playability}).`);
    }

    throw new Error(
      'Could not retrieve transcript for this video. It may not have captions or subtitles available.'
    );
  }
}
