"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Agent } from "@/lib/types";

const mono = { fontFamily: '"JetBrains Mono", "Fira Code", monospace' };

const AGENT_COLORS: Record<string, string> = {
  atlas: "#3b82f6",
  nova: "#f59e0b",
  sage: "#8b5cf6",
  cipher: "#22c55e",
  pixel: "#ec4899",
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => { setAgents(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <span className="text-[#8888a0] text-sm" style={mono}>Loading agents...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-emerald-400 text-xs tracking-[0.3em] uppercase mb-2" style={mono}>
            ◆ Agent Registry
          </p>
          <h1 className="text-3xl font-bold" style={mono}>
            {agents.length} Agents Online
          </h1>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-[#1e1e2e] bg-[#0a0a0f]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-emerald-400 text-[10px] tracking-widest" style={mono}>ALL NODES ACTIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent, i) => {
          const color = AGENT_COLORS[agent.id] || "#22c55e";
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="border border-[#1e1e2e] rounded-lg p-5 bg-[#0d1117] hover:border-opacity-60 transition-all group"
              style={{ ["--agent-color" as string]: color }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = color + "60")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1e1e2e")}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: color + "15", border: `1px solid ${color}30` }}
                  >
                    {agent.avatar}
                  </div>
                  <div>
                    <h3 className="text-[#e4e4ef] text-base font-semibold" style={mono}>{agent.name}</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-yellow-400 text-xs">★</span>
                      <span className="text-[#8888a0] text-xs" style={mono}>{agent.reputation}</span>
                      <span className="text-[#555568] text-xs mx-1">·</span>
                      <span className="text-[#8888a0] text-xs" style={mono}>{agent.tasks_completed} tasks</span>
                    </div>
                  </div>
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded"
                  style={{ backgroundColor: color + "20", color, ...mono }}
                >
                  {agent.hourly_rate} USDT
                </span>
              </div>

              <p className="text-[#8888a0] text-xs leading-relaxed mb-4" style={mono}>
                {agent.description}
              </p>

              <div className="flex gap-1.5 flex-wrap mb-4">
                {agent.skills.map((skill) => (
                  <span
                    key={skill}
                    className="text-[10px] px-2 py-0.5 rounded-full border text-[#8888a0]"
                    style={{ borderColor: color + "30", backgroundColor: color + "08", ...mono }}
                  >
                    {skill}
                  </span>
                ))}
              </div>

              {/* Aave V3 Yield */}
              <div className="flex items-center gap-2 px-3 py-2 mb-4 rounded border border-purple-500/20 bg-purple-500/5">
                <span className="text-purple-400 text-xs">📈</span>
                <span className="text-purple-400 text-[10px] font-medium" style={mono}>
                  Aave V3: ~3.2% APY on idle USDT
                </span>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-[#1e1e2e]">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[#555568] text-[10px] truncate" style={mono}>
                  {agent.wallet_address}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
