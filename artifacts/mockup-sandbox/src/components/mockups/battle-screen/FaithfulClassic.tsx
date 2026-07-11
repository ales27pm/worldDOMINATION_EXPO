import "./_group.css";
import type { ReactNode } from "react";

/**
 * Battle screen — "Faithful Classic" direction.
 * Recreates the original RISK II attack view as literally as possible:
 * glossy player-coloured plaques (count roundel → dice block → name bar),
 * a thick attacker-coloured arrow, troops standing on the aerial terrain,
 * bright daylight (almost no vignette), plain bold UI type.
 *
 * Frozen moment: Napoleon (crimson) has taken Scandinavia from
 * Wellington (blue) — attacker rolled gold-rank dice (general present),
 * defender rolled white-rank dice.
 */

const IMG = "/__mockup/images/risk";

const ATTACKER = "#b3272d"; // Napoleon crimson
const DEFENDER = "#2f5ec4"; // Wellington blue
const NAVY = "#1c2c66"; // classic attacker dice-block backing
const CRIMSON_BLOCK = "#7a1518"; // classic defender dice-block backing

function Die({
  body,
  pips,
  size = 26,
  rolling = false,
}: {
  body: string;
  pips: string;
  size?: number;
  rolling?: boolean;
}) {
  return (
    <span className={`r2-die ${rolling ? "r2-rolling" : ""}`} style={{ width: size, height: size }}>
      <span className="r2-die-body" style={{ backgroundColor: body }} />
      <img className="r2-die-pips" src={`${IMG}/${pips}.png`} alt="" />
    </span>
  );
}

