import type { SystemId } from './systems';

/** Generic handheld and disc-console silhouettes, drawn as inline SVG. */
export function SystemArt({ id }: { id: SystemId }) {
  if (id === 'gba') {
    return (
      <svg viewBox="0 0 90 90" className="h-full w-full" aria-hidden="true">
        <rect width="90" height="90" fill="#1c1240" />
        <rect x="8" y="26" width="74" height="38" rx="16" fill="#7b5cff" />
        <rect x="28" y="31" width="34" height="26" rx="2" fill="#20203a" />
        <rect x="31" y="34" width="28" height="20" fill="#9bd86a" />
        <rect x="35" y="44" width="6" height="6" fill="#3a6a2a" />
        <rect x="45" y="38" width="10" height="4" fill="#3a6a2a" />
        <path d="M15 43 h4 v-4 h4 v4 h4 v4 h-4 v4 h-4 v-4 h-4z" fill="#2a1d6a" />
        <circle cx="70" cy="42" r="3" fill="#2a1d6a" />
        <circle cx="76" cy="47" r="3" fill="#2a1d6a" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 90 90" className="h-full w-full" aria-hidden="true">
      <rect width="90" height="90" fill="#0f1c33" />
      <rect x="10" y="40" width="70" height="26" rx="3" fill="#c9c9cf" />
      <rect x="10" y="40" width="70" height="4" fill="#a8a8b0" />
      <circle cx="35" cy="53" r="9" fill="#a8a8b0" />
      <circle cx="35" cy="53" r="3" fill="#c9c9cf" />
      <rect x="54" y="50" width="8" height="4" rx="1" fill="#8a8a94" />
      <rect x="66" y="50" width="8" height="4" rx="1" fill="#8a8a94" />
      <circle cx="45" cy="22" r="14" fill="#2f8fff" opacity="0.35" />
      <circle cx="45" cy="22" r="14" fill="none" stroke="#9cc7ff" strokeWidth="1.5" />
      <circle cx="45" cy="22" r="4" fill="#0f1c33" />
    </svg>
  );
}
