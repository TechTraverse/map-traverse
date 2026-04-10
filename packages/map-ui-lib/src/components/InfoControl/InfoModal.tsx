import { useEffect } from 'react';
import { LuX } from 'react-icons/lu';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface InfoModalProps {
  /** Whether the modal is currently open. The parent owns this state. */
  open: boolean;
  /** Heading shown at the top of the modal. */
  title?: string;
  /** Markdown body to render inside the modal. */
  markdown: string;
  /** Called when the user dismisses the modal (X, ESC, or backdrop). */
  onClose: () => void;
}

const BODY_CLASSES = [
  'mapui:overflow-y-auto mapui:px-6 mapui:py-4 mapui:text-sm mapui:text-gray-800',
  // Headings
  'mapui:[&_h1]:mb-2 mapui:[&_h1]:mt-4 mapui:[&_h1]:text-xl mapui:[&_h1]:font-bold mapui:[&_h1]:text-gray-900',
  'mapui:[&_h2]:mb-2 mapui:[&_h2]:mt-4 mapui:[&_h2]:text-lg mapui:[&_h2]:font-semibold mapui:[&_h2]:text-gray-900',
  'mapui:[&_h3]:mb-2 mapui:[&_h3]:mt-3 mapui:[&_h3]:text-base mapui:[&_h3]:font-semibold mapui:[&_h3]:text-gray-900',
  'mapui:[&_h4]:mb-1 mapui:[&_h4]:mt-3 mapui:[&_h4]:text-sm mapui:[&_h4]:font-semibold mapui:[&_h4]:text-gray-900',
  // Paragraphs
  'mapui:[&_p]:my-2 mapui:[&_p]:leading-relaxed',
  // Links
  'mapui:[&_a]:text-blue-600 mapui:[&_a]:underline hover:mapui:[&_a]:text-blue-700',
  // Lists
  'mapui:[&_ul]:my-2 mapui:[&_ul]:list-disc mapui:[&_ul]:pl-5',
  'mapui:[&_ol]:my-2 mapui:[&_ol]:list-decimal mapui:[&_ol]:pl-5',
  'mapui:[&_li]:my-1',
  // Code
  'mapui:[&_code]:rounded mapui:[&_code]:bg-gray-100 mapui:[&_code]:px-1 mapui:[&_code]:py-0.5 mapui:[&_code]:text-xs mapui:[&_code]:font-mono mapui:[&_code]:text-gray-800',
  'mapui:[&_pre]:my-3 mapui:[&_pre]:overflow-x-auto mapui:[&_pre]:rounded mapui:[&_pre]:bg-gray-100 mapui:[&_pre]:p-3',
  'mapui:[&_pre_code]:bg-transparent mapui:[&_pre_code]:p-0',
  // Blockquotes
  'mapui:[&_blockquote]:my-3 mapui:[&_blockquote]:border-l-4 mapui:[&_blockquote]:border-gray-300 mapui:[&_blockquote]:pl-4 mapui:[&_blockquote]:italic mapui:[&_blockquote]:text-gray-600',
  // Tables (GFM)
  'mapui:[&_table]:my-3 mapui:[&_table]:w-full mapui:[&_table]:border-collapse mapui:[&_table]:text-left',
  'mapui:[&_th]:border mapui:[&_th]:border-gray-300 mapui:[&_th]:bg-gray-50 mapui:[&_th]:px-2 mapui:[&_th]:py-1 mapui:[&_th]:font-semibold',
  'mapui:[&_td]:border mapui:[&_td]:border-gray-300 mapui:[&_td]:px-2 mapui:[&_td]:py-1',
  // Horizontal rule
  'mapui:[&_hr]:my-4 mapui:[&_hr]:border-t mapui:[&_hr]:border-gray-200',
  // Images
  'mapui:[&_img]:my-3 mapui:[&_img]:max-w-full mapui:[&_img]:rounded',
].join(' ');

const REMARK_PLUGINS = [remarkGfm];

const MARKDOWN_COMPONENTS: Components = {
  a: ({ node: _node, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" />
  ),
};

/**
 * Markdown modal dialog. Dismissed via the X button, ESC key, or backdrop click.
 * Links in the body always open in a new tab.
 */
export function InfoModal({
  open,
  title = 'About this map',
  markdown,
  onClose,
}: InfoModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="mapui:fixed mapui:inset-0 mapui:z-50 mapui:flex mapui:items-center mapui:justify-center mapui:bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
      onClick={onClose}
    >
      <div
        className="mapui:relative mapui:flex mapui:w-full mapui:max-w-[640px] mapui:max-h-[80vh] mapui:flex-col mapui:rounded-lg mapui:bg-white mapui:shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mapui:flex mapui:items-start mapui:justify-between mapui:gap-4 mapui:border-b mapui:border-gray-200 mapui:px-6 mapui:py-4">
          <h2
            id="info-modal-title"
            className="mapui:m-0 mapui:text-base mapui:font-semibold mapui:text-gray-900"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            title="Close"
            className="mapui:flex mapui:h-8 mapui:w-8 mapui:items-center mapui:justify-center mapui:rounded mapui:text-gray-500 mapui:cursor-pointer hover:mapui:bg-gray-100 hover:mapui:text-gray-700 mapui:transition-colors"
          >
            <LuX size={18} aria-hidden="true" />
          </button>
        </div>

        <div className={BODY_CLASSES}>
          <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={MARKDOWN_COMPONENTS}>
            {markdown}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
