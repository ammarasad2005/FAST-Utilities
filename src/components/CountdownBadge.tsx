interface Props { days: number; }

export function CountdownBadge({ days }: Props) {
  if (days < 0) return null;
  const urgent = days <= 2;
  return (
    <span
      className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded"
      style={{
        backgroundColor: urgent ? '#FEF2F2' : 'var(--color-bg-subtle)',
        color: urgent ? '#DC2626' : 'var(--color-text-tertiary)',
      }}
    >
      {days === 0 ? 'TODAY' : days === 1 ? '1d' : `${days}d`}
    </span>
  );
}
