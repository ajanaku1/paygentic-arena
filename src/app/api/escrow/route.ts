import { NextResponse } from "next/server";
import { ensureDb, getAllTasks } from "@/lib/db";
import { getBalance, getWalletAddress } from "@/lib/wallet-service";

export async function GET() {
  await ensureDb();

  try {
    let address = "";
    let balance = "0";
    try {
      [address, balance] = await Promise.all([
        getWalletAddress(),
        getBalance(),
      ]);
    } catch {
      // Locus API not configured — show stats only
    }

    const tasks = getAllTasks();
    const lockedTasks = tasks.filter(t => t.escrow_status === "locked");
    const releasedTasks = tasks.filter(t => t.escrow_status === "released");
    const totalLocked = lockedTasks.reduce((sum, t) => sum + (t.budget || 0), 0);
    const totalReleased = releasedTasks.reduce((sum, t) => sum + (t.budget || 0), 0);

    return NextResponse.json({
      escrow_wallet: address || "Locus Platform Wallet",
      balance,
      chain: "Base",
      currency: "USDC",
      provider: "PayWithLocus.com",
      stats: {
        tasks_in_escrow: lockedTasks.length,
        tasks_released: releasedTasks.length,
        total_locked_usdc: Math.round(totalLocked * 100) / 100,
        total_released_usdc: Math.round(totalReleased * 100) / 100,
      },
      explorer_url: address ? `https://basescan.org/address/${address}` : null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
