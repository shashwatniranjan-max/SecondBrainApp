import React, { useState, useMemo } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type BlockType = "paragraph" | "code" | "heading" | "list" | "quote" | "hr";

interface ParsedBlock {
  type: BlockType;
  content: string;
  metadata?: string | undefined;
  items?: string[] | undefined;
}

const INLINE_REGEX = /(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g;

function renderInline(text: string) {
  const parts = text.split(INLINE_REGEX);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold opacity-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i} className="opacity-90">{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded-md bg-foreground/10 px-1.5 py-0.5 font-mono text-[0.9em] opacity-100"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch && linkMatch[1] && linkMatch[2]) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline underline-offset-4 hover:opacity-70 transition-opacity"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function parseMarkdownBlocks(text: string): ParsedBlock[] {
  const lines = text.split("\n");
  const blocks: ParsedBlock[] = [];

  let currentBlock: ParsedBlock | null = null;
  let inCodeBlock = false;
  let codeLang = "";

  const pushCurrent = () => {
    if (currentBlock) {
      blocks.push({ ...currentBlock });
      currentBlock = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || "";
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        pushCurrent();
        inCodeBlock = false;
        codeLang = "";
      } else {
        pushCurrent();
        codeLang = trimmed.replace(/`/g, "").trim();
        currentBlock = { type: "code", content: "", metadata: codeLang };
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      if (currentBlock) {
        currentBlock.content += (currentBlock.content ? "\n" : "") + line;
      }
      continue;
    }

    if (trimmed === "---" || trimmed === "***") {
      pushCurrent();
      blocks.push({ type: "hr", content: "" });
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch && headingMatch[1] && headingMatch[2]) {
      pushCurrent();
      blocks.push({
        type: "heading",
        metadata: headingMatch[1].length.toString(),
        content: headingMatch[2],
      });
      continue;
    }

    if (trimmed.startsWith(">")) {
      if (currentBlock?.type !== "quote") {
        pushCurrent();
        currentBlock = { type: "quote", content: "" };
      }
      currentBlock.content += (currentBlock.content ? "\n" : "") + trimmed.substring(1).trim();
      continue;
    }

    const listMatch = trimmed.match(/^(\-|\*|\d+\.)\s+(.+)$/);
    if (listMatch && listMatch[2]) {
      if (currentBlock?.type !== "list") {
        pushCurrent();
        currentBlock = { type: "list", items: [], content: "" };
      }
      if (currentBlock.items) {
        currentBlock.items.push(listMatch[2]);
      }
      continue;
    }

    if (!trimmed) {
      pushCurrent();
      continue;
    }

    if (!currentBlock) {
      currentBlock = { type: "paragraph", content: trimmed };
    } else if (currentBlock.type === "paragraph") {
      currentBlock.content += "\n" + trimmed;
    } else {
      pushCurrent();
      currentBlock = { type: "paragraph", content: trimmed };
    }
  }

  pushCurrent();
  return blocks;
}

function CodeBlock({ code, lang, theme }: { code: string; lang?: string | undefined; theme?: "light" | "sepia" | "dark" | undefined }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Adjust code block colors based on reading theme
  const bgClass = theme === "light" ? "bg-[#f5f5f5]" : theme === "sepia" ? "bg-[#e8ddc5]" : "bg-[#1e1e1e]";
  const headerBgClass = theme === "light" ? "bg-[#e5e5e5]" : theme === "sepia" ? "bg-[#dccba8]" : "bg-[#2d2d2d]";
  const textClass = theme === "light" ? "text-[#333333]" : theme === "sepia" ? "text-[#4a3c31]" : "text-[#d4d4d4]";
  const headerTextClass = theme === "light" ? "text-[#666666]" : theme === "sepia" ? "text-[#7a6a58]" : "text-zinc-400";
  const borderClass = theme === "light" ? "border-[#e0e0e0]" : theme === "sepia" ? "border-[#d0c0a0]" : "border-border";

  return (
    <div className={cn("my-6 overflow-hidden rounded-xl border shadow-sm", bgClass, textClass, borderClass)}>
      <div className={cn("flex items-center justify-between px-4 py-2 text-xs", headerBgClass, headerTextClass)}>
        <span className="font-semibold uppercase tracking-wider">{lang || "code"}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 hover:text-white transition-colors"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="overflow-x-auto p-4">
        <pre className="text-[14px] leading-relaxed font-mono">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

export function DocumentRenderer({ content, className, readingTheme }: { content: string[]; className?: string | undefined; readingTheme?: "light" | "sepia" | "dark" | undefined }) {
  const blocks = useMemo(() => {
    const fullText = content.join("\n\n");
    return parseMarkdownBlocks(fullText);
  }, [content]);

  return (
    <div className={cn("text-[1em] leading-[1.8] text-inherit opacity-90", className)}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading": {
            const level = Number(block.metadata || "1");
            const Tag = `h${level}` as any;
            const sizeClass = 
              level === 1 ? "text-3xl mt-12 mb-6" :
              level === 2 ? "text-2xl mt-10 mb-5" :
              level === 3 ? "text-xl mt-8 mb-4" : "text-lg mt-6 mb-3";
            
            return (
              <Tag key={i} className={cn("font-bold tracking-tight opacity-100", sizeClass)}>
                {renderInline(block.content)}
              </Tag>
            );
          }
          case "paragraph":
            return (
              <p key={i} className="mb-6 whitespace-pre-wrap">
                {renderInline(block.content)}
              </p>
            );
          case "code":
            return <CodeBlock key={i} code={block.content} lang={block.metadata} theme={readingTheme} />;
          case "quote":
            return (
              <blockquote key={i} className="my-6 border-l-4 border-current opacity-80 bg-foreground/5 py-3 px-5 italic rounded-r-lg">
                <p className="whitespace-pre-wrap">{renderInline(block.content)}</p>
              </blockquote>
            );
          case "list":
            const isOrdered = block.items?.[0]?.match(/^\d+\./);
            const ListTag = isOrdered ? "ol" : "ul";
            return (
              <ListTag key={i} className={cn("mb-6 ml-6 space-y-2", isOrdered ? "list-decimal" : "list-disc")}>
                {block.items?.map((item, j) => (
                  <li key={j} className="pl-1">
                    {renderInline(item)}
                  </li>
                ))}
              </ListTag>
            );
          case "hr":
            return <hr key={i} className="my-10 border-border" />;
          default:
            return null;
        }
      })}
    </div>
  );
}
