export function Table({ columns, rows, keyField = 'id', emptyMessage = 'No data yet.' }) {
  if (!rows || rows.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }
  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate/15">
            {columns.map((col) => (
              <th key={col.key} className="text-left font-mono text-[11px] uppercase tracking-wide text-slate px-5 py-2.5 whitespace-nowrap">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[keyField]} className="border-b border-slate/10 hover:bg-teal-soft/30 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className="px-5 py-3 text-ink align-middle">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({ message = 'Nothing here yet.', hint, icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {Icon && (
        <div className="w-11 h-11 rounded-full bg-teal-soft flex items-center justify-center mb-3">
          <Icon size={20} className="text-teal-deep" />
        </div>
      )}
      <p className="text-sm font-medium text-navy">{message}</p>
      {hint && <p className="text-xs text-slate mt-1 max-w-xs">{hint}</p>}
    </div>
  );
}

export function Spinner({ size = 20, className = '' }) {
  return (
    <div
      className={`rounded-full border-2 border-teal-soft border-t-teal-deep animate-spin ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function StatCard({ label, value, delta, deltaTone = 'success', sub }) {
  const deltaColor = deltaTone === 'success' ? 'text-teal-deep' : deltaTone === 'danger' ? 'text-red-500' : 'text-slate';
  return (
    <div className="bg-white border border-slate/15 rounded-card shadow-card p-4">
      <div className="text-[11px] font-mono uppercase tracking-wide text-slate">{label}</div>
      <div className="font-mono text-xl font-bold text-navy mt-1">{value}</div>
      {(delta || sub) && (
        <div className={`text-[11px] font-mono mt-1 ${delta ? deltaColor : 'text-slate'}`}>{delta || sub}</div>
      )}
    </div>
  );
}

export function ScoreRing({ score = 0, size = 72 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#0F9C8F' : score >= 50 ? '#D9A441' : '#D9534F';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#E4EAEE" strokeWidth="6" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute font-mono font-bold text-navy text-sm">{score}</span>
    </div>
  );
}
