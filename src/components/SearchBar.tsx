interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function SearchBar({ value, onChange }: Props) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] pointer-events-none"
        width="15" height="15" viewBox="0 0 15 15" fill="none"
        aria-hidden="true"
      >
        <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
      <input
        type="search"
        placeholder="Search by course name or code…"
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label="Search exams"
        className="w-full h-11 pl-9 pr-4 bg-[var(--color-bg-subtle)] border border-[var(--color-border)] rounded-md font-body text-sm placeholder:text-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] text-lg leading-none"
        >
          ×
        </button>
      )}
    </div>
  );
}
