export const DEFAULT_BACK_FALLBACK = '/(app)';

export type BackAction = { type: 'back' } | { type: 'replace'; href: string };

// Dynamic back: pop real history when it exists; the fallback only covers an
// empty stack (cold start / future deep links), never routing decisions.
export function resolveBackAction(
  canGoBack: boolean,
  fallback: string = DEFAULT_BACK_FALLBACK,
): BackAction {
  return canGoBack ? { type: 'back' } : { type: 'replace', href: fallback };
}
