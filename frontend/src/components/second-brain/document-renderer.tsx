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
      return (
        <em key={i} className="opacity-90">
          {part.slice(1, -1)}
        </em>
      );
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

function isCodeHeuristic(text: string): boolean {
  const lines = text.split("\n");
  let codeScore = 0;

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;

    // ----- STRONG STARTING INDICATORS (Keywords at the start of a line) -----
    if (
      t.match(
        /^(const|let|var|import|export|function|class|interface|type|async|await|return|yield|concept)\b/,
      )
    )
      codeScore += 2;
    if (
      t.match(
        /^(def|from|elif|except|try|finally|pass|raise|global|nonlocal|if|else|for|while|switch|catch)\b/,
      )
    )
      codeScore += 2;
    if (
      t.match(
        /^(#include|template\s*<|public:|private:|protected:|namespace|using\s+namespace|struct\b)/,
      )
    )
      codeScore += 2;
    if (t.match(/^(\$|sudo|npm|yarn|pip|apt-get|docker)\b/)) codeScore += 2;
    if (
      t.match(
        /^(SELECT|UPDATE|DELETE|INSERT\s+INTO|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|FROM\s|WHERE\s|JOIN\s)\b/i,
      )
    )
      codeScore += 2;
    if (t.match(/^@[a-zA-Z_]/)) codeScore += 2; // Decorators or CSS @rules

    // Comments
    if (t.startsWith("//") || t.startsWith("/*") || t.startsWith("# ") || t.startsWith("<!--"))
      codeScore += 1;

    // HTML / XML tags (matches entire line being a tag)
    if (t.match(/^<\/?[a-zA-Z][\s\S]*>$/)) codeScore += 2;
    // Starts an HTML tag but might not close it
    if (t.match(/^<[a-zA-Z]/)) codeScore += 1;

    // Lines that are almost entirely structural (e.g. single braces, brackets)
    if (t.match(/^[\]{}()[]+;?$/)) codeScore += 2;

    // ----- COMMON CODE SYMBOLS & PATTERNS (Anywhere in the line) -----
    if (
      t.includes("require(") ||
      t.includes("console.") ||
      t.includes("print(") ||
      t.includes("std::") ||
      t.includes("self.") ||
      t.match(/=>|===|!==|==|!=|\+=|-=|\*=|\\=|&&|\|\|/) ||
      t.match(/ = /) || // Assignment
      t.match(/\[.*\]/) // Array/Dict access
    ) {
      codeScore += 1;
    }

    // HTML attributes or CSS classes
    if (t.match(/\b(class|className|id|href|src|style)=['"]/)) codeScore += 1;
    if (t.match(/^[.#][a-zA-Z0-9_-]+\s*\{/)) codeScore += 2; // CSS selector start

    // ----- COMMON CODE LINE ENDINGS -----
    if (
      t.endsWith(";") ||
      t.endsWith("{") ||
      t.endsWith("}") ||
      t.endsWith(":") ||
      t.endsWith(")")
    ) {
      codeScore += 1;
    }

    // ----- PROSE INDICATORS (Negative Score) -----
    // Starts with a capital letter and ends with typical prose punctuation.
    if (t.match(/^[A-Z].*[.?!]$/)) {
      // Make sure it's not a comment line
      if (
        !t.startsWith("//") &&
        !t.startsWith("#") &&
        !t.startsWith("/*") &&
        !t.startsWith("<!--")
      ) {
        codeScore -= 2;
      }
    }
  }

  // If the total score across the paragraph indicates it's likely code
  return codeScore >= 2;
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

  // Post-processing: Auto-detect plain-text code blocks and merge consecutive ones
  const processedBlocks: ParsedBlock[] = [];
  for (const block of blocks) {
    const finalBlock = { ...block };

    if (finalBlock.type === "paragraph" && isCodeHeuristic(finalBlock.content)) {
      finalBlock.type = "code";
      finalBlock.metadata = ""; // empty string defaults to 'javascript' via normalizeLanguage
    }

    const last = processedBlocks[processedBlocks.length - 1];
    if (
      last &&
      last.type === "code" &&
      finalBlock.type === "code" &&
      last.metadata === finalBlock.metadata
    ) {
      // Merge consecutive code blocks
      last.content += "\n\n" + finalBlock.content;
    } else {
      processedBlocks.push(finalBlock);
    }
  }

  return processedBlocks;
}

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/esm/styles/prism";

function normalizeLanguage(lang?: string): string {
  const defaultLang = "javascript";
  if (!lang) return defaultLang;
  const lower = lang.toLowerCase();
  const map: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    sh: "bash",
    shell: "bash",
    html: "markup",
    xml: "markup",
    c: "c",
    "c++": "cpp",
    cpp: "cpp",
    py: "python",
    json: "json",
    java: "java",
    css: "css",
    markdown: "markdown",
    md: "markdown",
  };

  // If the language is found in our map, return it
  if (map[lower]) return map[lower];

  // Prism only supports specific language strings. If the language is unknown (e.g. "express")
  // or unsupported, fallback to javascript to ensure code is highlighted instead of being plain white text.
  return "javascript";
}

function CodeBlock({
  code,
  lang,
  theme,
}: {
  code: string;
  lang?: string | undefined;
  theme?: "light" | "sepia" | "dark" | undefined;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Adjust code block colors based on reading theme
  const bgClass =
    theme === "light" ? "bg-[#f5f5f5]" : theme === "sepia" ? "bg-[#e8ddc5]" : "bg-[#1e1e1e]";
  const headerBgClass =
    theme === "light" ? "bg-[#e5e5e5]" : theme === "sepia" ? "bg-[#dccba8]" : "bg-[#2d2d2d]";
  const textClass =
    theme === "light" ? "text-[#333333]" : theme === "sepia" ? "text-[#4a3c31]" : "text-[#d4d4d4]";
  const headerTextClass =
    theme === "light" ? "text-[#666666]" : theme === "sepia" ? "text-[#7a6a58]" : "text-zinc-400";
  const borderClass =
    theme === "light"
      ? "border-[#e0e0e0]"
      : theme === "sepia"
        ? "border-[#d0c0a0]"
        : "border-border";

  const normalizedLang = normalizeLanguage(lang);
  const syntaxTheme = theme === "light" || theme === "sepia" ? vs : vscDarkPlus;

  return (
    <div
      className={cn(
        "my-6 overflow-hidden rounded-xl border shadow-sm",
        bgClass,
        textClass,
        borderClass,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between px-4 py-2 text-xs",
          headerBgClass,
          headerTextClass,
        )}
      >
        <span className="font-semibold uppercase tracking-wider">{lang || "code"}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="overflow-x-auto text-[14px]">
        <SyntaxHighlighter
          language={normalizedLang}
          style={syntaxTheme}
          customStyle={{
            backgroundColor: "transparent",
            padding: "1rem",
            margin: 0,
            fontSize: "0.9em",
            lineHeight: "1.6",
          }}
          PreTag="div"
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

export function DocumentRenderer({
  content,
  className,
  readingTheme,
}: {
  content: string[];
  className?: string | undefined;
  readingTheme?: "light" | "sepia" | "dark" | undefined;
}) {
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
              level === 1
                ? "text-3xl mt-12 mb-6"
                : level === 2
                  ? "text-2xl mt-10 mb-5"
                  : level === 3
                    ? "text-xl mt-8 mb-4"
                    : "text-lg mt-6 mb-3";

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
            return (
              <CodeBlock key={i} code={block.content} lang={block.metadata} theme={readingTheme} />
            );
          case "quote":
            return (
              <blockquote
                key={i}
                className="my-6 border-l-4 border-current opacity-80 bg-foreground/5 py-3 px-5 italic rounded-r-lg"
              >
                <p className="whitespace-pre-wrap">{renderInline(block.content)}</p>
              </blockquote>
            );
          case "list":
            const isOrdered = block.items?.[0]?.match(/^\d+\./);
            const ListTag = isOrdered ? "ol" : "ul";
            return (
              <ListTag
                key={i}
                className={cn("mb-6 ml-6 space-y-2", isOrdered ? "list-decimal" : "list-disc")}
              >
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
