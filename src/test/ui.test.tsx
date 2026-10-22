import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from '../App';
import { makeSampleWeather } from '../lib/sample';
import { PROFILE_KEY, defaultProfile } from '../lib/storage';
import { AppProvider } from '../state';
import { DENVER, profileWith, weather } from './fixtures';
import { localParts } from '../lib/time';

const today = localParts(new Date(), 'America/Denver').date;
const nav = () => within(screen.getByRole('navigation', { name: 'Main' }));
const go = (label: string) => fireEvent.click(nav().getByRole('button', { name: label }));

function renderApp(profile = profileWith(), w = weather(today)) {
  return render(<AppProvider initialProfile={profile} initialWeather={w}><App /></AppProvider>);
}

describe('app UI', () => {
  it('shows onboarding first, with ZIP validation before any lookup and no always-on coordinate link', () => {
    render(<AppProvider initialProfile={defaultProfile()}><App /></AppProvider>);
    expect(screen.queryByText(/Enter latitude and longitude instead/)).toBeNull();
    fireEvent.change(screen.getByLabelText('US ZIP code'), { target: { value: '8001' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find my location' }));
    expect(screen.getByRole('alert').textContent).toMatch(/US ZIP/);
  });

  it('is branded WaterWise, never AquaSprout', () => {
    renderApp();
    const text = document.body.textContent ?? '';
    expect(text).toMatch(/WaterWise/);
    expect(text).not.toMatch(/AquaSprout/i);
  });

  it('Calendar answers “Should I water today?” without the removed Zones and Why sections, and never claims measured soil moisture', () => {
    renderApp();
    expect(screen.getByRole('heading', { level: 1, name: 'Calendar' })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Should I water today?' })).toBeTruthy();
    const text = document.body.textContent ?? '';
    expect(text).toMatch(/Soil moisture isn’t measured/);
    expect(text).not.toMatch(/soil moisture[^.]*\d+\s*%/i);
    expect(screen.queryByRole('heading', { name: 'Zones' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Why' })).toBeNull();
    expect(text).not.toMatch(/chance ≠ amount|No watering recommended today|= straight from the weather forecast/);
    expect(screen.queryByText('Should I water today?')).toBeNull(); // the hero no longer repeats the question
    expect(screen.queryByText('Best time')).toBeNull();
  });

  it('shows a garden best-time column that ignores lawn rules', () => {
    renderApp();
    const aside = screen.getByRole('complementary', { name: 'Garden beds and flowers' });
    expect(aside.textContent).toMatch(/Lawn rules aren’t applied/);
  });

  it('menu has exactly Calendar, Usage, Lawn Health, Municipal Rules and Settings, and each opens', () => {
    renderApp();
    const labels = nav().getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent);
    for (const gone of ['Today', 'Weather Forecast', 'My Home']) expect(labels.some((l) => l?.startsWith(gone))).toBe(false);
    for (const [label, heading] of [['Usage', 'Usage'], ['Lawn Health', 'Lawn Health'], ['Municipal Rules', 'Municipal watering rules'], ['Settings', 'Settings'], ['Calendar', 'Calendar']]) {
      go(label);
      expect(screen.getByRole('heading', { level: 1, name: heading })).toBeTruthy();
    }
  });

  it('collapses the right-side menu', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse menu' }));
    expect(screen.getByRole('button', { name: 'Expand menu' }).getAttribute('aria-expanded')).toBe('false');
  });

  it('Usage has no Average Depth Applied, compares watering now with the recommended time, and logs “I watered today”', () => {
    renderApp();
    go('Usage');
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/average depth applied/i);
    expect(screen.getByRole('heading', { name: 'Water now, or wait?' })).toBeTruthy();
    expect(text).toMatch(/wasted/);
    for (const removed of [/How the math works/, /Stays in the root zone/, /Evaporates or blows away/]) expect(text).not.toMatch(removed);
    fireEvent.change(screen.getByLabelText('For (minutes)'), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log it' }));
    expect(screen.getByText(/Watered · 25 min/)).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(PROFILE_KEY)!).logs).toHaveLength(1);
  });

  it('Settings no longer shows safety thresholds, and lawn details can still be changed', () => {
    renderApp();
    go('Settings');
    expect(screen.queryByText('Safety and decision thresholds')).toBeNull();
    expect(screen.queryByText('Methodology')).toBeNull();
    expect(screen.getByLabelText('Anthropic API key')).toBeTruthy(); // the AI key lives here now
    fireEvent.change(screen.getByLabelText('Grass type'), { target: { value: 'fescue' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save lawn' }));
    expect(JSON.parse(localStorage.getItem(PROFILE_KEY)!).zones[0].grass).toBe('fescue');
  });

  it('Lawn Health answers offline from the built-in guide, clearly labeled as not AI', () => {
    renderApp();
    go('Lawn Health');
    expect(screen.getByText('Offline guide (not AI)')).toBeTruthy();
    expect(screen.queryByLabelText('Anthropic API key')).toBeNull();
    const photos = screen.getAllByRole('img').filter((i) => i.tagName === 'IMG' && /wikimedia\.org/.test(i.getAttribute('src') ?? ''));
    expect(photos.length).toBeGreaterThanOrEqual(5);
    for (const p of photos) expect(p.getAttribute('alt')).toBeTruthy();
    expect(document.body.textContent).toMatch(/via Wikimedia Commons/);
    fireEvent.change(screen.getByLabelText('Describe your lawn problem'), { target: { value: 'There are mushrooms and the grass is soggy' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(screen.getByText(/From the built-in guide \(not AI\)/)).toBeTruthy();
    expect(screen.getAllByText('Overwatering').length).toBeGreaterThan(0);
  });

  it('labels sample data as sample, not live', () => {
    renderApp(profileWith({ useSampleData: true }), makeSampleWeather(DENVER));
    expect(screen.getAllByText(/Sample data/).length).toBeGreaterThan(0);
  });
});
