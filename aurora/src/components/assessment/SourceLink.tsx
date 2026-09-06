'use client';

import { ExternalLink, AlertTriangle } from 'lucide-react';

interface SourceLinkProps {
  url: string | null;
  urlResolved: boolean;
  title?: string;
}

export function SourceLink({ url, urlResolved, title }: SourceLinkProps) {
  if (!url || !urlResolved) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
        <AlertTriangle className="h-3 w-3" />
        Source URL unresolved
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
    >
      <ExternalLink className="h-3 w-3" />
      {title || 'Open Original Source'}
    </a>
  );
}
