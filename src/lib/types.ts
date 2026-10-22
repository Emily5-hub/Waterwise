/** Shared data models. Internal science uses metric units (°C, m/s, mm, MJ/m²);
 *  lawn depths and runtimes use inches and minutes; the UI shows US units. */

export type GrassType = 'bermuda' | 'st_augustine' | 'kentucky_bluegrass' | 'fescue';
export type SoilTexture = 'sand' | 'loam' | 'clay';
export type SprinklerType = 'spray' | 'rotor' | 'drip';
export type GrowthState = 'auto' | 'active' | 'dormant';
export type PrecipRateSource = 'default' | 'catch_can' | 'manual';

export interface Zone {
  id: string;
  name: string;
  areaSqFt: number;
  grass: GrassType;
  soil: SoilTexture;
  sprinkler: SprinklerType;
  /** null = unknown; the labeled starter value for the sprinkler type is used. */
  precipRateInHr: number | null;
  precipRateSource: PrecipRateSource;
  /** null = use the labeled default application efficiency for the sprinkler type. */
  efficiency: number | null;
  slopeSensitive: boolean;
  growthState: GrowthState;
  kcOverride: number | null;
  rootDepthIn: number | null;
}

export interface Location {
  zip: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
  label: string;
  source: 'zip' | 'manual';
  /** Place names reported by the geocoder for the ZIP. A ZIP does not define a water-service area. */
  city?: string;
  county?: string;
  state?: string;
}


export interface Thresholds {
  windMph: number;
  freezeF: number;
  rainProbPct: number;
  preferredStart: string; // HH:MM local
  preferredEnd: string;   // HH:MM local
  mad: number;            // management-allowed depletion fraction p
}

export type RuleSource = 'municipal_unverified' | 'municipal_confirmed' | 'user';

export type RuleKind =
  | { type: 'seasonal_shutdown'; start: string; end: string } // MM-DD, inclusive, may wrap the new year
  | { type: 'weekday_blackout'; days: number[] }              // 0 = Sunday
  | { type: 'allowed_hours'; start: string; end: string }     // HH:MM, may wrap midnight
  | { type: 'odd_even'; allow31st: boolean }
  | { type: 'date_blackout'; from: string; to: string };      // YYYY-MM-DD inclusive

export interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  source: RuleSource;
  sourceNote: string;
  sourceUrl: string;
  kind: RuleKind;
}

export interface WaterLog {
  id: string;
  zoneId: string;
  date: string; // YYYY-MM-DD local
  time: string; // HH:MM local
  minutes: number;
  note: string;
}

export interface Profile {
  version: 1;
  onboarded: boolean;
  location: Location | null;
  zones: Zone[];
  rules: Rule[];
  thresholds: Thresholds;
  addressParity: 'odd' | 'even' | null;
  logs: WaterLog[];
  baselineMinutesPerSession: number;
  notificationsEnabled: boolean;
  useSampleData: boolean;
}

export interface HourlyPoint {
  time: string; // YYYY-MM-DDTHH:MM local wall time
  date: string;
  hour: number;
  tempC: number | null;
  rhPct: number | null;
  precipProbPct: number | null;
  precipMm: number | null;
  cloudPct: number | null;
  solarWm2: number | null;
  windMs: number | null; // 10 m
  gustMs: number | null;
}

export interface DailyWeather {
  date: string;
  kind: 'recent' | 'today' | 'forecast';
  tMaxC: number | null;
  tMinC: number | null;
  overnightMinC: number | null; // 00:00–08:00 local
  rhMax: number | null;
  rhMin: number | null;
  windMeanMs: number | null;
  gustMaxMs: number | null;
  precipMm: number | null;
  precipProbMaxPct: number | null;
  solarMJ: number | null;
  cloudMeanPct: number | null;
}

export interface WeatherData {
  source: string;
  isSample: boolean;
  fetchedAt: string; // ISO instant
  timezone: string;
  latitude: number;
  longitude: number;
  elevationM: number | null;
  today: string;
  hourly: HourlyPoint[];
  daily: DailyWeather[];
}
