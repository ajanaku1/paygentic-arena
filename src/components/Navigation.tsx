"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const mono = { fontFamily: '"JetBrains Mono", "Fira Code", monospace' };

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/agents", label: "Agents" },
  { href: "/tasks", label: "Tasks" },
  { href: "/demo", label: "Demo" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between px-6 py-3 border-b border-[#1e1e2e] bg-[#0d1117]/80 backdrop-blur-sm relative z-20">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="PaygenticArena" width={32} height={32} className="rounded" />
          <span className="text-[#e4e4ef] text-lg font-semibold tracking-wider" style={mono}>
            PAYGENTIC<span className="text-violet-400">ARENA</span>
          </span>
        </Link>
        <span className="text-[#8888a0] text-xs ml-1 hidden sm:inline">v1.0.0</span>
      </div>

      <div className="flex items-center gap-6">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-xs tracking-widest uppercase transition-colors ${
              pathname === link.href
                ? "text-violet-400"
                : "text-[#8888a0] hover:text-[#e4e4ef]"
            }`}
            style={mono}
          >
            {link.label}
          </Link>
        ))}

        <div className="flex items-center gap-2 ml-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-violet-500" />
          </span>
          <span className="text-violet-400 text-xs font-medium tracking-widest uppercase" style={mono}>
            LIVE
          </span>
        </div>
      </div>
    </nav>
  );
}
