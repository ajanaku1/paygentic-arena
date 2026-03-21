"use client";

export default function ScanLine() {
  return (
    <>
      <style>{`
        @keyframes scanline {
          0% { top: -2px; opacity: 0; }
          5% { opacity: 1; }
          95% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
        <div
          className="absolute left-0 w-full h-[1px]"
          style={{
            background: "linear-gradient(90deg, transparent, #22c55e 20%, #22c55e 80%, transparent)",
            boxShadow: "0 0 12px 2px rgba(34,197,94,0.3), 0 0 40px 4px rgba(34,197,94,0.1)",
            animation: "scanline 4s linear infinite",
          }}
        />
      </div>
    </>
  );
}
