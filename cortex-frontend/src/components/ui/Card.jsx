export default function Card({ children, className = '', title, action, padding = 'p-5' }) {
  return (
    <div className={`bg-white border border-slate/15 rounded-card shadow-card ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 pt-5">
          {title && <h3 className="font-display font-semibold text-navy text-[15px]">{title}</h3>}
          {action}
        </div>
      )}
      <div className={padding}>{children}</div>
    </div>
  );
}
