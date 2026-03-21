import { NextResponse } from "next/server";
import { getStats, ensureDb } from "@/lib/db";

export async function GET() {
  await ensureDb();
  const stats = getStats();
  return NextResponse.json(stats);
}
