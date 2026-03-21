import { NextResponse } from "next/server";
import { getTask } from "@/lib/db";
import * as taskManager from "@/lib/task-manager";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = getTask(id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    let result;
    switch (action) {
      case "assign":
        result = await taskManager.findAndAssignAgent(id);
        break;
      case "start":
        result = await taskManager.startWork(id);
        break;
      case "deliver":
        result = await taskManager.deliverWork(id);
        break;
      case "verify":
        result = await taskManager.verifyWork(id);
        break;
      case "pay":
        result = await taskManager.settlePayment(id);
        break;
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
