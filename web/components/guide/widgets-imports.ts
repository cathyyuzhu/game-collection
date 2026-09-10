// Re-export aggregator for guide detail page
// UI components (client-only). Using them with JSX from RSC pages is allowed.
export * from "./GuideWidgets";
export { MarkdownRenderer } from "./MarkdownRenderer";
// Pure utilities: cross Server/Client boundary safe (no hooks).
export { extractHeadings, type HeadingItem } from "./GuideUtils";
