import { calculateChart } from "celestine";

export interface ChartPlanet {
  name: string;
  sign: string;
  degree: string;
  house: number;
  isRetrograde: boolean;
  longitude: number;
}

export interface ChartHouse {
  number: number;
  sign: string;
  degree: string;
  longitude: number;
}

export interface ChartAspect {
  body1: string;
  body2: string;
  type: string;
  symbol: string;
  orb: string;
  strength: number;
}

export interface ChartAngles {
  ascendant: { sign: string; degree: string; longitude: number };
  midheaven: { sign: string; degree: string; longitude: number };
  descendant: { sign: string; degree: string; longitude: number };
  imumCoeli: { sign: string; degree: string; longitude: number };
}

export interface ChartSummary {
  elements: Record<string, number>;
  modalities: Record<string, number>;
  retrograde: string[];
  patterns: string[];
  dignified: {
    domicile: string[];
    exalted: string[];
    detriment: string[];
    fall: string[];
  };
}

export interface BirthChartResult {
  planets: ChartPlanet[];
  houses: ChartHouse[];
  aspects: ChartAspect[];
  angles: ChartAngles;
  summary: ChartSummary;
  raw: {
    planetLongitudes: Record<string, number>;
    cusps: number[];
  };
}

export function computeBirthChart(data: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  latitude: number;
  longitude: number;
  timezone: number;
}): BirthChartResult {
  const chart = calculateChart(
    {
      year: data.year,
      month: data.month,
      day: data.day,
      hour: data.hour,
      minute: data.minute,
      second: 0,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
    },
    {
      houseSystem: "placidus",
      includeAsteroids: true,
      includeChiron: true,
      includeNodes: "true",
      includeLilith: "mean",
    }
  );

  // Map planets
  const planets: ChartPlanet[] = chart.planets.map((p) => ({
    name: p.name,
    sign: p.signName,
    degree: p.formatted,
    house: p.house,
    isRetrograde: p.isRetrograde,
    longitude: p.longitude,
  }));

  // Map houses
  const houses: ChartHouse[] = chart.houses.cusps.map((c) => ({
    number: c.house,
    sign: c.signName,
    degree: c.formatted,
    longitude: c.longitude,
  }));

  // Map aspects (top 20)
  const aspects: ChartAspect[] = chart.aspects.all.slice(0, 20).map((a) => ({
    body1: a.body1,
    body2: a.body2,
    type: a.type,
    symbol: a.symbol,
    orb: a.deviation.toFixed(1),
    strength: a.strength,
  }));

  // Map angles
  const mapAngle = (a: typeof chart.angles.ascendant) => ({
    sign: a.signName,
    degree: a.formatted,
    longitude: a.longitude,
  });

  const angles: ChartAngles = {
    ascendant: mapAngle(chart.angles.ascendant),
    midheaven: mapAngle(chart.angles.midheaven),
    descendant: mapAngle(chart.angles.descendant),
    imumCoeli: mapAngle(chart.angles.imumCoeli),
  };

  // Map summary
  const summary: ChartSummary = {
    elements: chart.summary.elements as unknown as Record<string, number>,
    modalities: chart.summary.modalities as unknown as Record<string, number>,
    retrograde: chart.summary.retrograde,
    patterns: chart.summary.patterns,
    dignified: {
      domicile: chart.summary.dignified.domicile,
      exalted: chart.summary.dignified.exalted,
      detriment: chart.summary.dignified.detriment,
      fall: chart.summary.dignified.fall,
    },
  };

  // Build raw data for visualization
  const planetLongitudes: Record<string, number> = {};
  planets.forEach((p) => { planetLongitudes[p.name] = p.longitude; });
  const cusps = houses.map((h) => h.longitude);

  return { planets, houses, aspects, angles, summary, raw: { planetLongitudes, cusps } };
}

export function chartToPromptText(chart: BirthChartResult): string {
  const lines: string[] = [];

  lines.push("=== BIRTH CHART ===");
  lines.push(`Ascendant (Rising): ${chart.angles.ascendant.degree} in ${chart.angles.ascendant.sign}`);
  lines.push(`Midheaven (MC): ${chart.angles.midheaven.degree} in ${chart.angles.midheaven.sign}`);
  lines.push("");

  lines.push("--- Planetary Positions ---");
  chart.planets.forEach((p) => {
    const retro = p.isRetrograde ? " (Retrograde)" : "";
    lines.push(`${p.name}: ${p.degree} in ${p.sign}, House ${p.house}${retro}`);
  });
  lines.push("");

  lines.push("--- Houses ---");
  chart.houses.forEach((h) => {
    lines.push(`House ${h.number}: ${h.degree} in ${h.sign}`);
  });
  lines.push("");

  if (chart.aspects.length > 0) {
    lines.push("--- Key Aspects ---");
    chart.aspects.forEach((a) => {
      lines.push(`${a.body1} ${a.symbol} ${a.body2} (${a.type}, orb: ${a.orb}, strength: ${a.strength}%)`);
    });
    lines.push("");
  }

  lines.push("--- Chart Summary ---");
  lines.push(`Elements: ${JSON.stringify(chart.summary.elements)}`);
  lines.push(`Modalities: ${JSON.stringify(chart.summary.modalities)}`);
  if (chart.summary.retrograde.length > 0) {
    lines.push(`Retrograde planets: ${chart.summary.retrograde.join(", ")}`);
  }
  if (chart.summary.dignified.domicile.length > 0) {
    lines.push(`Planets in domicile (strong): ${chart.summary.dignified.domicile.join(", ")}`);
  }
  if (chart.summary.dignified.exalted.length > 0) {
    lines.push(`Planets exalted: ${chart.summary.dignified.exalted.join(", ")}`);
  }
  if (chart.summary.patterns.length > 0) {
    lines.push(`Aspect patterns: ${chart.summary.patterns.join(", ")}`);
  }

  return lines.join("\n");
}
