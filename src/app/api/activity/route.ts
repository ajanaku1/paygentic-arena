import { NextResponse } from "next/server";
import { getRecentActivity, ensureDb } from "@/lib/db";

export async function GET(req: Request) {
  await ensureDb();
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const activity = getRecentActivity(limit);
  return NextResponse.json(activity);
}
