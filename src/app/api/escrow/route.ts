import { NextResponse } from "next/server";
import { ensureDb, getAllTasks } from "@/lib/db";
import { getEscrowAddress, getEscrowBalance } from "@/lib/wallet-service";

export async function GET() {
  await ensureDb();

  try {
    const [address, balance] = await Promise.all([
      getEscrowAddress(),
      getEscrowBalance(),
    ]);

    const tasks = getAllTasks();
    const lockedTasks = tasks.filter(t => t.escrow_status === "locked");
    const releasedTasks = tasks.filter(t => t.escrow_status === "released");
    const totalLocked = lockedTasks.reduce((sum, t) => sum + (t.budget || 0), 0);
    const totalReleased = releasedTasks.reduce((sum, t) => sum + (t.budget || 0), 0);

    return NextResponse.json({
      escrow_wallet: address,
      balance,
      chain: process.env.CHAIN_NAME || "ethereum",
      stats: {
        tasks_in_escrow: lockedTasks.length,
        tasks_released: releasedTasks.length,
        total_locked_usdt: Math.round(totalLocked * 100) / 100,
        total_released_usdt: Math.round(totalReleased * 100) / 100,
      },
      explorer_url: `https://sepolia.etherscan.io/address/${address}`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
