import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose-guide">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{
          h1: ({ id, children }) => <h1 id={id} className="scroll-mt-24">{children}</h1>,
          h2: ({ id, children }) => <h2 id={id} className="scroll-mt-24">{children}</h2>,
          h3: ({ id, children }) => <h3 id={id} className="scroll-mt-24">{children}</h3>,
          img: ({ src, alt }) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src!} alt={alt || ""} className="rounded-xl shadow-md my-5" loading="lazy" />
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
