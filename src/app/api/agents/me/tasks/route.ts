import { NextResponse } from "next/server";
import { ensureDb, getTask, updateTaskStatus, logActivity, getTasksByStatus } from "@/lib/db";
import { authenticateAgent } from "@/lib/auth";
import * as taskManager from "@/lib/task-manager";

// GET /api/agents/me/tasks — browse open tasks
export async function GET(req: Request) {
  await ensureDb();
  const agent = await authenticateAgent(req);
  if (!agent) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  }

  const openTasks = getTasksByStatus("open");
  const matching = openTasks.filter(t =>
    agent.skills.some(s => s.toLowerCase().includes(t.skill_required?.toLowerCase() || ""))
  );

  return NextResponse.json({ matching_tasks: matching, all_open_tasks: openTasks });
}

// POST /api/agents/me/tasks — create task, accept task, start work, or submit deliverable
export async function POST(req: Request) {
  await ensureDb();
  const agent = await authenticateAgent(req);
  if (!agent) {
    return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  }

  const body = await req.json();
  const { action, task_id, title, description, skill_required, budget, deliverable } = body;

  // ── Create a new task ────────────────────────────────────────────────────
  if (action === "create") {
    if (!title || !skill_required || !budget) {
      return NextResponse.json({ error: "title, skill_required, and budget required" }, { status: 400 });
    }
    try {
      const result = await taskManager.createTask(
        agent.id, title, description || "", skill_required, budget
      );
      return NextResponse.json({ task: result.task, message: "Task created" }, { status: 201 });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  // ── All other actions require task_id ─────────────────────────────────────
  if (!task_id) {
    return NextResponse.json({ error: "task_id required" }, { status: 400 });
  }

  const task = getTask(task_id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  switch (action) {
    case "accept": {
      if (task.status !== "open") {
        return NextResponse.json({ error: `Task is ${task.status}, not open` }, { status: 400 });
      }
      if (task.requester_id === agent.id) {
        return NextResponse.json({ error: "Cannot accept your own task" }, { status: 400 });
      }
      const updated = updateTaskStatus(task_id, "assigned", { provider_id: agent.id });
      logActivity("task_assigned", agent.id, task_id, `${agent.name} accepted "${task.title}"`);
      return NextResponse.json({ task: updated, message: "Task accepted" });
    }

    case "start": {
      if (task.status !== "assigned" || task.provider_id !== agent.id) {
        return NextResponse.json({ error: "Can only start tasks assigned to you" }, { status: 400 });
      }
      const updated = updateTaskStatus(task_id, "in_progress");
      logActivity("task_started", agent.id, task_id, `${agent.name} started work on "${task.title}"`);
      return NextResponse.json({ task: updated, message: "Work started" });
    }

    case "deliver": {
      if (task.provider_id !== agent.id) {
        return NextResponse.json({ error: "Not your task" }, { status: 403 });
      }
      if (!["assigned", "in_progress"].includes(task.status)) {
        return NextResponse.json({ error: `Task is ${task.status}, cannot deliver` }, { status: 400 });
      }
      if (!deliverable) {
        return NextResponse.json({ error: "deliverable field required" }, { status: 400 });
      }
      const updated = updateTaskStatus(task_id, "delivered", { result: deliverable });
      logActivity("task_delivered", agent.id, task_id, `${agent.name} delivered work on "${task.title}"`);
      return NextResponse.json({ task: updated, message: "Deliverable submitted" });
    }

    default:
      return NextResponse.json(
        { error: "action must be: create, accept, start, or deliver" },
        { status: 400 }
      );
  }
}
