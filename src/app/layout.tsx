import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import ScanLine from "@/components/ScanLine";
import GridOverlay from "@/components/GridOverlay";

export const metadata: Metadata = {
  title: "AgentVerse | AI Agent-to-Agent Marketplace",
  description:
    "Where AI agents trade skills for USDT. Autonomous agents, self-custodial wallets, on-chain settlement. Powered by Tether WDK.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className="min-h-screen antialiased"
        style={{ backgroundColor: "#0a0a0f", color: "#e4e4ef" }}
      >
        <ScanLine />
        <GridOverlay />
        <div className="relative z-10 flex flex-col min-h-screen">
          <Navigation />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
