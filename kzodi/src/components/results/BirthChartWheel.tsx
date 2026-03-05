"use client";
import React from "react";
import { motion } from "framer-motion";

/* ================================================================
   Premium Custom Birth Chart Wheel
   - Fully custom SVG, no library dependency
   - Proper zodiac glyph SVG paths
   - Planet collision resolution
   - App-matched black/white/yellow theme
   ================================================================ */

interface BirthChartWheelProps {
  birthChartData: Record<string, unknown> | null;
}

interface PlanetData {
  name: string;
  longitude: number;
  sign: string;
  house: number;
  isRetrograde: boolean;
  degree: string;
}

interface HouseData {
  number: number;
  longitude: number;
  sign: string;
  degree: string;
}

/* -- Chart geometry -- */
const W = 380;
const CX = W / 2;
const CY = W / 2;
const R_OUTER = 178;
const R_SIGN_OUT = 172;
const R_SIGN_IN = 142;
const R_PLANET = 112;
const R_HOUSE_NUM = 82;
const R_INNER = 56;
const R_CENTER = 22;
const PLANET_CIRCLE_R = 12;
const MIN_SEP = 14;

/* -- Zodiac glyph SVG paths (16x16 viewBox) -- */
const SIGN_GLYPHS = [
  /* Aries     */ "M8 14V7C8 4.5 5 3 3.5 5.5M8 7C8 4.5 11 3 12.5 5.5",
  /* Taurus    */ "M4 5.5C4 2.5 8 1.5 8 1.5S12 2.5 12 5.5M8 14C5.2 14 3 11.8 3 9S5.2 4 8 4S13 6.2 13 9S10.8 14 8 14Z",
  /* Gemini    */ "M4.5 3C6.5 1.5 9.5 1.5 11.5 3M4.5 13C6.5 14.5 9.5 14.5 11.5 13M6.5 3V13M9.5 3V13",
  /* Cancer    */ "M11 3.5C9 1.5 5.5 2 4 5M5 12.5C7 14.5 10.5 14 12 11M4 5C2.3 5 2.3 8.5 4 8.5S5.7 5 4 5M12 11C13.7 11 13.7 7.5 12 7.5S10.3 11 12 11",
  /* Leo       */ "M5 10C2.8 10 2.8 4 5 4S7.2 10 5 10L9 6C10 4.5 12 5 12 7S11 10 9 12C7 14 6 14 5 13",
  /* Virgo     */ "M4 3V12M4 5.5C6 3.5 8 4.5 8 7V12M8 6.5C10 4.5 12 5.5 12 8C12 12 10.5 13.5 9 12M12 8V14",
  /* Libra     */ "M3 13H13M4.5 10H11.5M5.5 10C5.5 7 6.5 5 8 5S10.5 7 10.5 10",
  /* Scorpio   */ "M4 4V12M4 6C6 4 8 5 8 7.5V12M8 7C10 5 12 6 12 8.5V13L14 11M14 11L14 14",
  /* Sagittari */ "M3.5 13L12.5 4M8.5 4H12.5V8M6.5 9.5L10 13",
  /* Capricorn */ "M4 5C4 5 4 9 7 12C8 13 9 13 10 12L13 5C13.5 3.5 15 4 14.5 6C14 8.5 12 10 11 9",
  /* Aquarius  */ "M3 6.5L5 4.5L7 6.5L9 4.5L11 6.5L13 4.5M3 11L5 9L7 11L9 9L11 11L13 9",
  /* Pisces    */ "M5.5 3C5.5 3 2.5 5.5 2.5 8S5.5 13 5.5 13M10.5 3C10.5 3 13.5 5.5 13.5 8S10.5 13 10.5 13M2.5 8H13.5",
];

const SIGN_NAMES = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

/* -- Planet display info -- */
const P_INFO: Record<string, string> = {
  Sun: "Su", Moon: "Mo", Mercury: "Me", Venus: "Ve", Mars: "Ma",
  Jupiter: "Ju", Saturn: "Sa", Uranus: "Ur", Neptune: "Ne", Pluto: "Pl",
  NorthNode: "NN", Chiron: "Ch", Ceres: "Ce", Pallas: "Pa", Juno: "Jn", Vesta: "Vs",
};

