import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold, Italic, Strikethrough, Code,
  List, ListOrdered, Quote, Minus,
  Undo, Redo, Link as LinkIcon, Youtube as YoutubeIcon,
  Heading1, Heading2, Heading3
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import MediaUploadButton from './MediaUploadButton';
import '@/styles/editor.css';

const MenuBar = ({ editor }) => {
  const { t } = useTranslation('richTextEditor');
  if (!editor) {
    return null;
  }

  const addYoutubeVideo = () => {
    const url = prompt(t('youtubePrompt'));
    if (url) {
      editor.commands.setYoutubeVideo({ src: url });
    }
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt(t('linkPrompt'), previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const handleImageUpload = (url) => {
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className="border-b border-foreground/10 p-2 flex flex-wrap gap-1 bg-background/50 rounded-t-lg sticky top-0 z-10 backdrop-blur-sm">
      <div className="flex gap-1 border-r border-foreground/10 pr-2 mr-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-foreground/20' : ''}
          title={t('tooltips.bold')}
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-foreground/20' : ''}
          title={t('tooltips.italic')}
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={editor.isActive('strike') ? 'bg-foreground/20' : ''}
          title={t('tooltips.strikethrough')}
        >
          <Strikethrough className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex gap-1 border-r border-foreground/10 pr-2 mr-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor.isActive('heading', { level: 1 }) ? 'bg-foreground/20' : ''}
          title={t('tooltips.h1')}
        >
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor.isActive('heading', { level: 2 }) ? 'bg-foreground/20' : ''}
          title={t('tooltips.h2')}
        >
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={editor.isActive('heading', { level: 3 }) ? 'bg-foreground/20' : ''}
          title={t('tooltips.h3')}
        >
          <Heading3 className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex gap-1 border-r border-foreground/10 pr-2 mr-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-foreground/20' : ''}
          title={t('tooltips.bulletList')}
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-foreground/20' : ''}
          title={t('tooltips.orderedList')}
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex gap-1 border-r border-foreground/10 pr-2 mr-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={editor.isActive('blockquote') ? 'bg-foreground/20' : ''}
          title={t('tooltips.quote')}
        >
          <Quote className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={editor.isActive('codeBlock') ? 'bg-foreground/20' : ''}
          title={t('tooltips.codeBlock')}
        >
          <Code className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title={t('tooltips.horizontalRule')}
        >
          <Minus className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex gap-1 border-r border-foreground/10 pr-2 mr-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={setLink}
          className={editor.isActive('link') ? 'bg-foreground/20' : ''}
          title={t('tooltips.link')}
        >
          <LinkIcon className="w-4 h-4" />
        </Button>
        <MediaUploadButton onUploadComplete={handleImageUpload} />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addYoutubeVideo}
          title={t('tooltips.youtube')}
        >
          <YoutubeIcon className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex gap-1 ml-auto">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title={t('tooltips.undo')}
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title={t('tooltips.redo')}
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

const RichTextEditor = ({ content, onChange }) => {
  const { t } = useTranslation('richTextEditor');
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-mango-500 underline',
        },
      }),
      Youtube.configure({
        controls: false,
      }),
      Placeholder.configure({
        placeholder: t('placeholder'),
      }),
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content p-4 min-h-[400px] focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Update editor content if content prop changes from outside (e.g. loading data)
  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      // Only set content if it's significantly different to avoid cursor jumps
      // For a simple admin editor, re-setting only on mount or if content is empty is usually safer
      // But checking string equality helps.
      if (editor.getText() === '' && content !== '<p></p>') {
         editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  return (
    <div className="bg-background/50 border border-foreground/10 rounded-lg overflow-hidden flex flex-col">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} className="flex-grow" />
    </div>
  );
};

export default RichTextEditor;