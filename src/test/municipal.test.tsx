import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { PAGES } from '../components/Nav';
import { geocodeZip } from '../lib/geocode';
import { RULE_TEMPLATES, evaluateRules, validateRule } from '../lib/rules';
import { withAreaRules } from '../lib/regions';
import type { Rule } from '../lib/types';
import { LEGACY_PROFILE_KEY, PROFILE_KEY, loadProfile, safeUrl } from '../lib/storage';
import { localParts } from '../lib/time';
import { AppProvider } from '../state';
import { DENVER, profileWith, weather } from './fixtures';

const today = localParts(new Date(), 'America/Denver').date;
const ok = (body: unknown) => async () => ({ ok: true, status: 200, json: async () => body });
const openMunicipal = () => fireEvent.click(within(screen.getByRole('navigation', { name: 'Main' })).getByRole('button', { name: 'Municipal Rules' }));

function renderApp(profile = profileWith({ location: { ...DENVER, city: 'Aurora', county: 'Arapahoe', state: 'Colorado' } })) {
  return render(<AppProvider initialProfile={profile} initialWeather={weather(today)}><App /></AppProvider>);
}

describe('rule templates', () => {
  it('are all valid, enabled and labeled unverified — never presented as confirmed law', () => {
    for (const t of RULE_TEMPLATES) {
      const r = t.make('x');
      expect(validateRule(r)).toBeNull();
      expect(r.source).toBe('municipal_unverified');
      expect(r.sourceNote).toMatch(/not (a verified local law|a statewide law)|Example only/i);
    }
  });
  it('the daytime template allows mornings and blocks midday deterministically', () => {
    const rule = RULE_TEMPLATES.find((t) => t.id === 'daytime')!.make('d');
    const r = evaluateRules([rule], '2026-07-07', null);
    expect(r.blocked).toBe(false);
    expect(r.allowedWindows).toEqual([[1080, 1440], [0, 600]]);
  });
  it('the Colorado example blocks Oct 1 but not Sep 30', () => {
    const rule = RULE_TEMPLATES.find((t) => t.id === 'colorado')!.make('c');
    expect(evaluateRules([rule], '2026-09-30', null).blocked).toBe(false);
    expect(evaluateRules([rule], '2026-10-01', null).blocked).toBe(true);
  });
});

describe('storage', () => {
  it('moves data saved under the old app name to the WaterWise key', () => {
    localStorage.setItem(LEGACY_PROFILE_KEY, JSON.stringify(profileWith()));
    const r = loadProfile();
    expect(r.profile.zones[0].id).toBe('z1');
    expect(localStorage.getItem(PROFILE_KEY)).not.toBeNull();
    expect(localStorage.getItem(LEGACY_PROFILE_KEY)).toBeNull();
  });
  it('only renders http(s) links', () => {
    expect(safeUrl('https://example.org')).toBe('https://example.org');
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('example.org')).toBeNull();
  });
});

describe('geocoder place names', () => {
  it('keeps city, county and state from the lookup for the Municipal tab', async () => {
    const loc = await geocodeZip('80012', ok({ results: [{ name: 'Aurora', admin1: 'Colorado', admin2: 'Arapahoe', latitude: 39.7, longitude: -104.84, timezone: 'America/Denver', country_code: 'US', postcodes: ['80012'] }] }));
    expect(loc).toMatchObject({ city: 'Aurora', county: 'Arapahoe', state: 'Colorado', label: 'Aurora, Colorado 80012' });
  });
});

