import React, { useEffect, useState } from 'react';

export function ProjectCover({ screenshotUrl, repoFullName, source, title }: {
  screenshotUrl?: string | null;
  repoFullName?: string | null;
  source?: 'github' | 'manual';
  title: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [screenshotUrl, repoFullName, source]);
  const fallback = source !== 'manual' && repoFullName ? `https://opengraph.githubassets.com/1/${repoFullName}` : null;
  const src = screenshotUrl || fallback;
  if (!src || failed) return <span className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-stone-600 font-serif-body text-center" role="img" aria-label={`Project preview for ${title}`}><span className="font-newspaper-title font-bold uppercase text-sm">{title}</span><span className="text-xs">Project preview</span></span>;
  return <img width={1280} height={720} loading="lazy" decoding="async" src={src} alt={title} className="w-full h-full object-cover" onError={event => {
    if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback;
    else setFailed(true);
  }} />;
}
