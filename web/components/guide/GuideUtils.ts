// Pure guide utilities: no hooks, no "use client" boundary. Safe for both RSC and client.
export interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

/** Extract heading lines (## / ### / ####) from markdown string into an array of TOC items */
export function extractHeadings(md: string): HeadingItem[] {
  const lines = md.split("\n");
  const result: HeadingItem[] = [];
  for (const raw of lines) {
    const m = raw.match(/^(#{1,3})\s+(.+)$/);
    if (!m) continue;
    const level = m[1].length;
    const text = m[2].trim();
    const id = text
      .toLowerCase()
      .replace(/<[^>]+>/g, "")
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/g, "-");
    result.push({ id, text, level });
  }
  return result;
}
