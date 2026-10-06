import { useId, useMemo, useState } from 'react';
import { normalizeTechStack, TECH_STACK_SUGGESTIONS } from '../lib/techStack';

export function TechStackEditor({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  const id = useId();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const suggestions = useMemo(() => {
    const query = draft.trim().toLowerCase();
    if (!query) return [];
    return TECH_STACK_SUGGESTIONS.filter(tech => tech.toLowerCase().startsWith(query) && !value.some(selected => selected.toLowerCase() === tech.toLowerCase()));
  }, [draft, value]);
  const add = () => {
    try {
      onChange(normalizeTechStack([...value, suggestions[activeSuggestion] || draft]));
      setDraft(''); setError(null);
      setActiveSuggestion(0);
    } catch (err) { setError((err as Error).message); }
  };
  return (
    <div className="space-y-2 min-w-0">
      <label htmlFor={id} className="block text-xs font-headline uppercase font-bold">Tech Stack (Optional)</label>
      <p id={`${id}-help`} className="text-[11px] font-serif-body text-stone-600">Type up to 10 technologies, 30 characters each.</p>
      <div className="relative flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <input id={id} type="text" value={draft} autoComplete="off" onChange={e => { setDraft(e.target.value); setActiveSuggestion(0); setError(null); }} onKeyDown={e => {
            if (e.key === 'ArrowDown' && suggestions.length) { e.preventDefault(); setActiveSuggestion(index => (index + 1) % suggestions.length); }
            else if (e.key === 'ArrowUp' && suggestions.length) { e.preventDefault(); setActiveSuggestion(index => (index - 1 + suggestions.length) % suggestions.length); }
            else if (e.key === 'Escape') setDraft('');
            else if (e.key === 'Enter') { e.preventDefault(); add(); }
          }} aria-autocomplete="list" aria-controls={`${id}-completions`} aria-activedescendant={suggestions[activeSuggestion] ? `${id}-completion-${activeSuggestion}` : undefined} aria-invalid={Boolean(error)} aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`} placeholder="Type a technology" className="paper-input w-full px-2.5 py-1.5 text-xs min-h-[34px]" />
          {suggestions.length > 0 && (
            <ul id={`${id}-completions`} role="listbox" className="paper-autocomplete absolute left-0 right-0 top-full z-20 mt-1 p-1 bg-[#FEFCF6]">
              {suggestions.map((suggestion, index) => <li key={suggestion} id={`${id}-completion-${index}`} role="option" aria-selected={index === activeSuggestion}>
                <button type="button" className="paper-autocomplete-option w-full px-2 py-1.5 text-left text-xs font-mono" onMouseDown={e => e.preventDefault()} onClick={() => { setDraft(suggestion); setActiveSuggestion(0); }}>{suggestion}</button>
              </li>)}
            </ul>
          )}
        </div>
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
