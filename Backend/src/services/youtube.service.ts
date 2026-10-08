import { YoutubeTranscript } from 'youtube-transcript';

export class YouTubeService {
  static extractVideoId(url: string): string | null {
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^"&?\/\s]{11})/
    );
    return match ? match[1] : null;
  }

  static async getMetadata(url: string) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      const titleMatch = text.match(/<title>(.*?)<\/title>/);
      let title = titleMatch ? titleMatch[1].replace(' - YouTube', '') : 'YouTube Video';
      // Fallback
      if (!title || title === 'YouTube') {
        const ogTitle = text.match(/<meta property="og:title" content="([^"]+)"/);
        if (ogTitle) title = ogTitle[1];
      }
      return { title };
    } catch (error) {
      return { title: 'YouTube Video' };
    }
  }

  static async getTranscript(url: string) {
    const videoId = this.extractVideoId(url);
    if (!videoId) throw new Error('Invalid YouTube URL');

    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      const metadata = await this.getMetadata(url);
      
      const formatted = transcript.map(t => {
        const totalSeconds = Math.floor(t.offset / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const timeString = `[${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}]`;
        return `${timeString} ${t.text}`;
      });

      return {
        title: metadata.title,
        originalUrl: `https://www.youtube.com/watch?v=${videoId}`,
        transcript: formatted
      };
    } catch (error: any) {
      console.error('Error fetching transcript:', error);
      throw new Error(error.message || 'Could not retrieve transcript for this video. It may not have captions, or it might be restricted.');
    }
  }
}
