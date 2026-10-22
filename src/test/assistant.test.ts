import { describe, expect, it } from 'vitest';
import { ASSISTANT_MODEL, GUIDE, LawnContext, clearAssistantKey, getAssistantKey, looksLikeKey, matchGuide, saveAssistantKey, systemPrompt } from '../lib/assistant';

const ctx: LawnContext = {
  location: 'Aurora, Colorado 80012', today: '2026-07-08', grass: 'Kentucky Bluegrass', soil: 'Clay', sprinkler: 'Spray heads', areaSqFt: 2000,
  growth: 'growing season', deficitIn: 0.62, thresholdIn: 0.51, recommendation: 'water around 5:00 AM', recentWeather: 'Today: high 91°F', rules: [],
};

describe('lawn assistant', () => {
  it('uses the current default Claude model', () => {
    expect(ASSISTANT_MODEL).toBe('claude-opus-5-5');
  });
  it('gives the model the lawn context, framed as estimates rather than measurements', () => {
    const p = systemPrompt(ctx);
    expect(p).toMatch(/Kentucky Bluegrass/);
    expect(p).toMatch(/Aurora, Colorado/);
    expect(p).toMatch(/Estimated root-zone water deficit: about 0\.62 in/);
    expect(p).toMatch(/never present it as a measurement/);
    expect(p).toMatch(/none entered/);
  });
  it('stores the key only in this browser and can remove it', () => {
    expect(getAssistantKey()).toBe('');
    saveAssistantKey('  sk-ant-api03-abcdefghijklmnopqrstuvwxyz  ');
    expect(getAssistantKey()).toBe('sk-ant-api03-abcdefghijklmnopqrstuvwxyz');
    clearAssistantKey();
    expect(getAssistantKey()).toBe('');
  });
  it('checks key shape before saving', () => {
    expect(looksLikeKey('sk-ant-api03-abcdefghijklmnopqrstuvwxyz')).toBe(true);
    expect(looksLikeKey('hello')).toBe(false);
  });
  it('offline guide matches common symptoms', () => {
    expect(matchGuide('big brown circles with a ring')[0].id).toBe('fungus');
    expect(matchGuide('turf peels back like carpet, birds digging')[0].id).toBe('grubs');
    expect(matchGuide('what is the capital of France')).toHaveLength(0);
    for (const g of GUIDE) expect(g.fixes.length).toBeGreaterThan(0);
  });
});
