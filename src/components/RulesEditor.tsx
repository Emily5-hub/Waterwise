import { AlertTriangle, CalendarClock, Clock, Hash, ListChecks, Plus, Snowflake } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { RULE_TEMPLATES, SOURCE_LABEL, WEEKDAYS, describeRule, validateRule } from '../lib/rules';
import { areaRules, regionTipsFor } from '../lib/regions';
import { newId, safeUrl } from '../lib/storage';
import type { Rule, RuleKind, RuleSource } from '../lib/types';
import { useApp } from '../state';
import { Badge, Button, Card, Field, IconChip, Modal, Tone } from './ui';

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
const TYPES: { icon: LucideIcon; tone: Tone; title: string; make: () => Rule }[] = [
  { icon: Clock, tone: 'sun', title: 'Time-of-day limit', make: () => fromTemplate('daytime') },
  { icon: CalendarClock, tone: 'violet', title: 'Assigned days', make: () => fromTemplate('assigned_days') },
  { icon: Hash, tone: 'sky', title: 'Odd/even addresses', make: () => fromTemplate('odd_even') },
  { icon: Snowflake, tone: 'teal', title: 'Seasonal shutdown', make: () => fromTemplate('colorado') },
  { icon: AlertTriangle, tone: 'coral', title: 'Drought restriction', make: () => ({ ...blank(defaultKind('date_blackout'), 'Drought restriction'), source: 'municipal_unverified' }) },
  { icon: Plus, tone: 'leaf', title: 'Custom rule', make: () => blank(defaultKind('weekday_blackout')) },
];

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
    <Card icon={ListChecks} tone="clay" title="Watering restrictions">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted">Add a rule</p>
      <ul className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
        {TYPES.map((t) => (
          <li key={t.title}>
            <button onClick={() => open(t.make())} className="flex w-full items-center gap-2 border-t border-ink/20 py-3 text-left text-sm font-semibold uppercase tracking-[0.1em] hover:text-forest">
              <IconChip icon={t.icon} tone={t.tone} size="sm" />{t.title}
            </button>
          </li>
        ))}
      </ul>

      {typical.length > 0 && (
        <div className="mt-10 border-l-2 border-amber py-1 pl-4 text-sm text-ink">
          {hasTypical
            ? <>Rules typical for <strong>{state}</strong> were added from your ZIP code. Your water provider’s may differ, so check them and edit or turn off any that don’t apply.</>
            : <>{state} has typical watering rules you can add as a starting point.</>}
          {!hasTypical && <div className="mt-2"><Button onClick={() => update((p) => ({ ...p, rules: [...p.rules, ...areaRules(state!)] }))}>Add {state}’s typical rules</Button></div>}
        </div>
      )}

      <ul className="mt-8 divide-y divide-line">
        {profile.rules.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-5 text-sm">
            <div className="min-w-0">
              <p className="font-semibold">{r.name} {!r.enabled && <Badge>Off</Badge>}</p>
              <p className="text-muted">{describeRule(r)}</p>
              <p className="mt-1"><Badge tone={r.source === 'municipal_confirmed' ? 'leaf' : r.source === 'municipal_unverified' || r.source === 'area_typical' ? 'amber' : 'neutral'}>{SOURCE_LABEL[r.source]}</Badge></p>
              {safeUrl(r.sourceUrl) && <a className="mt-1 inline-block text-xs font-semibold text-sky hover:underline" href={safeUrl(r.sourceUrl)!} target="_blank" rel="noopener noreferrer">Source link</a>}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" onClick={() => update((p) => ({ ...p, rules: p.rules.map((x) => (x.id === r.id ? { ...x, enabled: !x.enabled } : x)) }))}>{r.enabled ? 'Turn off' : 'Turn on'}</Button>
              <Button variant="ghost" onClick={() => open(r)}>Edit</Button>
              <Button variant="ghost" onClick={() => update((p) => ({ ...p, rules: p.rules.filter((x) => x.id !== r.id) }))}>Delete</Button>
            </div>
          </li>
        ))}
        {!profile.rules.length && <li className="py-5 text-sm text-muted">No restrictions yet.</li>}
      </ul>
      {profile.rules.some((r) => r.kind.type === 'odd_even') && <ParityField />}

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
    <div className="mt-3 max-w-xs">
      <Field label="House number is">{(id) => (
        <select id={id} value={profile.addressParity ?? ''} onChange={(e) => update((p) => ({ ...p, addressParity: (e.target.value || null) as 'odd' | 'even' | null }))}>
          <option value="">Not set</option><option value="odd">Odd</option><option value="even">Even</option>
        </select>)}</Field>
    </div>
  );
}
