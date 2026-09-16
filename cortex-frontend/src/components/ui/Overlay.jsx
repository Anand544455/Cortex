import { X } from 'lucide-react';

export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-card shadow-lift w-full ${width} max-h-[85vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate/15 sticky top-0 bg-white">
          <h3 className="font-display font-semibold text-navy">{title}</h3>
          <button onClick={onClose} className="text-slate hover:text-navy">
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 border-b border-slate/15 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
            active === tab.key
              ? 'border-teal-deep text-teal-deep'
              : 'border-transparent text-slate hover:text-navy'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
