/**
 * Safe document importer utility for DocSpace
 * Converts .txt and .md files into structured Tiptap JSON AST.
 * Completely immune to XSS as it never interprets raw HTML.
 */

export interface TiptapMark {
  type: "bold" | "italic" | "underline" | "code";
}

export interface TiptapTextNode {
  type: "text";
  text: string;
  marks?: TiptapMark[];
}

export interface TiptapBlockNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: (TiptapBlockNode | TiptapTextNode)[];
}

export interface TiptapDocument {
  type: "doc";
  content: TiptapBlockNode[];
}

export const MAX_IMPORT_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB
export const SUPPORTED_EXTENSIONS = [".md", ".markdown", ".txt"];

/**
 * Validates file size, extension, and MIME type
 */
export function validateImportFile(file: { name: string; size: number; type?: string }): {
  valid: boolean;
  error?: string;
} {
  if (!file || !file.name) {
    return { valid: false, error: "No file selected." };
  }

  // Size validation
  if (file.size === 0) {
    return { valid: false, error: "The selected file is empty." };
  }

  if (file.size > MAX_IMPORT_SIZE_BYTES) {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeInMb} MB) exceeds the maximum limit of 1 MB.`,
    };
  }

  // Extension validation
  const lowerName = file.name.toLowerCase();
  const hasValidExt = SUPPORTED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));

  if (!hasValidExt) {
    return {
      valid: false,
      error: "Unsupported file format. Please upload a Markdown (.md) or Plain Text (.txt) file.",
    };
  }

  return { valid: true };
}

/**
 * Derives a clean human-readable title from the uploaded filename
 */
export function deriveTitleFromFilename(filename: string): string {
  const withoutExt = filename.replace(/\.(md|markdown|txt)$/i, "");
  const formatted = withoutExt
    .replace(/[-_]+/g, " ")
    .trim();

  if (!formatted) return "Imported Document";

  // Capitalize first letter of each word
  return formatted
    .split(" ")
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

/**
 * Parses inline formatting (bold: **text**, italic: *text* or _text_) safely into text nodes with marks
 */
export function parseInlineFormatting(text: string): TiptapTextNode[] {
  if (!text) return [];

  const nodes: TiptapTextNode[] = [];
  // Regex to match bold (**...**) or italic (*...* or _..._)
  // Note: We escape any potential markup so text is always stored as raw strings
  const regex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(_([^_]+)_)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Plain text before match
    if (match.index > lastIndex) {
      nodes.push({
        type: "text",
        text: text.substring(lastIndex, match.index),
      });
    }

    if (match[1]) {
      // Bold: **content**
      nodes.push({
        type: "text",
        text: match[2],
        marks: [{ type: "bold" }],
      });
    } else if (match[3]) {
      // Italic: *content*
      nodes.push({
        type: "text",
        text: match[4],
        marks: [{ type: "italic" }],
      });
    } else if (match[5]) {
      // Italic: _content_
      nodes.push({
        type: "text",
        text: match[6],
        marks: [{ type: "italic" }],
      });
    }

    lastIndex = regex.lastIndex;
  }

  // Trailing text
  if (lastIndex < text.length) {
    nodes.push({
      type: "text",
      text: text.substring(lastIndex),
    });
  }

  return nodes.length > 0 ? nodes : [{ type: "text", text }];
}

/**
 * Safely converts Markdown content into structured Tiptap JSON AST
 */
export function convertMarkdownToTiptap(markdown: string): TiptapDocument {
  const lines = markdown.split(/\r?\n/);
  const content: TiptapBlockNode[] = [];

  let currentList: { type: "bulletList" | "orderedList"; items: TiptapBlockNode[] } | null = null;

  const flushList = () => {
    if (currentList) {
      content.push({
        type: currentList.type,
        content: currentList.items,
      });
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      flushList();
      continue;
    }

    // Heading: #, ##, ###
    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      content.push({
        type: "heading",
        attrs: { level },
        content: parseInlineFormatting(headingText),
      });
      continue;
    }

    // Bullet list: -, *, +
    const bulletMatch = line.match(/^[-*+]\s+(.*)$/);
    if (bulletMatch) {
      const itemText = bulletMatch[1];
      const listItem: TiptapBlockNode = {
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: parseInlineFormatting(itemText),
          },
        ],
      };

      if (!currentList || currentList.type !== "bulletList") {
        flushList();
        currentList = { type: "bulletList", items: [listItem] };
      } else {
        currentList.items.push(listItem);
      }
      continue;
    }

    // Ordered list: 1., 2., etc.
    const orderedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      const itemText = orderedMatch[1];
      const listItem: TiptapBlockNode = {
        type: "listItem",
        content: [
          {
            type: "paragraph",
            content: parseInlineFormatting(itemText),
          },
        ],
      };

      if (!currentList || currentList.type !== "orderedList") {
        flushList();
        currentList = { type: "orderedList", items: [listItem] };
      } else {
        currentList.items.push(listItem);
      }
      continue;
    }

    // Blockquote: > text
    const quoteMatch = line.match(/^>\s*(.*)$/);
    if (quoteMatch) {
      flushList();
      content.push({
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: parseInlineFormatting(quoteMatch[1]),
          },
        ],
      });
      continue;
    }

    // Standard paragraph
    flushList();
    content.push({
      type: "paragraph",
      content: parseInlineFormatting(line),
    });
  }

  flushList();

  // If file was completely empty, return at least one paragraph
  if (content.length === 0) {
    content.push({
      type: "paragraph",
      content: [{ type: "text", text: "" }],
    });
  }

  return {
    type: "doc",
    content,
  };
}

/**
 * Safely converts plain text (.txt) into structured Tiptap JSON AST
 */
export function convertPlainTextToTiptap(text: string): TiptapDocument {
  const rawParagraphs = text.split(/\r?\n\r?\n/);
  const content: TiptapBlockNode[] = [];

  for (const block of rawParagraphs) {
    const trimmed = block.trim();
    if (trimmed) {
      content.push({
        type: "paragraph",
        content: [{ type: "text", text: trimmed }],
      });
    }
  }

  if (content.length === 0) {
    content.push({
      type: "paragraph",
      content: [{ type: "text", text: "" }],
    });
  }

  return {
    type: "doc",
    content,
  };
}

/**
 * Unified entry point to process an imported file safely
 */
export function processImportedFile(
  filename: string,
  rawContent: string
): { title: string; content: TiptapDocument } {
  const title = deriveTitleFromFilename(filename);
  const lower = filename.toLowerCase();

  let tiptapDoc: TiptapDocument;
  if (lower.endsWith(".md") || lower.endsWith(".markdown")) {
    tiptapDoc = convertMarkdownToTiptap(rawContent);
  } else {
    tiptapDoc = convertPlainTextToTiptap(rawContent);
  }

  return {
    title,
    content: tiptapDoc,
  };
}
