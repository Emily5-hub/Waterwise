import { describe, expect, it } from 'vitest';
import { ExpertState, initialState, respond, scoreText } from '../lib/lawnExpert/engine';
import { ExpertContext, TUTORIALS, seedTiming } from '../lib/lawnExpert/tutorials';
import { GUIDE_PHOTOS } from '../lib/photos';

const ctx: ExpertContext = { grass: 'Kentucky Bluegrass', season: 'cool', month: 9, state: 'Colorado', hotF: 80, rainDay: null };

/** Runs a whole conversation and returns the final state plus every reply. */
function chat(lines: string[], c = ctx) {
  let s: ExpertState = initialState();
  const all = [];
  for (const l of lines) { const r = respond(l, s, c); s = r.state; all.push(...r.replies); }
  return { s, replies: all, last: all[all.length - 1] };
}

describe('lawn helper library', () => {
  it('has complete tutorials with working photo links', () => {
    expect(TUTORIALS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(TUTORIALS.map((t) => t.id)).size).toBe(TUTORIALS.length);
    for (const t of TUTORIALS) {
      expect(t.steps.length).toBeGreaterThanOrEqual(3);
      expect(t.need.length).toBeGreaterThan(0);
      expect(t.prevent.length).toBeGreaterThan(0);
      if (t.photo) expect(GUIDE_PHOTOS[t.photo]).toBeTruthy();
    }
  });
  it('times seeding by grass type and month', () => {
    expect(seedTiming(ctx)).toMatch(/Now is the best time/);
    expect(seedTiming({ ...ctx, hotF: 95 })).toMatch(/wait for a cooler stretch/);
    expect(seedTiming({ ...ctx, season: 'warm', grass: 'Bermuda', month: 1 })).toMatch(/late spring/);
  });
});

describe('lawn helper conversation', () => {
  it('goes straight to a tutorial when the description is clear', () => {
    const { s, replies } = chat(['There are mushrooms everywhere, the ground is soggy and spongy and there are puddles']);
    expect(s.current).toBe('overwater');
    expect(replies.some((r) => r.tutorialId === 'overwater')).toBe(true);
  });

  it('asks a follow-up question when the description is vague, then uses the tapped answer', () => {
    const first = chat(['My grass is turning brown in patches']);
    expect(first.s.phase).toBe('asking');
    expect(first.last.chips?.length).toBeGreaterThan(1);
    // Tap the first answer each time: it never asks more than 3 questions before showing a fix.
    let s = first.s, last = first.last;
    for (let i = 0; i < 3 && s.phase === 'asking'; i++) { const r = respond(last.chips![0], s, ctx); s = r.state; last = r.replies[r.replies.length - 1]; }
    expect(s.phase).toBe('tutorial');
    expect(s.asked.length).toBeLessThanOrEqual(3);
  });

  it('a tug test that peels up like carpet points to grubs', () => {
    const { s } = chat(['My grass is dying in patches', 'It peels up like carpet']);
    expect(s.asked.length).toBe(1); // it asked before guessing
    expect(s.current).toBe('grubs');
  });

  it('understands typed answers, not just the buttons', () => {
    let s = respond('brown spots in the lawn', initialState(), ctx).state;
    for (let i = 0; i < 4 && s.phase === 'asking'; i++) s = respond('yes, where my dog pees, with a dark green ring', s, ctx).state;
    expect(s.current).toBe('dog');
  });

  it('answers follow-up questions about the fix', () => {
    const base = ['Yellow spots where my dog goes, with a dark green ring around them'];
    expect(chat([...base, 'What do I need?']).last.text).toMatch(/you’ll need/i);
    expect(chat([...base, 'How long will it take?']).last.text).toMatch(/Plan on/);
    expect(chat([...base, 'When should I do it?']).last.text).toMatch(/best time to seed/i);
    expect(chat([...base, 'Where do I start?']).last.text).toMatch(/Step 1 of/);
    expect(chat([...base, 'Where do I start?', 'next']).last.text).toMatch(/Step 2 of/);
    expect(chat([...base, 'Is it safe for pets?']).last.text).toMatch(/safe/i);
  });

  it('offers the next most likely cause on “what else could it be?”', () => {
    const { s } = chat(['brown circles with a ring that keep spreading in humid weather', 'What else could it be?']);
    expect(s.shown.length).toBeGreaterThanOrEqual(2);
    expect(s.shown[0]).not.toBe(s.shown[1]);
  });

  it('switches to a new problem mid-conversation, and can start over', () => {
    const { s } = chat(['Yellow spots where my dog goes, with a dark green ring', 'Also there are raised ridges and dirt mounds all over the yard from tunnels']);
    expect(s.current).toBe('mole');
    expect(chat(['Yellow spots where my dog goes', 'start over']).s.phase).toBe('idle');
  });

  it('asks for more detail when it can’t tell, and stays on topic', () => {
    expect(chat(['it looks bad']).last.chips).toContain('Thin or bare spots');
    expect(chat(['what is the capital of France']).last.text).toMatch(/only help with lawns/);
    expect(chat(['hello']).last.text).toMatch(/What’s going on/);
  });

  it('weights multi-word clues above single words', () => {
    const s = scoreText('the grass peels back like a carpet');
    expect(Object.entries(s).sort((a, b) => b[1] - a[1])[0][0]).toBe('grubs');
  });
});
