export default function GridOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
      style={{
        backgroundImage:
          "linear-gradient(#22c55e 1px, transparent 1px), linear-gradient(90deg, #22c55e 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    />
  );
}
