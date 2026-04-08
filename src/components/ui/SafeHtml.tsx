import DOMPurify from "dompurify";

interface SafeHtmlProps {
  html: string | null | undefined;
  className?: string;
}

export function SafeHtml({ html, className }: SafeHtmlProps) {
  if (!html) return null;
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li", "h1", "h2", "h3", "span", "div", "table", "tr", "td", "th", "thead", "tbody", "img"],
    ALLOWED_ATTR: ["href", "target", "rel", "class", "src", "alt"],
  });
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