function Piece({
  type,
  color,
  x,
  y,
  w,
  h,
}: {
  type: "infantry" | "cavalry" | "artillery";
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  const src = `${IMG}/piece-${type}.png`;
  const mask = `url(${src}) center / contain no-repeat`;
  return (
    <span className="r2-piece" style={{ position: "absolute", left: x, top: y, width: w, height: h }}>
      <img src={src} alt="" />
      <span
        className="r2-piece-tint"
        style={{ backgroundColor: color, WebkitMask: mask, mask: mask }}
      />
    </span>
  );
}

function Plaque({
  side,
  count,
  name,
  dice,
  losses,
}: {
  side: "attacker" | "defender";
  count: number;
  name: string;
  dice: ReactNode;
  losses: string;
}) {
  const color = side === "attacker" ? ATTACKER : DEFENDER;
  const block = side === "attacker" ? NAVY : CRIMSON_BLOCK;
  return (
    <div style={{ display: "flex", alignItems: "center", filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.55))" }}>
      {/* Count roundel */}
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          background: `radial-gradient(circle at 35% 30%, ${color} 0%, ${color} 55%, rgba(0,0,0,0.55) 130%)`,
          border: "2px solid rgba(0,0,0,0.75)",
          boxShadow: "inset 0 2px 3px rgba(255,255,255,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "Roboto, sans-serif",
            fontWeight: 900,
            fontSize: 21,
            color: "#0b0b0b",
            textShadow: "0 1px 0 rgba(255,255,255,0.35)",
          }}
        >
          {count}
        </span>
      </div>

      {/* Dice block + name bar */}
      <div style={{ marginLeft: -10 }}>
        <div style={{ display: "flex", alignItems: "stretch" }}>
          <div
            style={{
              background: `linear-gradient(180deg, ${block} 0%, rgba(0,0,0,0.85) 130%)`,
              border: "1.5px solid rgba(0,0,0,0.8)",
              borderRight: "none",
              borderTopLeftRadius: 6,
              borderBottomLeftRadius: 6,
              padding: "5px 8px 5px 16px",
              display: "flex",
              gap: 5,
              alignItems: "center",
            }}
          >
            {dice}
            <span
              style={{
                fontFamily: "Roboto, sans-serif",
                fontWeight: 900,
                fontSize: 13,
                color: "#ffd65a",
                marginLeft: 3,
                textShadow: "0 1px 2px #000",
              }}
            >
              {losses}
            </span>
          </div>
          <div
            style={{
              background: `linear-gradient(180deg, ${color} 0%, ${color} 45%, rgba(0,0,0,0.5) 160%)`,
              border: "1.5px solid rgba(0,0,0,0.8)",
              borderTopRightRadius: 17,
              borderBottomRightRadius: 17,
              padding: "5px 16px 5px 10px",
              display: "flex",
              alignItems: "center",
              minWidth: 92,
            }}
          >
            <span
              style={{
                fontFamily: "Roboto, sans-serif",
                fontWeight: 800,
                fontSize: 14,
                color: "#fff",
                textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                letterSpacing: 0.3,
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FaithfulClassic() {
  // Attacker ranks (crimson) lower-left, defender ranks (blue) upper-right.
  const attackers: Array<[number, number]> = [
    [46, 596], [86, 590], [126, 596], [166, 588],
    [64, 648], [108, 654], [150, 646],
  ];
  const defenders: Array<[number, number]> = [
    [246, 434], [286, 428], [324, 438], [268, 486], [310, 480],
  ];

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        background: "#000",
      }}
    >
      <img
        src={`${IMG}/backdrop.webp`}
        alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
      {/* Faithful = bright daylight; barely-there edge shading only. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.34) 100%)",
        }}
      />

      {/* Attack arrow — attacker colour, plaque to plaque. */}
      <svg
        viewBox="0 0 390 844"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <marker id="fc-head" markerWidth="7" markerHeight="7" refX="4.6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={ATTACKER} stroke="rgba(0,0,0,0.7)" strokeWidth="0.6" />
          </marker>
        </defs>
        <line
          x1="118" y1="176" x2="252" y2="352"
          stroke="rgba(0,0,0,0.55)" strokeWidth="13" strokeLinecap="round"
        />
        <line
          x1="118" y1="176" x2="248" y2="347"
          stroke={ATTACKER} strokeWidth="9" strokeLinecap="round" markerEnd="url(#fc-head)"
        />
      </svg>

      {/* Troops standing on the terrain. */}
      {attackers.map(([x, y], i) => (
        <Piece key={`a${i}`} type="infantry" color={ATTACKER} x={x} y={y} w={30} h={52} />
      ))}
      <Piece type="cavalry" color={ATTACKER} x={196} y={620} w={62} h={66} />
      {defenders.map(([x, y], i) => (
        <Piece key={`d${i}`} type="infantry" color={DEFENDER} x={x} y={y} w={28} h={48} />
      ))}

      {/* Plaques */}
      <div style={{ position: "absolute", top: 118, left: 12 }}>
        <Plaque
          side="attacker"
          count={9}
          name="Ukraine"
          losses="-1"
          dice={
            <>
              <Die body="#d3a534" pips="pip_light_5" />
              <Die body="#d3a534" pips="pip_light_5" rolling />
              <Die body="#d3a534" pips="pip_light_3" />
            </>
          }
        />
      </div>
      <div style={{ position: "absolute", top: 330, right: 12 }}>
        <Plaque
          side="defender"
          count={0}
          name="Scandinavia"
          losses="-2"
          dice={
            <>
              <Die body="#ece7dc" pips="pip_dark_4" />
              <Die body="#ece7dc" pips="pip_dark_4" />
            </>
          }
        />
      </div>

      {/* Result ribbon */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 84, textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            background: "linear-gradient(180deg, rgba(0,0,0,0.78), rgba(0,0,0,0.62))",
            border: "1px solid rgba(255,214,90,0.55)",
            borderRadius: 4,
            padding: "8px 26px",
          }}
        >
          <div
            style={{
              fontFamily: "Roboto, sans-serif",
              fontWeight: 900,
              fontSize: 17,
              letterSpacing: 4,
              color: "#ffd65a",
              textShadow: "0 1px 3px #000",
            }}
          >
            TERRITORY TAKEN
          </div>
          <div
            style={{
              fontFamily: "Roboto, sans-serif",
              fontSize: 10,
              letterSpacing: 2,
              color: "rgba(255,255,255,0.75)",
              marginTop: 3,
            }}
          >
            TAP TO CONTINUE
          </div>
        </div>
      </div>
    </div>
  );
}
