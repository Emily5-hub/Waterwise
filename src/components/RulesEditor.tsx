import { AlertTriangle, CalendarClock, Clock, Hash, ListChecks, Plus, Snowflake } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { RULE_TEMPLATES, SOURCE_LABEL, WEEKDAYS, describeRule, validateRule } from '../lib/rules';
import { areaRules, regionTipsFor } from '../lib/regions';
import { newId, safeUrl } from '../lib/storage';
import type { Rule, RuleKind, RuleSource } from '../lib/types';
import { useApp } from '../state';
import { Button, Card, Field, Modal } from './ui';

const KIND_LABEL: Record<RuleKind['type'], string> = {
  seasonal_shutdown: 'Seasonal shutdown dates', weekday_blackout: 'No-watering weekdays', allowed_hours: 'Allowed time window',
  odd_even: 'Odd/even address days', date_blackout: 'Specific date range',
};
const defaultKind = (t: RuleKind['type']): RuleKind => ({
  seasonal_shutdown: { type: 'seasonal_shutdown', start: '10-01', end: '04-30' }, weekday_blackout: { type: 'weekday_blackout', days: [0] },
  allowed_hours: { type: 'allowed_hours', start: '18:00', end: '10:00' }, odd_even: { type: 'odd_even', allow31st: false },
  date_blackout: { type: 'date_blackout', from: '', to: '' },
} as Record<RuleKind['type'], RuleKind>)[t];

const blank = (kind: RuleKind, name = ''): Rule => ({ id: newId(), name, enabled: true, source: 'user', sourceNote: '', sourceUrl: '', kind });
const fromTemplate = (id: string) => RULE_TEMPLATES.find((t) => t.id === id)!.make(newId());

/** Common rule patterns; each opens the editor pre-filled. None is a verified local law. */
const TYPES: { icon: LucideIcon; title: string; make: () => Rule }[] = [
  { icon: Clock, title: 'Time-of-day limit', make: () => fromTemplate('daytime') },
  { icon: CalendarClock, title: 'Assigned days', make: () => fromTemplate('assigned_days') },
  { icon: Hash, title: 'Odd/even addresses', make: () => fromTemplate('odd_even') },
  { icon: Snowflake, title: 'Seasonal shutdown', make: () => fromTemplate('colorado') },
  { icon: AlertTriangle, title: 'Drought restriction', make: () => ({ ...blank(defaultKind('date_blackout'), 'Drought restriction'), source: 'municipal_unverified' }) },
  { icon: Plus, title: 'Custom rule', make: () => blank(defaultKind('weekday_blackout')) },
];
/** The big icon on each rule's card, matching the "Add a rule" choices. */
const KIND_ICON: Record<RuleKind['type'], LucideIcon> = {
  allowed_hours: Clock, weekday_blackout: CalendarClock, odd_even: Hash, seasonal_shutdown: Snowflake, date_blackout: AlertTriangle,
};

