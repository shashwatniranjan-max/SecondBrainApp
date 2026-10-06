import { parseUrl } from "@/lib/url-parser";
import { ExternalLink, Play, Globe2, Twitter, Instagram } from "lucide-react";
import { useEffect, useState } from "react";
import type { KnowledgeItem } from "@/types/knowledge";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

function YouTubeEmbed({ id }: { id: string }) {
  return (
    <div className="relative w-full overflow-hidden rounded-lg border bg-muted aspect-video">
      <iframe
        src={`https://www.youtube.com/embed/${id}`}
        title="YouTube video player"
        className="absolute top-0 left-0 w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

function TwitterEmbed({ url }: { url: string }) {
  const [error, setError] = useState(false);
  
  useEffect(() => {
    // Safely load the Twitter widgets script if not present
    if ((window as any).twttr) {
      (window as any).twttr.widgets?.load();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.charset = "utf-8";
    script.onerror = () => setError(true);
    document.body.appendChild(script);

    return () => {
      script.onerror = null;
    };
  }, [url]);

  if (error) {
    return <GenericEmbed url={url} />;
  }

  return (
    <div className="flex justify-center w-full min-h-[250px] overflow-hidden rounded-lg bg-background p-4 border shadow-sm">
      <blockquote className="twitter-tweet" data-dnt="true" data-theme="dark">
        <a href={url.replace("x.com", "twitter.com")}>Loading tweet...</a>
      </blockquote>
    </div>
  );
}

function InstagramEmbed({ url }: { url: string }) {
  const [error, setError] = useState(false);

  useEffect(() => {
    if ((window as any).instgrm) {
      (window as any).instgrm.Embeds.process();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    script.onerror = () => setError(true);
    document.body.appendChild(script);
    
    return () => {
      script.onerror = null;
    };
  }, [url]);

  if (error) {
    return <GenericEmbed url={url} />;
  }

  return (
    <div className="flex justify-center w-full bg-background rounded-lg border shadow-sm overflow-hidden p-0">
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{
          background: "#FFF",
          border: 0,
          margin: 1,
          maxWidth: 540,
          minWidth: 326,
          width: "calc(100% - 2px)",
        }}
      >
        <div style={{ padding: 16 }}>
           <a href={url} style={{ color: '#000', textDecoration: 'none' }} target="_blank" rel="noopener noreferrer">View on Instagram</a>
        </div>
      </blockquote>
    </div>
  );
}

function GenericEmbed({ url, title, description }: { url: string; title?: string | undefined; description?: string | undefined }) {
  let hostname = url;
  try {
    hostname = new URL(url).hostname;
  } catch {}

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {title && <h4 className="font-semibold text-foreground truncate">{title}</h4>}
          {description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{description}</p>}
          <p className="mt-2 text-xs text-muted-foreground truncate">{hostname}</p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
        >
          Open link
          <ExternalLink className="size-3" />
        </a>
      </div>
    </div>
  );
}

export function UrlEmbed({ url, title, description }: { url?: string | undefined; title?: string | undefined; description?: string | undefined }) {
  if (!url) return null;
  
  const parsed = parseUrl(url);

  if (parsed.platform === "youtube" && parsed.id) {
    return <YouTubeEmbed id={parsed.id} />;
  }

  if (parsed.platform === "twitter") {
    return <TwitterEmbed url={url} />;
  }

  if (parsed.platform === "instagram") {
    // Instagram needs exact URL, remove query params for clean embed
    let cleanUrl = url;
    try {
      const u = new URL(url);
      cleanUrl = `${u.origin}${u.pathname}`;
    } catch {}
    return <InstagramEmbed url={cleanUrl} />;
  }

  return <GenericEmbed url={url} title={title} description={description} />;
}

export function UrlPreviewBanner({ url }: { url: string }) {
  const parsed = parseUrl(url);

  if (parsed.platform === "youtube" && parsed.id) {
    return (
      <div className="relative aspect-video w-full overflow-hidden bg-muted border-b">
        <img 
          src={`https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`} 
          alt="YouTube video thumbnail" 
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
          <div className="grid size-10 place-items-center rounded-full bg-white/90 text-black shadow-sm">
            <Play className="size-5 ml-1" />
          </div>
        </div>
      </div>
    );
  } 
  
  if (parsed.platform === "twitter") {
    return (
      <div className="flex h-32 w-full items-center justify-center bg-[#1DA1F2] text-white border-b">
        <div className="flex flex-col items-center gap-2">
           <Twitter className="size-8" />
           <span className="text-xs font-semibold">X / Twitter</span>
        </div>
      </div>
    );
  } 
  
  if (parsed.platform === "instagram") {
    return (
      <div className="flex h-32 w-full items-center justify-center bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white border-b">
        <div className="flex flex-col items-center gap-2">
           <Instagram className="size-8" />
           <span className="text-xs font-semibold">Instagram</span>
        </div>
      </div>
    );
  } 

  return (
    <div className="flex h-32 w-full items-center justify-center bg-muted text-muted-foreground border-b">
       <Globe2 className="size-8" />
    </div>
  );
}
