import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function realIp(req: Request): string {
  try {
    const fwd =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "";
    return fwd || "0.0.0.0";
  } catch {
    return "0.0.0.0";
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { guideId?: string; isUseful?: boolean };
    if (!body.guideId || typeof body.isUseful !== "boolean") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const ip = realIp(req);

    // Find guide by id, ensure it exists
    const guide = await prisma.guide.findUnique({ where: { id: body.guideId } });
    if (!guide) return NextResponse.json({ error: "Guide not found" }, { status: 404 });

    // Upsert feedback (unique guideId+ip)
    try {
      const existing = await prisma.feedback.findUnique({
        where: { guideId_ip: { guideId: body.guideId, ip } }
      });
      if (existing) {
        return NextResponse.json({ ok: true, duplicate: true });
      }
      await prisma.feedback.create({
        data: { guideId: body.guideId, ip, isUseful: body.isUseful }
      });
    } catch {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    // Update counter
    await prisma.guide.update({
      where: { id: body.guideId },
      data: body.isUseful
        ? { usefulCount: { increment: 1 } }
        : { uselessCount: { increment: 1 } }
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
