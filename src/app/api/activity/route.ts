import { NextResponse } from "next/server";
import { getRecentActivity } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const activity = getRecentActivity(limit);
  return NextResponse.json(activity);
}