export function RulesEditor() {
  const { profile, update } = useApp();
  const [draft, setDraft] = useState<Rule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const open = (r: Rule) => { setDraft(r); setError(null); };
  const close = () => { setDraft(null); setError(null); };
  const save = () => {
    if (!draft) return;
    const err = validateRule(draft);
    if (err) return setError(err);
    update((p) => ({ ...p, rules: p.rules.some((r) => r.id === draft.id) ? p.rules.map((r) => (r.id === draft.id ? draft : r)) : [...p.rules, draft] }));
    close();
  };
  const k = draft?.kind;
  const editingExisting = !!draft && profile.rules.some((r) => r.id === draft.id);
  const state = profile.location ? regionTipsFor(profile.location).state : null;
  const typical = state ? areaRules(state) : [];
  const hasTypical = profile.rules.some((r) => r.source === 'area_typical');

  return (
    <Card icon={ListChecks} tone="clay" title="Watering restrictions" className="ww-rules">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Left: what applies here, then the kinds of rule you can add. */}
        <div>
          <h3 className="text-3xl font-bold leading-tight text-ink md:text-4xl">{typical.length ? `Rules for ${state}` : 'Your watering rules'}</h3>
          <p className="mt-4 text-base text-muted">
            {typical.length > 0
              ? (hasTypical
                ? <>Rules typical for <strong>{state}</strong> were added from your ZIP code. Your provider’s may differ: edit or turn off any that don’t apply.</>
                : <>{state} has typical rules you can start from.</>)
              : <>Add your water provider’s rules and WaterWise plans around them.</>}
          </p>
          {typical.length > 0 && !hasTypical && <div className="mt-4"><Button variant="primary" onClick={() => update((p) => ({ ...p, rules: [...p.rules, ...areaRules(state!)] }))}>Add {state}’s typical rules</Button></div>}
          <p className="mt-10 text-xs font-semibold uppercase tracking-[0.16em] text-muted">Add a rule</p>
          <ul className="mt-5 grid grid-cols-3 gap-x-4 gap-y-8">
            {TYPES.map((t) => (
              <li key={t.title}>
                <button onClick={() => open(t.make())} className="group flex w-full flex-col items-center gap-3 text-center">
                  <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-full bg-forest text-white shadow-md transition group-hover:scale-105"><t.icon className="h-[45%] w-[45%]" /></span>
                  <span className="text-sm font-bold text-ink group-hover:text-forest">{t.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: each rule in effect as a card. */}
        <div>
          <ul className="space-y-5">
            {profile.rules.map((r) => {
              const Icon = KIND_ICON[r.kind.type];
              return (
                <li key={r.id} className={`ww-leaf flex gap-5 bg-[#4a6a8c] p-6 text-white shadow-md md:p-7 ${r.enabled ? '' : 'opacity-75'}`}>
                  <Icon aria-hidden strokeWidth={1.5} className="h-14 w-14 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-bold leading-snug">{r.name}{!r.enabled && <span className="ml-2 align-middle text-[0.7rem] font-semibold uppercase tracking-[0.12em]">Off</span>}</p>
                    <p className="mt-1 text-sm">{describeRule(r)}</p>
                    <p className="mt-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-white/90">{SOURCE_LABEL[r.source]}</p>
                    {safeUrl(r.sourceUrl) && <a className="mt-1 inline-block text-xs font-semibold underline" href={safeUrl(r.sourceUrl)!} target="_blank" rel="noopener noreferrer">Source link</a>}
                    <div className="mt-3 flex flex-wrap gap-x-5">
                      <Button variant="ghost" className="!px-0 !text-white" onClick={() => update((p) => ({ ...p, rules: p.rules.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x)) }))}>{r.enabled ? 'Turn off' : 'Turn on'}</Button>
                      <Button variant="ghost" className="!px-0 !text-white" onClick={() => open(r)}>Edit</Button>
                      <Button variant="ghost" className="!px-0 !text-white" onClick={() => update((p) => ({ ...p, rules: p.rules.filter((x) => x.id !== r.id) }))}>Delete</Button>
                    </div>
                  </div>
                </li>
              );
            })}
            {!profile.rules.length && <li className="ww-leaf bg-[#4a6a8c] p-6 text-base text-white shadow-md md:p-7">No restrictions yet.</li>}
          </ul>
          {profile.rules.some((r) => r.kind.type === 'odd_even') && <ParityField />}
        </div>
      </div>

      {draft && k && (
        <Modal title={editingExisting ? 'Edit restriction' : 'New restriction'} onClose={close}>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Rule name">{(id) => <input id={id} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Summer schedule" />}</Field>
              <Field label="Type">{(id) => <select id={id} value={k.type} onChange={(e) => setDraft({ ...draft, kind: defaultKind(e.target.value as RuleKind['type']) })}>{Object.entries(KIND_LABEL).map(([t, l]) => <option key={t} value={t}>{l}</option>)}</select>}</Field>
            </div>
            {k.type === 'seasonal_shutdown' && <div className="grid gap-3 sm:grid-cols-2">
              <Field label="From (MM-DD, inclusive)">{(id) => <input id={id} value={k.start} onChange={(e) => setDraft({ ...draft, kind: { ...k, start: e.target.value } })} />}</Field>
              <Field label="Through (MM-DD, inclusive)">{(id) => <input id={id} value={k.end} onChange={(e) => setDraft({ ...draft, kind: { ...k, end: e.target.value } })} />}</Field></div>}
            {k.type === 'weekday_blackout' && <fieldset><legend className="mb-1 text-sm font-bold">No watering on</legend><div className="flex flex-wrap gap-2">{WEEKDAYS.map((d, i) => (
              <label key={d} className="flex items-center gap-1.5 py-1 pr-2 text-sm"><input type="checkbox" checked={k.days.includes(i)} onChange={(e) => setDraft({ ...draft, kind: { ...k, days: e.target.checked ? [...k.days, i] : k.days.filter((x) => x !== i) } })} />{d.slice(0, 3)}</label>))}</div></fieldset>}
            {k.type === 'allowed_hours' && <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Allowed from">{(id) => <input id={id} type="time" value={k.start} onChange={(e) => setDraft({ ...draft, kind: { ...k, start: e.target.value } })} />}</Field>
              <Field label="Allowed until">{(id) => <input id={id} type="time" value={k.end} onChange={(e) => setDraft({ ...draft, kind: { ...k, end: e.target.value } })} />}</Field></div>}
            {k.type === 'odd_even' && <>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={k.allow31st} onChange={(e) => setDraft({ ...draft, kind: { ...k, allow31st: e.target.checked } })} /> Watering allowed on the 31st</label>
              <ParityField />
            </>}
            {k.type === 'date_blackout' && <div className="grid gap-3 sm:grid-cols-2">
              <Field label="From">{(id) => <input id={id} type="date" value={k.from} onChange={(e) => setDraft({ ...draft, kind: { ...k, from: e.target.value } })} />}</Field>
              <Field label="To">{(id) => <input id={id} type="date" value={k.to} onChange={(e) => setDraft({ ...draft, kind: { ...k, to: e.target.value } })} />}</Field></div>}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Where it comes from" hint="Mark it confirmed only after checking your provider’s rules.">{(id) => <select id={id} value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value as RuleSource })}>{Object.entries(SOURCE_LABEL).map(([s, l]) => <option key={s} value={s}>{l}</option>)}</select>}</Field>
              <Field label="Source link (optional)">{(id) => <input id={id} value={draft.sourceUrl} onChange={(e) => setDraft({ ...draft, sourceUrl: e.target.value })} placeholder="https://" />}</Field>
            </div>
            {error && <p role="alert" className="text-sm font-bold text-alert">{error}</p>}
            <div className="flex gap-2 pt-1"><Button variant="primary" onClick={save}>Save rule</Button><Button onClick={close}>Cancel</Button></div>
          </div>
        </Modal>
      )}
    </Card>
  );
}

function ParityField() {
  const { profile, update } = useApp();
  return (
    <div className="mt-6 max-w-xs">
      <Field label="House number is">{(id) => (
        <select id={id} value={profile.addressParity ?? ''} onChange={(e) => update((p) => ({ ...p, addressParity: (e.target.value || null) as 'odd' | 'even' | null }))}>
          <option value="">Not set</option><option value="odd">Odd</option><option value="even">Even</option>
        </select>)}</Field>
    </div>
  );
}
