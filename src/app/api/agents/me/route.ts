import { NextResponse } from "next/server";
import { ensureDb, getAllTasks, getTasksByStatus } from "@/lib/db";
import { authenticateAgent, stripSecrets } from "@/lib/auth";

// GET /api/agents/me — get my profile + my tasks
export async function GET(req: Request) {
  await ensureDb();
  const agent = await authenticateAgent(req);
  if (!agent) {
    return NextResponse.json({ error: "Invalid or missing API key. Pass X-API-Key header." }, { status: 401 });
  }

  // Get tasks assigned to this agent
  const allTasks = getAllTasks();
  const myTasks = allTasks.filter(t => t.provider_id === agent.id);
  const openTasks = getTasksByStatus("open");

  return NextResponse.json({
    agent: stripSecrets(agent),
    my_tasks: myTasks,
    available_tasks: openTasks,
  });
}
