/** Editable starter assumptions. None of these are measured for your yard;
 *  the UI labels every one of them as a default. */
import type { GrassType, GrowthState, SoilTexture, SprinklerType, Zone } from './types';

export interface GrassProfile { label: string; season: 'warm' | 'cool'; kcActive: number; kcDormant: number; rootDepthIn: number; activeMonths: number[] }
export const GRASS: Record<GrassType, GrassProfile> = {
  bermuda: { label: 'Bermuda', season: 'warm', kcActive: 0.75, kcDormant: 0.6, rootDepthIn: 8, activeMonths: [5, 6, 7, 8, 9] },
  st_augustine: { label: 'St. Augustine', season: 'warm', kcActive: 0.75, kcDormant: 0.6, rootDepthIn: 8, activeMonths: [5, 6, 7, 8, 9] },
  kentucky_bluegrass: { label: 'Kentucky Bluegrass', season: 'cool', kcActive: 0.85, kcDormant: 0.6, rootDepthIn: 6, activeMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11] },
  fescue: { label: 'Fescue', season: 'cool', kcActive: 0.8, kcDormant: 0.6, rootDepthIn: 8, activeMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11] },
};

export interface SoilProfile { label: string; awcInPerIn: number; infiltrationInHr: number; peffFactor: number }
export const SOIL: Record<SoilTexture, SoilProfile> = {
  sand: { label: 'Sand', awcInPerIn: 0.06, infiltrationInHr: 1.0, peffFactor: 0.85 },
  loam: { label: 'Loam', awcInPerIn: 0.17, infiltrationInHr: 0.5, peffFactor: 0.75 },
  clay: { label: 'Clay', awcInPerIn: 0.16, infiltrationInHr: 0.15, peffFactor: 0.65 },
};

export interface SprinklerProfile { label: string; precipRateInHr: number; efficiency: number; note: string }
export const SPRINKLER: Record<SprinklerType, SprinklerProfile> = {
  spray: { label: 'Spray heads', precipRateInHr: 1.5, efficiency: 0.7, note: '' },
  rotor: { label: 'Rotor / rotary heads', precipRateInHr: 0.5, efficiency: 0.85, note: '' },
  drip: { label: 'Drip / subsurface', precipRateInHr: 0.4, efficiency: 0.9, note: 'Drip is not a typical lawn method; values vary widely by layout.' },
};

export const RAIN_THRESHOLD_IN = 0.1;

export function growthStateFor(zone: Zone, date: string): Exclude<GrowthState, 'auto'> {
  if (zone.growthState !== 'auto') return zone.growthState;
  return GRASS[zone.grass].activeMonths.includes(Number(date.slice(5, 7))) ? 'active' : 'dormant';
}

export function kcFor(zone: Zone, date: string): number {
  if (zone.kcOverride !== null) return zone.kcOverride;
  const g = GRASS[zone.grass];
  return growthStateFor(zone, date) === 'active' ? g.kcActive : g.kcDormant;
}

export function zoneParams(zone: Zone) {
  const s = SPRINKLER[zone.sprinkler];
  const soil = SOIL[zone.soil];
  const rootIn = zone.rootDepthIn ?? GRASS[zone.grass].rootDepthIn;
  return {
    precipRate: zone.precipRateInHr ?? s.precipRateInHr,
    precipRateIsDefault: zone.precipRateInHr === null,
    efficiency: zone.efficiency ?? s.efficiency,
    efficiencyIsDefault: zone.efficiency === null,
    rootIn,
    taw: rootIn * soil.awcInPerIn,
    soil,
  };
}
