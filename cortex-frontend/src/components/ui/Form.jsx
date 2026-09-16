export function Input({ label, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-navy mb-1.5">{label}</span>}
      <input
        className={`w-full px-3.5 py-2.5 rounded-lg border border-slate/25 text-sm text-ink placeholder:text-slate/60 focus:outline-none focus:ring-2 focus:ring-teal-deep/40 focus:border-teal-deep transition ${className}`}
        {...props}
      />
    </label>
  );
}

export function Textarea({ label, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-navy mb-1.5">{label}</span>}
      <textarea
        className={`w-full px-3.5 py-2.5 rounded-lg border border-slate/25 text-sm text-ink placeholder:text-slate/60 focus:outline-none focus:ring-2 focus:ring-teal-deep/40 focus:border-teal-deep transition ${className}`}
        {...props}
      />
    </label>
  );
}

export function Select({ label, children, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-navy mb-1.5">{label}</span>}
      <select
        className={`w-full px-3.5 py-2.5 rounded-lg border border-slate/25 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-teal-deep/40 focus:border-teal-deep transition ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
