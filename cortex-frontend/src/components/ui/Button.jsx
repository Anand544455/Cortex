const variants = {
  primary: 'bg-teal-deep text-white hover:bg-teal disabled:bg-slate/30',
  secondary: 'bg-navy text-white hover:bg-navy-light disabled:bg-slate/30',
  ghost: 'bg-transparent text-navy border border-slate/25 hover:border-teal-deep hover:text-teal-deep',
  danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  loading = false,
  disabled = false,
  icon: Icon,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
      ) : (
        Icon && <Icon size={15} />
      )}
      {children}
    </button>
  );
}