/* -- Aspect line styles -- */
const A_STYLE: Record<string, { c: string; d?: string }> = {
  conjunction: { c: "#C8B400" },
  opposition: { c: "#D04040", d: "4 2" },
  trine: { c: "#3C8C50" },
  square: { c: "#D04040" },
  sextile: { c: "#4070B0" },
  quincunx: { c: "#805090", d: "2 2" },
};

/* -- Math helpers -- */
const toRad = (d: number) => (d * Math.PI) / 180;
const polar = (deg: number, r: number) => ({
  x: CX + r * Math.cos(toRad(deg - 90)),
  y: CY + r * Math.sin(toRad(deg - 90)),
});
const arcD = (s: number, e: number, ro: number, ri: number) => {
  const a = polar(s, ro), b = polar(s, ri), c = polar(e, ro), d2 = polar(e, ri);
  const lg = ((e - s + 360) % 360) > 180 ? 1 : 0;
  return `M${b.x},${b.y}L${a.x},${a.y}A${ro},${ro},0,${lg},1,${c.x},${c.y}L${d2.x},${d2.y}A${ri},${ri},0,${lg},0,${b.x},${b.y}`;
};

/* -- Planet collision resolver -- */
function spreadPlanets(
  items: { angle: number; name: string; retro: boolean; sign: string; house: number; deg: string; lon: number }[]
) {
  const sorted = [...items].sort((a, b) => a.angle - b.angle);
  const out = sorted.map((p) => ({ ...p, r: R_PLANET, displayAngle: p.angle }));

  for (let pass = 0; pass < 8; pass++) {
    let moved = false;
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const diff = out[j].displayAngle - out[i].displayAngle;
        const dist = ((diff % 360) + 360) % 360;
        const actual = dist > 180 ? 360 - dist : dist;
        if (actual < MIN_SEP) {
          const push = (MIN_SEP - actual) / 2 + 0.5;
          out[i].displayAngle -= push;
          out[j].displayAngle += push;
          if (actual < MIN_SEP * 0.6) {
            out[j].r = R_PLANET - 16;
          }
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  return out;
}

/* ================================================================ */
const BirthChartWheel: React.FC<BirthChartWheelProps> = ({ birthChartData }) => {
  if (!birthChartData) {
    return (
      <div className="card-bordered p-6 flex items-center justify-center" style={{ minHeight: 280 }}>
        <p className="text-warm-gray text-[13px]">No birth chart data available.</p>
      </div>
    );
  }

  const planets: PlanetData[] = (birthChartData.planets as PlanetData[]) || [];
  const houses: HouseData[] = (birthChartData.houses as HouseData[]) || [];
  const anglesData = (birthChartData.angles || {}) as Record<
    string,
    { sign: string; degree: string; longitude: number }
  >;
  const aspects = (birthChartData.aspects || []) as Array<{
    body1: string; body2: string; type: string; orb: string; strength?: number;
  }>;

  if (planets.length === 0 || houses.length === 0) {
    return (
      <div className="card-bordered p-6 flex items-center justify-center" style={{ minHeight: 280 }}>
        <p className="text-warm-gray text-[13px]">Enter birth time and location for full chart.</p>
      </div>
    );
  }

  /* -- ASC rotation -- */
  const ascLon = anglesData?.ascendant?.longitude ?? 0;
  const off = 180 - ascLon;
  const adj = (d: number) => ((d + off) % 360 + 360) % 360;

  /* ============= SIGN RING ============= */
  const signs: React.ReactNode[] = [];
  for (let i = 0; i < 12; i++) {
    const sa = adj(i * 30);
    const ea = adj((i + 1) * 30);
    const ma = adj(i * 30 + 15);
    const mp = polar(ma, (R_SIGN_OUT + R_SIGN_IN) / 2);

    // alternating sector fill
    signs.push(
      <path key={`sb${i}`} d={arcD(sa, ea, R_SIGN_OUT, R_SIGN_IN)}
        fill={i % 2 === 0 ? "rgba(255,229,102,0.07)" : "rgba(17,17,17,0.015)"}
        stroke="none" />
    );
    // sign divider
    const d1 = polar(sa, R_SIGN_OUT), d2 = polar(sa, R_SIGN_IN);
    signs.push(
      <line key={`sd${i}`} x1={d1.x} y1={d1.y} x2={d2.x} y2={d2.y}
        stroke="#D8D6D0" strokeWidth="0.6" />
    );
    // zodiac glyph
    const gs = 14;
    signs.push(
      <g key={`sg${i}`} transform={`translate(${mp.x - gs / 2},${mp.y - gs / 2}) scale(${gs / 16})`}>
        <path d={SIGN_GLYPHS[i]} fill="none"
          stroke={i % 2 === 0 ? "#222" : "#888"}
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  }

  /* ============= HOUSES ============= */
  const sortedH = [...houses].sort((a, b) => a.number - b.number);
  const houseEls: React.ReactNode[] = [];
  sortedH.forEach((h) => {
    const a = adj(h.longitude);
    const p1 = polar(a, R_SIGN_IN);
    const p2 = polar(a, R_INNER);
    const isAng = [1, 4, 7, 10].includes(h.number);

    houseEls.push(
      <line key={`hl${h.number}`}
        x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
        stroke={isAng ? "#111" : "#E0DED8"}
        strokeWidth={isAng ? "1.4" : "0.5"} />
    );

    // house number
    const next = sortedH.find((x) => x.number === (h.number % 12) + 1);
    if (next) {
      let mid = (h.longitude + next.longitude) / 2;
      if (Math.abs(h.longitude - next.longitude) > 180) mid += 180;
      const np = polar(adj(mid), R_HOUSE_NUM);
      houseEls.push(
        <text key={`hn${h.number}`} x={np.x} y={np.y}
          textAnchor="middle" dominantBaseline="central"
          fontSize="9" fill="#BBB" fontWeight="600"
          fontFamily="var(--font-display)">{h.number}</text>
      );
    }
  });

  /* ============= ANGLE LABELS ============= */
  const angEls: React.ReactNode[] = [];
  const angList = [
    { k: "ascendant", l: "ASC" },
    { k: "midheaven", l: "MC" },
    { k: "descendant", l: "DSC" },
    { k: "imumCoeli", l: "IC" },
  ];
  angList.forEach(({ k, l }) => {
    const d = anglesData[k];
    if (!d) return;
    const a = adj(d.longitude);
    const o = polar(a, R_OUTER + 2);
    const i2 = polar(a, R_INNER);
    const lp = polar(a, R_OUTER + 14);
    angEls.push(
      <g key={`ag${k}`}>
        <line x1={o.x} y1={o.y} x2={i2.x} y2={i2.y}
          stroke="#FFE566" strokeWidth="1.8" />
        <rect x={lp.x - 14} y={lp.y - 7} width="28" height="14"
          rx="4" fill="#111" />
        <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="central"
          fontSize="7.5" fill="#FFE566" fontWeight="800"
          fontFamily="var(--font-display)">{l}</text>
      </g>
    );
  });

  /* ============= PLANETS ============= */
  const pItems = planets.map((p) => ({
    angle: adj(p.longitude),
    name: p.name,
    retro: p.isRetrograde,
    sign: p.sign,
    house: p.house,
    deg: p.degree,
    lon: p.longitude,
  }));
  const resolved = spreadPlanets(pItems);

  const pPos: Record<string, { x: number; y: number }> = {};
  const planetEls: React.ReactNode[] = [];

  resolved.forEach((p) => {
    const pos = polar(p.displayAngle, p.r);
    pPos[p.name] = pos;
    const label = P_INFO[p.name] || p.name.slice(0, 2);

    // thin connector line to actual ecliptic position
    const actualPt = polar(adj(p.lon), R_SIGN_IN - 3);
    planetEls.push(
      <line key={`pc${p.name}`}
        x1={pos.x} y1={pos.y} x2={actualPt.x} y2={actualPt.y}
        stroke="#D8D6D0" strokeWidth="0.5" />
    );

    // planet circle
    planetEls.push(
      <g key={`pp${p.name}`}>
        <circle cx={pos.x} cy={pos.y} r={PLANET_CIRCLE_R}
          fill="#111" stroke="#FFE566" strokeWidth="1.2" />
        <text x={pos.x} y={pos.y + 0.5}
          textAnchor="middle" dominantBaseline="central"
          fontSize="8.5" fill="white" fontWeight="700"
          fontFamily="var(--font-display)">{label}</text>
        {p.retro && (
          <>
            <circle cx={pos.x + PLANET_CIRCLE_R - 1} cy={pos.y - PLANET_CIRCLE_R + 1}
              r="5" fill="#D04040" />
            <text x={pos.x + PLANET_CIRCLE_R - 1} y={pos.y - PLANET_CIRCLE_R + 1.5}
              textAnchor="middle" dominantBaseline="central"
              fontSize="6" fill="white" fontWeight="800">R</text>
          </>
        )}
      </g>
    );
  });

  /* ============= ASPECTS ============= */
  const aspEls: React.ReactNode[] = [];
  aspects.slice(0, 14).forEach((a, i) => {
    const p1 = pPos[a.body1], p2 = pPos[a.body2];
    if (!p1 || !p2) return;
    const st = A_STYLE[a.type.toLowerCase()] || { c: "#CCC" };
    aspEls.push(
      <line key={`as${i}`}
        x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
        stroke={st.c} strokeWidth="0.8"
        strokeDasharray={st.d} opacity="0.35" />
    );
  });

  /* ============= DEGREE TICKS ============= */
  const ticks: React.ReactNode[] = [];
  for (let d = 0; d < 360; d += 5) {
    const a = adj(d);
    const isMajor = d % 30 === 0;
    const o = polar(a, R_SIGN_OUT);
    const i2 = polar(a, R_SIGN_OUT - (isMajor ? 6 : 3));
    ticks.push(
      <line key={`tk${d}`}
        x1={o.x} y1={o.y} x2={i2.x} y2={i2.y}
        stroke={isMajor ? "#AAA" : "#D0D0D0"} strokeWidth={isMajor ? "0.6" : "0.3"} />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main Chart SVG */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        className="card-bordered p-3"
      >
        <svg width="100%" viewBox={`0 0 ${W} ${W}`} className="block">
          {/* Structural circles */}
          <circle cx={CX} cy={CY} r={R_OUTER} fill="none" stroke="#E0DED8" strokeWidth="0.6" />
          <circle cx={CX} cy={CY} r={R_SIGN_OUT} fill="none" stroke="#D8D6D0" strokeWidth="0.4" />
          <circle cx={CX} cy={CY} r={R_SIGN_IN} fill="none" stroke="#C8C6C0" strokeWidth="1" />
          <circle cx={CX} cy={CY} r={R_INNER} fill="none" stroke="#E0DED8" strokeWidth="0.5" />

          {/* Degree ticks */}
          {ticks}

          {/* Sign sectors + glyphs */}
          {signs}

          {/* House cusps */}
          {houseEls}

          {/* Aspect lines (behind planets) */}
          {aspEls}

          {/* Angle axis lines + labels */}
          {angEls}

          {/* Planet circles */}
          {planetEls}

          {/* Center */}
          <circle cx={CX} cy={CY} r={R_CENTER} fill="#111" />
          <image href="/logo.png" x={CX - 15} y={CY - 15} width="30" height="30" />
        </svg>
      </motion.div>

      {/* Chart Angles */}
      {!!anglesData.ascendant && (
        <div className="card-dark p-4">
          <h4 className="text-[13px] font-700 text-white mb-3">Chart Angles</h4>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { label: "Ascendant (Rising)", data: anglesData.ascendant },
              { label: "Midheaven (MC)", data: anglesData.midheaven },
              { label: "Descendant (DC)", data: anglesData.descendant },
              { label: "Imum Coeli (IC)", data: anglesData.imumCoeli },
            ].filter((a) => a.data).map((angle) => (
              <div key={angle.label} className="bg-white/6 rounded-[12px] px-3 py-2.5">
                <p className="text-[10px] text-white/40 font-600 mb-1">{angle.label}</p>
                <p className="text-[13px] font-700 text-white">{angle.data.sign}</p>
                <p className="text-[10px] text-white/50 font-500">{angle.data.degree}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Planet Positions */}
      <div className="card-bordered p-4">
        <h4 className="section-title mb-3">Planet Positions</h4>
        <div className="grid grid-cols-1 gap-0">
          {planets.map((p) => (
            <div key={p.name} className="flex items-center gap-3 py-2.5 border-b border-border-light last:border-0">
              <div className="w-[34px] h-[34px] rounded-full bg-warm-black flex items-center justify-center shrink-0">
                <span className="text-[10px] font-800 text-pastel-yellow">
                  {(P_INFO[p.name] || p.name.slice(0, 2))}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-700 text-warm-black">{p.name}</span>
                  {p.isRetrograde && (
                    <span className="text-[8px] font-800 text-white bg-red-500 w-[14px] h-[14px] rounded-full flex items-center justify-center">R</span>
                  )}
                </div>
                <p className="text-[11px] text-warm-gray font-500">
                  {p.sign} &middot; House {p.house}
                </p>
              </div>
              <span className="text-[11px] text-medium-gray font-600 tabular-nums shrink-0">{p.degree}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Key Aspects */}
      {aspects.length > 0 && (
        <div className="card-bordered p-4">
          <h4 className="section-title mb-3">Key Aspects</h4>
          <div className="flex flex-col gap-0">
            {aspects.slice(0, 10).map((a, i) => {
              const col = A_STYLE[a.type.toLowerCase()]?.c || "#999";
              return (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border-light last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[12px] font-700 text-warm-black">{a.body1}</span>
                    <span className="text-[9px] font-700 px-2 py-0.5 rounded-full"
                      style={{ background: `${col}18`, color: col, border: `1px solid ${col}30` }}>
                      {a.type}
                    </span>
                    <span className="text-[12px] font-700 text-warm-black">{a.body2}</span>
                  </div>
                  <span className="text-[10px] text-warm-gray tabular-nums shrink-0">
                    orb {a.orb}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart Balance */}
      {!!birthChartData.summary && (() => {
        const summary = birthChartData.summary as Record<string, unknown>;
        return (
          <div className="card-accent p-4">
            <h4 className="section-title mb-3">Chart Balance</h4>
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[11px] font-600 text-warm-gray mb-2">Elements</p>
                <div className="flex flex-col gap-2">
                  {Object.entries((summary.elements as Record<string, number>) || {}).map(([el, count]) => (
                    <div key={el}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-600 text-warm-black capitalize">{el}</span>
                        <span className="text-[11px] text-warm-gray font-500">{count}</span>
                      </div>
                      <div className="w-full h-1.5 bg-border-soft rounded-full overflow-hidden">
                        <div className="h-full bg-warm-black rounded-full transition-all"
                          style={{ width: `${Math.min(100, (count / 10) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-600 text-warm-gray mb-2">Modalities</p>
                <div className="flex flex-col gap-2">
                  {Object.entries((summary.modalities as Record<string, number>) || {}).map(([mod, count]) => (
                    <div key={mod}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-600 text-warm-black capitalize">{mod}</span>
                        <span className="text-[11px] text-warm-gray font-500">{count}</span>
                      </div>
                      <div className="w-full h-1.5 bg-border-soft rounded-full overflow-hidden">
                        <div className="h-full bg-pastel-yellow rounded-full transition-all"
                          style={{ width: `${Math.min(100, (count / 10) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default BirthChartWheel;
