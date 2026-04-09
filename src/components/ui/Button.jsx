export default function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center rounded-full font-sans font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]'

  const variants = {
    primary:     'bg-navy text-sky hover:bg-navy-deep',
    ghost:       'bg-transparent border-[1.5px] border-navy text-navy hover:bg-sky-pale',
    'ghost-sky': 'bg-transparent border-[1.5px] border-sky text-sky hover:bg-white/10',
    danger:      'bg-transparent border-[1.5px] border-red-300 text-red-600 hover:bg-red-50',
    gold:        'bg-gold text-navy-deep hover:opacity-90',
    secondary:   'bg-cream text-navy border border-navy/20 hover:bg-sky-pale',
  }

  const sizes = {
    sm: 'px-4 py-1.5 text-sm min-h-[36px]',
    md: 'px-6 py-2.5 text-sm',
    lg: 'px-8 py-3 text-base',
  }

  return (
    <button className={`${base} ${variants[variant] ?? variants.primary} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}
