/** Runtime math. Efficiency is applied exactly once:
 *    net target:   T = Dnet / (E × PR) × 60
 *    gross target: T = Dgross / PR × 60                    [in, in/hr → minutes] */
export const MAX_ZONE_MINUTES = 90;
export const SOAK_MINUTES = 30;

export function runtimeFromNet(netIn: number, efficiency: number, precipRateInHr: number): number {
  if (!(efficiency > 0 && efficiency <= 1)) throw new Error('Efficiency must be between 0 and 1.');
  if (!(precipRateInHr > 0)) throw new Error('Precipitation rate must be positive.');
  if (netIn < 0) throw new Error('Depth cannot be negative.');
  return (netIn / (efficiency * precipRateInHr)) * 60;
}

export function runtimeFromGross(grossIn: number, precipRateInHr: number): number {
  if (!(precipRateInHr > 0)) throw new Error('Precipitation rate must be positive.');
  if (grossIn < 0) throw new Error('Depth cannot be negative.');
  return (grossIn / precipRateInHr) * 60;
}

export const grossFromNet = (netIn: number, efficiency: number) => netIn / efficiency;

/** Split into cycles when sprinklers apply water faster than the soil can take it in. */
export function splitCycles(totalMin: number, precipRateInHr: number, infiltrationInHr: number) {
  if (totalMin <= 0) return { cycles: 0, perCycle: 0, soak: 0 };
  if (precipRateInHr <= infiltrationInHr || totalMin < 8) return { cycles: 1, perCycle: totalMin, soak: 0 };
  const cycles = Math.min(4, Math.ceil(precipRateInHr / infiltrationInHr), Math.floor(totalMin / 4));
  return cycles <= 1 ? { cycles: 1, perCycle: totalMin, soak: 0 } : { cycles, perCycle: totalMin / cycles, soak: SOAK_MINUTES };
}

/** Catch-can test: average collected depth (in) ÷ run time (hours). */
export function catchCanRate(depthsIn: number[], minutes: number): number {
  const valid = depthsIn.filter((d) => Number.isFinite(d) && d >= 0);
  if (valid.length < 3) throw new Error('Use at least 3 cans.');
  if (!(minutes > 0)) throw new Error('Enter the run time in minutes.');
  const avg = valid.reduce((s, d) => s + d, 0) / valid.length;
  if (avg <= 0) throw new Error('The cans collected no water; check the test.');
  return avg / (minutes / 60);
}
