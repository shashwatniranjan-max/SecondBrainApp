export type Platform = 'youtube' | 'twitter' | 'instagram' | 'generic';

export interface ParsedUrl {
  platform: Platform;
  id?: string | undefined;
  url: string;
}

export function parseUrl(urlStr: string): ParsedUrl {
  if (!urlStr) return { platform: 'generic', url: urlStr };
  
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname;

    // YouTube
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      if (hostname.includes('youtu.be')) {
        return { platform: 'youtube', id: pathname.slice(1), url: urlStr };
      }
      if (pathname.startsWith('/shorts/')) {
        return { platform: 'youtube', id: pathname.split('/')[2], url: urlStr };
      }
      if (pathname === '/watch') {
        const v = url.searchParams.get('v');
        if (v) return { platform: 'youtube', id: v, url: urlStr };
      }
    }

    // Twitter / X
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      // /username/status/ID
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length >= 3 && parts[1] === 'status') {
        return { platform: 'twitter', id: parts[2], url: urlStr };
      }
    }

    // Instagram
    if (hostname.includes('instagram.com')) {
      // /p/ID/ or /reel/ID/
      const parts = pathname.split('/').filter(Boolean);
      if (parts.length >= 2 && (parts[0] === 'p' || parts[0] === 'reel')) {
        return { platform: 'instagram', id: parts[1], url: urlStr };
      }
    }

  } catch (e) {
    // Invalid URL structure, fallback to generic
  }

  return { platform: 'generic', url: urlStr };
}
