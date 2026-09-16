const tones = {
  neutral: 'bg-slate/10 text-slate',
  teal: 'bg-teal-soft text-teal-deep',
  navy: 'bg-navy/10 text-navy',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
};

export default function Badge({ children, tone = 'neutral', className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono uppercase tracking-wide ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