describe('Municipal Rules tab', () => {
  it('is in the menu, grouped with setup pages', () => {
    expect(PAGES.find((p) => p.id === 'municipal')).toMatchObject({ label: 'Municipal Rules', group: 'Learn' });
  });

  it('shows the user’s county', () => {
    renderApp();
    openMunicipal();
    expect(screen.getByRole('heading', { level: 1, name: 'Municipal watering rules' })).toBeTruthy();
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/can’t verify local laws/i);
    expect(text).toMatch(/Arapahoe/);
    expect(text).toMatch(/Watering in Colorado/);
    expect(text).toMatch(/mulch/i);
    for (const removed of [/Your water provider/, /Rules in effect/, /Who sets watering rules/, /Questions to ask/, /Common kinds of rules/]) expect(text).not.toMatch(removed);
  });

  it('adapts the regional tips to the user’s state, with general tips when it’s unknown', () => {
    renderApp(profileWith({ location: { ...DENVER, label: 'Miami, Florida 33101', city: 'Miami', county: 'Miami-Dade', state: 'Florida' } }));
    openMunicipal();
    let text = document.body.textContent ?? '';
    expect(text).toMatch(/Watering in Florida/);
    expect(text).toMatch(/rain sensor/i);
    expect(text).not.toMatch(/Watering in Colorado/);
    cleanup(); localStorage.clear();
    renderApp(profileWith({ location: { ...DENVER, label: '39.700, -104.840', source: 'manual' } }));
    openMunicipal();
    text = document.body.textContent ?? '';
    expect(text).toMatch(/Watering tips/);
  });

  it('starts a rule from a template as unverified, and the rule then blocks days', () => {
    renderApp();
    openMunicipal();
    fireEvent.click(screen.getByRole('button', { name: 'Seasonal shutdown' }));
    const dialog = screen.getByRole('dialog', { name: 'New restriction' });
    expect((within(dialog).getByLabelText('Where it comes from') as HTMLSelectElement).value).toBe('municipal_unverified');
    fireEvent.click(screen.getByRole('button', { name: 'Save rule' }));
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY)!).rules;
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ source: 'municipal_unverified', kind: { type: 'seasonal_shutdown', start: '10-01' } });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getAllByText('Water provider rule (unverified)').length).toBeGreaterThan(0);
  });

  it('works for a manual-coordinate location with no place names', () => {
    renderApp(profileWith({ location: { ...DENVER, zip: null, source: 'manual', label: '39.70, -104.84' } }));
    openMunicipal();
    expect(document.body.textContent).toMatch(/No city or county is known/);
  });

});

describe('typical rules for the user’s area', () => {
  const colorado = { ...DENVER, city: 'Aurora', state: 'Colorado' };
  const florida = { ...DENVER, label: 'Miami, Florida 33101', city: 'Miami', state: 'Florida' };
  const mine: Rule = { id: 'mine', name: 'My rule', enabled: true, source: 'user', sourceNote: '', sourceUrl: '', kind: { type: 'weekday_blackout', days: [6] } }; // Saturdays; the test dates are midweek

  it('adds Colorado’s fall shutdown from the ZIP code, labeled typical and unverified', () => {
    const p = withAreaRules(profileWith({ location: colorado, areaRulesFor: null, rules: [mine] }));
    expect(p.areaRulesFor).toBe('Colorado');
    expect(p.rules.filter((r) => r.source === 'area_typical').length).toBeGreaterThan(0);
    expect(p.rules.every((r) => r.source === 'area_typical' ? /Typical for Colorado/.test(r.sourceNote) : true)).toBe(true);
    expect(evaluateRules(p.rules, '2026-10-01', null).blocked).toBe(true);
    expect(evaluateRules(p.rules, '2026-09-30', null).blocked).toBe(false);
    expect(p.rules).toContainEqual(mine); // the user's own rule stays
  });

  it('swaps the automatic rules when the location changes, keeps the user’s own, and respects deletions', () => {
    const co = withAreaRules(profileWith({ location: colorado, areaRulesFor: null, rules: [mine] }));
    const fl = withAreaRules({ ...co, location: florida });
    expect(fl.areaRulesFor).toBe('Florida');
    expect(evaluateRules(fl.rules, '2026-10-01', null).blocked).toBe(false); // no Colorado shutdown in Florida
    expect(fl.rules.find((r) => r.source === 'area_typical')?.kind).toMatchObject({ type: 'allowed_hours', start: '16:00', end: '10:00' });
    expect(fl.rules).toContainEqual(mine);
    const deleted = { ...fl, rules: fl.rules.filter((r) => r.source !== 'area_typical') };
    expect(withAreaRules(deleted).rules.some((r) => r.source === 'area_typical')).toBe(false);
  });

  it('adds nothing where there is no typical rule, and nothing for an unknown place', () => {
    expect(withAreaRules(profileWith({ location: { ...DENVER, label: 'Columbus, Ohio 43004', state: 'Ohio' }, areaRulesFor: null })).rules).toHaveLength(0);
    expect(withAreaRules(profileWith({ location: { ...DENVER, label: '39.700, -104.840', source: 'manual' }, areaRulesFor: null })).rules).toHaveLength(0);
  });

  it('shows the automatic rules on the page, with the option to add your own', () => {
    renderApp(withAreaRules(profileWith({ location: colorado, areaRulesFor: null })));
    openMunicipal();
    expect(screen.getByText(/Rules typical for/)).toBeTruthy();
    expect(screen.getAllByText('Typical for your area (unverified)').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Custom rule' })).toBeTruthy();
  });
});
