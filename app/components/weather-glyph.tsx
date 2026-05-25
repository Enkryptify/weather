// Fine line-art weather marks. Single-weight strokes, monochrome ink, with the
// sun rendered in the accent tone. Drawn on a 64×64 grid; stroke width scales
// down as the mark grows so large and small instances stay hairline-elegant.

interface GlyphProps {
  icon: string;
  size?: number;
}

export function WeatherGlyph({ icon, size = 116 }: GlyphProps) {
  const night = icon.endsWith("n");
  const code = icon.slice(0, 2);
  const sw = (1.4 * 64) / size; // keep visual stroke ~1.4px at any size
  // Round computed coordinates so server and client render identical strings
  // (avoids floating-point hydration mismatches).
  const r3 = (n: number) => Math.round(n * 1000) / 1000;
  const ink = "currentColor"; // adapts to the surface (ink on paper, cream on the plate)
  const accent = "var(--accent)";

  const stroke = {
    fill: "none",
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  let content: React.ReactNode;

  const Sun = ({ cx = 32, cy = 32, r = 11, rays = true }) => (
    <g stroke={accent} {...stroke}>
      {rays && (
        <g className="spin-slow" style={{ transformOrigin: `${cx}px ${cy}px` }}>
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * Math.PI) / 6;
            return (
              <line
                key={i}
                x1={r3(cx + (r + 5) * Math.cos(a))}
                y1={r3(cy + (r + 5) * Math.sin(a))}
                x2={r3(cx + (r + 9) * Math.cos(a))}
                y2={r3(cy + (r + 9) * Math.sin(a))}
              />
            );
          })}
        </g>
      )}
      <circle cx={cx} cy={cy} r={r} />
    </g>
  );

  const Cloud = ({ dx = 0, dy = 0, s = 1, color = ink }) => (
    <path
      transform={`translate(${dx} ${dy}) scale(${s})`}
      d="M20 42a9 9 0 0 1 .6-17.9A13 13 0 0 1 46 26a8 8 0 0 1 0 16H20z"
      stroke={color}
      {...stroke}
    />
  );

  switch (code) {
    case "01":
      content = night ? (
        <path
          className="bob"
          d="M41 18a16 16 0 1 0 6 24 13 13 0 0 1-6-24z"
          stroke={accent}
          {...stroke}
        />
      ) : (
        <g className="bob">
          <Sun />
        </g>
      );
      break;
    case "02":
      content = (
        <>
          <Sun cx={26} cy={24} r={8} />
          <g className="bob">
            <Cloud dx={6} dy={12} s={0.78} />
          </g>
        </>
      );
      break;
    case "03":
    case "04":
      content = (
        <g className="bob">
          <g opacity={0.5}>
            <Cloud dx={-6} dy={-2} s={0.7} />
          </g>
          <Cloud dx={6} dy={6} s={0.92} />
        </g>
      );
      break;
    case "09":
    case "10":
      content = (
        <>
          <Cloud dx={0} dy={-4} s={0.92} />
          <g stroke={accent} {...stroke}>
            {[24, 32, 40].map((x, i) => (
              <line
                key={x}
                className="drop"
                x1={x}
                y1={46}
                x2={x - 2}
                y2={54}
                style={{ animationDelay: `${i * 0.3}s` }}
              />
            ))}
          </g>
        </>
      );
      break;
    case "11":
      content = (
        <>
          <Cloud dx={0} dy={-6} s={0.92} />
          <path
            d="M34 44l-6 9h6l-4 9 11-12h-6l4-6z"
            stroke={accent}
            {...stroke}
          />
        </>
      );
      break;
    case "13":
      content = (
        <>
          <Cloud dx={0} dy={-4} s={0.92} />
          <g stroke={accent} {...stroke}>
            {[24, 32, 40].map((x, i) => (
              <g
                key={x}
                className="drop"
                style={{ animationDelay: `${i * 0.35}s` }}
              >
                <line x1={x - 2.5} y1={50} x2={x + 2.5} y2={50} />
                <line x1={x} y1={47.5} x2={x} y2={52.5} />
              </g>
            ))}
          </g>
        </>
      );
      break;
    default:
      content = (
        <g stroke="currentColor" opacity={0.7} {...stroke}>
          <line x1="16" y1="26" x2="48" y2="26" />
          <line x1="14" y1="34" x2="50" y2="34" />
          <line x1="18" y1="42" x2="44" y2="42" />
        </g>
      );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      {content}
    </svg>
  );
}
