import { NextResponse } from "next/server";
import { listGames } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, parseInt(url.searchParams.get("pageSize") || "24", 10));
  const sort = (["rank", "rating", "newest", "name"] as const).includes((url.searchParams.get("sort") as any))
    ? (url.searchParams.get("sort") as any)
    : "rank";
  const category = url.searchParams.get("category") || undefined;
  const platform = url.searchParams.get("platform") || undefined;
  const q = url.searchParams.get("q") || undefined;

  const { items, total } = await listGames({ page, pageSize, sort, category, platform, keyword: q });
  return NextResponse.json({ page, pageSize, total, items });
}
