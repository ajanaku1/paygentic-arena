import { NextResponse } from "next/server";
import { getAllTasks } from "@/lib/db";
import * as taskManager from "@/lib/task-manager";

export async function GET() {
  const tasks = getAllTasks();
  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { requester_id, title, description, skill_required, budget } = body;

    if (!requester_id || !title || !skill_required || !budget) {
      return NextResponse.json(
        { error: "requester_id, title, skill_required, and budget are required" },
        { status: 400 }
      );
    }

    const result = await taskManager.createTask(
      requester_id,
      title,
      description || "",
      skill_required,
      budget
    );

    return NextResponse.json(result, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
