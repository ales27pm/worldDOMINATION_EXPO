import "./_group.css";
import type { ReactNode } from "react";

/**
 * Battle screen — "Parchment Theatre" direction.
 * The original's composition (plaques with roundel + dice + name, attack
 * arrow, troops on the terrain) redrawn in the port's own art language:
 * aged parchment plaques with walnut-and-gold fittings, IM Fell English SC
 * territory names, a warmer sepia stage light.
 *
 * Frozen moment: Napoleon (crimson) has taken Scandinavia from
 * Wellington (blue) — attacker rolled gold-rank dice, defender white-rank.
 */

const IMG = "/__mockup/images/risk";

const ATTACKER = "#a02128"; // Napoleon crimson
const DEFENDER = "#2f5ec4"; // Wellington blue
const PARCHMENT = "#ede0c0";
const WALNUT = "#251a13";
const GOLD = "#debe73";
const NAVY = "#22335f"; // muted attacker dice backing
const OXBLOOD = "#5f1a16"; // muted defender dice backing

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
  const block = side === "attacker" ? NAVY : OXBLOOD;
  return (
    <div style={{ display: "flex", alignItems: "center", filter: "drop-shadow(0 4px 5px rgba(0,0,0,0.6))" }}>
      {/* Wax-seal count roundel */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          background: `radial-gradient(circle at 36% 30%, ${color} 12%, ${color} 52%, rgba(0,0,0,0.6) 135%)`,
          border: `2px solid ${GOLD}`,
          boxShadow: "inset 0 2px 4px rgba(255,255,255,0.3), 0 0 0 2px rgba(0,0,0,0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "'Alegreya', serif",
            fontWeight: 800,
            fontSize: 21,
            color: PARCHMENT,
            textShadow: "0 1px 2px rgba(0,0,0,0.8)",
          }}
        >
          {count}
        </span>
      </div>

      <div style={{ marginLeft: -11 }}>
        <div style={{ display: "flex", alignItems: "stretch" }}>
          {/* Dice tray — walnut with a side-colour underlay */}
          <div
            style={{
              background: `linear-gradient(180deg, ${block} 0%, ${WALNUT} 120%)`,
              border: `1.5px solid ${GOLD}`,
              borderRight: "none",
              borderTopLeftRadius: 5,
              borderBottomLeftRadius: 5,
              boxShadow: "inset 0 1px 4px rgba(0,0,0,0.65)",
              padding: "6px 8px 6px 17px",
              display: "flex",
              gap: 5,
              alignItems: "center",
            }}
          >
            {dice}
            <span
              style={{
                fontFamily: "'Alegreya', serif",
                fontWeight: 800,
                fontSize: 13,
                color: GOLD,
                marginLeft: 3,
                textShadow: "0 1px 2px #000",
              }}
            >
              {losses}
            </span>
          </div>
          {/* Parchment name bar with player-colour edge */}
          <div
            style={{
              background: `linear-gradient(180deg, ${PARCHMENT} 0%, #d9c69b 100%)`,
              border: `1.5px solid ${GOLD}`,
              borderLeft: `4px solid ${color}`,
              borderTopRightRadius: 16,
              borderBottomRightRadius: 16,
              boxShadow: "inset 0 -6px 12px rgba(120,90,40,0.28)",
              padding: "5px 15px 5px 10px",
              display: "flex",
              alignItems: "center",
              minWidth: 96,
            }}
          >
            <span
              style={{
                fontFamily: "'IM Fell English SC', serif",
                fontSize: 16,
                color: WALNUT,
                letterSpacing: 0.5,
                whiteSpace: "nowrap",
                lineHeight: 1,
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

export function ParchmentTheatre() {
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
      {/* Warm sepia stage light — a touch more theatrical than the original. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 42%, rgba(28,16,6,0) 48%, rgba(28,16,6,0.42) 100%), linear-gradient(180deg, rgba(28,16,6,0.22) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 70%, rgba(20,12,5,0.4) 100%)",
        }}
      />

      {/* Attack arrow — weathered crimson with a gold-leaf edge. */}
      <svg
        viewBox="0 0 390 844"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <marker id="pt-head" markerWidth="7" markerHeight="7" refX="4.6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={ATTACKER} stroke={GOLD} strokeWidth="0.55" />
          </marker>
        </defs>
        <line
          x1="118" y1="176" x2="252" y2="352"
          stroke="rgba(0,0,0,0.5)" strokeWidth="13" strokeLinecap="round"
        />
        <line
          x1="118" y1="176" x2="248" y2="347"
          stroke={ATTACKER} strokeWidth="8.5" strokeLinecap="round" markerEnd="url(#pt-head)"
          strokeDasharray="1 0"
        />
        <line
          x1="118" y1="176" x2="248" y2="347"
          stroke={GOLD} strokeWidth="1.4" strokeLinecap="round" opacity="0.7"
          transform="translate(0,-4.6)"
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

      {/* Result banner — parchment ribbon */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 84, textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            background: `linear-gradient(180deg, ${PARCHMENT} 0%, #d9c69b 100%)`,
            border: `1.5px solid ${GOLD}`,
            boxShadow: "0 4px 10px rgba(0,0,0,0.55), inset 0 -8px 14px rgba(120,90,40,0.3)",
            borderRadius: 3,
            padding: "9px 28px",
          }}
        >
          <div
            style={{
              fontFamily: "'IM Fell English SC', serif",
              fontSize: 19,
              letterSpacing: 3,
              color: WALNUT,
            }}
          >
            Territory Taken
          </div>
          <div
            style={{
              fontFamily: "'Alegreya', serif",
              fontStyle: "italic",
              fontSize: 11,
              color: "#6b5433",
              marginTop: 2,
            }}
          >
            tap to continue
          </div>
        </div>
      </div>
    </div>
  );
}
