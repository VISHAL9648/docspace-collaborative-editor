"use client";

import React from "react";
import { type Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
  Pilcrow,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EditorToolbarProps {
  editor: Editor | null;
  disabled?: boolean;
}

export function EditorToolbar({ editor, disabled = false }: EditorToolbarProps) {
  if (!editor) return null;

  const isEditable = editor.isEditable && !disabled;

  const buttonClass = (isActive: boolean) =>
    cn(
      "p-1.5 rounded-md text-xs font-medium transition cursor-pointer flex items-center justify-center",
      isActive
        ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200",
      !isEditable && "opacity-40 cursor-not-allowed hover:bg-transparent"
    );

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-zinc-50/70 p-2 dark:border-zinc-800 dark:bg-zinc-900/50">
      {/* Undo & Redo */}
      <div className="flex items-center gap-0.5 border-r border-zinc-200 pr-1.5 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!isEditable || !editor.can().undo()}
          className={buttonClass(false)}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <Undo className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!isEditable || !editor.can().redo()}
          className={buttonClass(false)}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
        >
          <Redo className="h-4 w-4" />
        </button>
      </div>

      {/* Text Style: Paragraph & Headings */}
      <div className="flex items-center gap-0.5 border-r border-zinc-200 pr-1.5 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => editor.chain().focus().setParagraph().run()}
          disabled={!isEditable}
          className={buttonClass(editor.isActive("paragraph"))}
          title="Paragraph"
          aria-label="Paragraph"
        >
          <Pilcrow className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          disabled={!isEditable}
          className={buttonClass(editor.isActive("heading", { level: 1 }))}
          title="Heading 1"
          aria-label="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={!isEditable}
          className={buttonClass(editor.isActive("heading", { level: 2 }))}
          title="Heading 2"
          aria-label="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={!isEditable}
          className={buttonClass(editor.isActive("heading", { level: 3 }))}
          title="Heading 3"
          aria-label="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </button>
      </div>

      {/* Inline Formatting: Bold, Italic, Underline */}
      <div className="flex items-center gap-0.5 border-r border-zinc-200 pr-1.5 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!isEditable}
          className={buttonClass(editor.isActive("bold"))}
          title="Bold (Ctrl+B)"
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!isEditable}
          className={buttonClass(editor.isActive("italic"))}
          title="Italic (Ctrl+I)"
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={!isEditable}
          className={buttonClass(editor.isActive("underline"))}
          title="Underline (Ctrl+U)"
          aria-label="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Lists */}
      <div className="flex items-center gap-0.5 border-r border-zinc-200 pr-1.5 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={!isEditable}
          className={buttonClass(editor.isActive("bulletList"))}
          title="Bullet List"
          aria-label="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={!isEditable}
          className={buttonClass(editor.isActive("orderedList"))}
          title="Numbered List"
          aria-label="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
      </div>

      {/* Quotes & Code */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          disabled={!isEditable}
          className={buttonClass(editor.isActive("blockquote"))}
          title="Blockquote"
          aria-label="Blockquote"
        >
          <Quote className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          disabled={!isEditable}
          className={buttonClass(editor.isActive("code"))}
          title="Inline Code"
          aria-label="Code"
        >
          <Code className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
