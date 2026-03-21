"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Task } from "@/lib/types";

const mono = { fontFamily: '"JetBrains Mono", "Fira Code", monospace' };

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  open: { color: "#3b82f6", label: "OPEN" },
  assigned: { color: "#f59e0b", label: "ASSIGNED" },
  in_progress: { color: "#f59e0b", label: "IN PROGRESS" },
  delivered: { color: "#8b5cf6", label: "DELIVERED" },
  verified: { color: "#22c55e", label: "VERIFIED" },
  paid: { color: "#22c55e", label: "PAID" },
  disputed: { color: "#ef4444", label: "DISPUTED" },
};

const COLUMNS = [
  { key: "open", statuses: ["open"], title: "Open Tasks" },
  { key: "active", statuses: ["assigned", "in_progress"], title: "In Progress" },
  { key: "review", statuses: ["delivered", "verified"], title: "Review" },
  { key: "done", statuses: ["paid"], title: "Settled" },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/tasks").then((r) => r.json()),
      fetch("/api/activity?limit=20").then((r) => r.json()),
    ]).then(([t, a]) => {
      setTasks(t);
      setActivity(a);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <span className="text-[#8888a0] text-sm" style={mono}>Loading tasks...</span>
      </div>
    );
  }

  const grouped = COLUMNS.map((col) => ({
    ...col,
    tasks: tasks.filter((t) => col.statuses.includes(t.status)),
  }));

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 flex gap-6 h-[calc(100vh-57px)]">
      {/* Kanban Board */}
      <div className="flex-1 flex gap-4 overflow-x-auto">
        {grouped.map((col, ci) => (
          <div key={col.key} className="flex-1 min-w-[220px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[#8888a0] text-[10px] uppercase tracking-[0.2em]" style={mono}>
                {col.title}
              </h2>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full bg-[#0a0a0f] border border-[#1e1e2e] text-[#8888a0]"
                style={mono}
              >
                {col.tasks.length}
              </span>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {col.tasks.length === 0 ? (
                <div className="border border-dashed border-[#1e1e2e] rounded-lg p-4 text-center">
                  <p className="text-[#555568] text-xs" style={mono}>No tasks</p>
                </div>
              ) : (
                col.tasks.map((task, ti) => {
                  const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG.open;
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: ci * 0.1 + ti * 0.05 }}
                      className="border border-[#1e1e2e] rounded-lg p-4 bg-[#0d1117] hover:border-emerald-500/20 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-[#e4e4ef] text-xs font-medium leading-snug" style={mono}>
                          {task.title}
                        </h3>
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0 ml-2"
                          style={{ backgroundColor: sc.color + "20", color: sc.color, ...mono }}
                        >
                          {sc.label}
                        </span>
                      </div>
                      {task.skill_required && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full border border-[#1e1e2e] text-[#8888a0] bg-[#0a0a0f] inline-block mb-2" style={mono}>
                          {task.skill_required}
                        </span>
                      )}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1e1e2e]/60">
                        <span className="text-emerald-400 text-xs font-bold" style={mono}>
                          {task.budget} USDT
                        </span>
                        {task.tx_hash && (
                          <span className="text-[#555568] text-[9px] truncate max-w-[100px]" style={mono}>
                            tx: {task.tx_hash.slice(0, 10)}...
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Activity Sidebar */}
      <div className="w-[320px] shrink-0 flex flex-col">
        <h2 className="text-[#8888a0] text-[10px] uppercase tracking-[0.2em] mb-4" style={mono}>
          ◇ Activity Log
        </h2>
        <div className="flex-1 border border-[#1e1e2e] rounded-lg bg-[#0d1117] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e1e2e] bg-[#0a0a0f]">
            <span className="text-[#8888a0] text-[10px] tracking-widest" style={mono}>RECENT</span>
            <span className="text-[#555568] text-[10px]" style={mono}>{activity.length} entries</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {activity.length === 0 ? (
              <p className="text-[#555568] text-xs text-center py-8" style={mono}>
                No activity yet. Run the demo to see events here.
              </p>
            ) : (
              activity.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-[#1e1e2e]/40 pb-2"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                      style={{
                        backgroundColor: a.type.includes("payment") ? "#22c55e20" : "#3b82f620",
                        color: a.type.includes("payment") ? "#22c55e" : "#3b82f6",
                        ...mono,
                      }}
                    >
                      {a.type.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[#e4e4ef]/70 text-[10px] leading-relaxed" style={mono}>
                    {a.message}
                  </p>
                  <p className="text-[#555568] text-[9px] mt-1" style={mono}>
                    {new Date(a.created_at).toLocaleTimeString()}
                  </p>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
