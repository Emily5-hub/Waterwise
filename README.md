# WaterWise

A weather-aware lawn watering Progressive Web App. It answers **“Should I water today?”** with WATER, SKIP (do not water) or DELAY, a best time, and a runtime per zone, and shows every assumption behind the answer.

WaterWise has no sensors and no hardware connection. It never shows soil moisture as measured; it shows an **estimated root-zone water deficit** with a range.

## Run it

Requires Node 18+.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 94 tests (Vitest + Testing Library), no network needed
npm run build      # production build in dist/ (service worker active here)
npm run preview    # serve the production build
```

No API keys, accounts or backend. Data stays in the browser’s local storage.

## Data sources

- **Open-Meteo Forecast API** (`api.open-meteo.com/v1/forecast`): hourly temperature, humidity, precipitation and its probability, cloud cover, shortwave radiation, wind and gusts; 7 past days + 7 forecast days, in the location’s time zone. Past days are model analysis, not rain-gauge readings, and are labeled that way.
- **Open-Meteo Geocoding API**: US ZIP → coordinates, time zone, city/county/state, accepted only when the result’s postcode matches.
- **Zippopotam.us** (fallback, no key): used only when Open-Meteo has no postcode match (its US postcode index is incomplete; e.g. 80012). The time zone then comes from the nearest same-name Open-Meteo place in the same state (within 60 km) or Open-Meteo’s `timezone=auto` lookup. Nothing is guessed: if neither yields a valid zone, the user is asked for coordinates.
- Free for non-commercial use without a key at the time of writing. Check Open-Meteo’s current terms and limits before any commercial or high-traffic use.

## How the recommendation works

Checks run in a fixed order; the first that blocks decides:

1. Restrictions you entered (seasonal shutdowns, weekday blackouts, allowed hours, odd/even, date ranges)
2. Freeze: forecast overnight low below 32 °F → FREEZE ALERT, do not water
3. Wind: above 15 mph in every suitable hour → do not water
4. Rain: likely forecast rain (≥ 60 % chance) that covers the estimated need → DELAY
5. Estimated deficit below the watering threshold (RAW) → do not water
6. Window: the calmest, coolest start in your preferred early-morning window
7. Runtime: `T = Dnet ÷ (E × PR) × 60`

Every threshold is editable in Settings and labeled a default, not a rule. The science (FAO-56 Penman–Monteith ET0 with Hargreaves fallback, crop coefficients, daily root-zone balance, effective rainfall) is documented in the in-app **Methodology** panel and in `src/lib/`.

## Pages

- **Calendar**: “Should I water today?” (WATER / SKIP / DELAY, start time, runtime), week/month calendar, and a narrow **Gardens & flowers** column with the best hand-watering time for beds, ignoring lawn rules.
- **Usage**: log watering, estimated gallons, avoided vs. a fixed Mon/Wed/Fri baseline, and **Water now, or wait?** (gallons wasted now vs. at the recommended time). The full math is written up in a separate Google Doc, “WaterWise: How the Math Works”.
- **Lawn Health**: Lawn Care 101 with real, credited Wikimedia Commons photos of common lawn problems, mistakes, seasons, and a lawn helper chat. With the user’s own Anthropic API key it uses Claude (`claude-opus-5-5`, called from the browser; text and photos); without one it answers from a built-in keyword guide, labeled “not AI”.
- **Municipal Rules**: area lookup, restrictions (pick a common rule type and fill it in a popup; all start unverified), and Colorado lawn and garden guidance.
- **Settings**: location, lawn details, notifications, data, and the optional AI helper key.

## Project layout

```
src/lib/        science and logic (no React): et0, balance, decision, rules, runtime, loss,
                assistant, weather, geocode, zip, usage, storage, notify, sample, units, time
src/pages/      Calendar, Usage, LawnHealth, Municipal, Settings, Onboarding
src/components/ navigation, brand art, forms, rules editor, methodology
src/test/       unit, engine and UI tests
public/         manifest, icon, service worker
```

## Status

**Implemented:** ZIP validation and geocoding (coordinate entry offered when a lookup fails); live Open-Meteo weather with timestamps, freshness and stale/offline handling; FAO-56 ET0; water balance with uncertainty ranges; the decision engine above; runtimes with split cycles; restriction rules with unverified templates; the five pages listed above; sprinkler evaporation/drift loss estimates; local persistence (older saved data migrates automatically); PWA manifest and offline app shell; optional browser notifications; labeled sample data.

**Configurable assumptions:** grass Kc and root depth, soil water-holding and intake values, sprinkler rates and efficiencies, allowed depletion, wind/freeze/rain thresholds, preferred window, hand-watering volumes, usage baseline.

**Known limitations:**
- The model is simplified and its starting soil water is assumed; logging watering is what keeps it honest.
- Forecast rain is counted all-or-nothing at the probability threshold.
- Notifications appear only while the app is open; there is no push server.
- The “Water now, or wait?” loss model is an approximation tuned to the range reported in sprinkler studies, not a measurement.
- The AI helper needs the user’s own Anthropic API key, stored in the browser and paid for by the user. Without it, the offline guide can’t read photos.
- No municipal rules are built in. The Municipal Rules tab explains who sets watering rules, offers unverified templates (daytime limit, assigned days, odd/even, Colorado fall shutdown example), stores your provider’s name/link and when you last checked, and previews the next 14 days under your rules. Users must confirm their own provider’s rules.
- County shown on the Municipal tab is that of the geocoder’s matched place; a ZIP can cross county lines and doesn’t define a water-service area.
- Rule exemptions (new sod, hand watering, drip) and drought-stage changes aren’t modeled automatically.
- Weather data and the app shell work offline from cache; a fresh forecast needs a connection.
