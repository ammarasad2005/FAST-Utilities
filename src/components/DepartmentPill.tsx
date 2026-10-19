const ACCENT: Record<string, { bg: string; text: string; ring: string }> = {
  CS: { bg: 'var(--accent-cs-bg)', text: 'var(--accent-cs)', ring: 'var(--accent-cs)' },
  AI: { bg: 'var(--accent-ai-bg)', text: 'var(--accent-ai)', ring: 'var(--accent-ai)' },
  DS: { bg: 'var(--accent-ds-bg)', text: 'var(--accent-ds)', ring: 'var(--accent-ds)' },
  CY: { bg: 'var(--accent-cy-bg)', text: 'var(--accent-cy)', ring: 'var(--accent-cy)' },
  SE: { bg: 'var(--accent-se-bg)', text: 'var(--accent-se)', ring: 'var(--accent-se)' },
  BBA: { bg: 'var(--accent-bba-bg)', text: 'var(--accent-bba)', ring: 'var(--accent-bba)' },
  AF: { bg: 'var(--accent-af-bg)', text: 'var(--accent-af)', ring: 'var(--accent-af)' },
  BA: { bg: 'var(--accent-ba-bg)', text: 'var(--accent-ba)', ring: 'var(--accent-ba)' },
  FT: { bg: 'var(--accent-ft-bg)', text: 'var(--accent-ft)', ring: 'var(--accent-ft)' },
  EE: { bg: 'var(--accent-ee-bg)', text: 'var(--accent-ee)', ring: 'var(--accent-ee)' },
  CE: { bg: 'var(--accent-ce-bg)', text: 'var(--accent-ce)', ring: 'var(--accent-ce)' },
};

interface Props {
  dept: string;
  selected: boolean;
  onClick: () => void;
}

export function DepartmentPill({ dept, selected, onClick }: Props) {
  const colors = ACCENT[dept];
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      style={selected && colors ? {
        backgroundColor: colors.bg,
        color: colors.text,
        boxShadow: `0 0 0 2px ${colors.ring}`,
        borderColor: 'transparent',
      } : {}}
      className="h-11 rounded-md border border-[var(--color-border-strong)] font-mono text-sm font-medium transition-all duration-150 active:scale-95 hover:bg-[var(--color-bg-subtle)] focus-visible:outline-none focus-visible:ring-2"
    >
      {dept}
    </button>
  );
}
