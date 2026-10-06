import { useId, useState } from 'react';
import { normalizeTechStack, TECH_STACK_SUGGESTIONS } from '../lib/techStack';

export function TechStackEditor({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  const id = useId();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const add = () => {
    try {
      onChange(normalizeTechStack([...value, draft]));
      setDraft(''); setError(null);
    } catch (err) { setError((err as Error).message); }
  };
  return (
    <div className="space-y-2 min-w-0">
      <label htmlFor={id} className="block text-xs font-headline uppercase font-bold">Tech Stack (Optional)</label>
      <p id={`${id}-help`} className="text-[11px] font-serif-body text-stone-600">Type up to 10 technologies, 30 characters each.</p>
      <div className="flex items-center gap-2">
        <input id={id} type="text" list={`${id}-completions`} value={draft} onChange={e => { setDraft(e.target.value); setError(null); }} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} aria-invalid={Boolean(error)} aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`} placeholder="Type a technology" className="paper-input min-w-0 flex-1 px-2.5 py-1.5 text-xs min-h-[34px]" />
        <datalist id={`${id}-completions`}>{TECH_STACK_SUGGESTIONS.filter(tech => draft.trim() && tech.toLowerCase().startsWith(draft.trim().toLowerCase()) && !value.some(selected => selected.toLowerCase() === tech.toLowerCase())).map(tech => <option key={tech} value={tech} />)}</datalist>
        <button type="button" onClick={add} className="paper-button text-xs font-bold px-3 py-1.5 min-h-[34px]">Add</button>
      </div>
      {error && <p id={`${id}-error`} role="alert" className="text-xs text-red-700">{error}</p>}
      <ul aria-label="Selected technologies" className="flex flex-wrap gap-2">
        {value.map(tech => <li key={tech} className="paper-badge inline-flex items-center gap-1 font-mono text-[10px] font-bold bg-stone-200 text-stone-800">
          {tech}<button type="button" aria-label={`Remove ${tech}`} onClick={() => { onChange(value.filter(item => item !== tech)); setError(null); }} className="min-w-[28px] min-h-[28px] text-sm">×</button>
        </li>)}
      </ul>
    </div>
  );
}
