import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

const GROUND = "#0b1220";
const INK = "#e8f1ff";
const ACCENT = "#38bdf8";
const MUTED = "#7a8ba8";

const ROWS = [
  { name: "Laranite", price: "31.2 aUEC" },
  { name: "Agricium", price: "27.5 aUEC" },
  { name: "Titanium", price: "8.9 aUEC" },
];

const Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  const bar = interpolate(frame, [20, 42], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subtitle = interpolate(frame, [36, 54], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [108, 120], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 32, opacity: fadeOut }}>
      <h1
        style={{
          margin: 0,
          fontSize: 160,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          opacity: rise,
          transform: `translateY(${(1 - rise) * 60}px)`,
        }}
      >
        STREAMY
      </h1>
      <div style={{ width: 640, height: 8, background: ACCENT, transform: `scaleX(${bar})`, transformOrigin: "left" }} />
      <p style={{ margin: 0, fontSize: 44, color: MUTED, letterSpacing: "0.2em", opacity: subtitle }}>
        STAR CITIZEN MARKET FEED
      </p>
    </AbsoluteFill>
  );
};

const Ticker: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 32 }}>
      {ROWS.map((row, i) => {
        const enter = spring({ frame: frame - 6 - i * 6, fps, config: { damping: 200 } });
        return (
          <div
            key={row.name}
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: 1100,
              padding: "24px 40px",
              borderLeft: `6px solid ${ACCENT}`,
              background: "#121c30",
              fontSize: 52,
              opacity: enter,
              transform: `translateX(${(1 - enter) * -80}px)`,
            }}
          >
            <span>{row.name}</span>
            <span style={{ color: ACCENT, fontVariantNumeric: "tabular-nums" }}>{row.price}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const StreamyIntro: React.FC = () => (
  <AbsoluteFill style={{ background: GROUND, color: INK, fontFamily: "'DejaVu Sans', sans-serif" }}>
    <Sequence durationInFrames={120}>
      <Title />
    </Sequence>
    <Sequence from={120}>
      <Ticker />
    </Sequence>
  </AbsoluteFill>
);
