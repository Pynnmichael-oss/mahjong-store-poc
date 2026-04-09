export default function LoadingSpinner({ size = 'md', color = 'navy', className = '' }) {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-2', lg: 'w-12 h-12 border-[3px]' }
  const colors = { navy: 'border-navy/20 border-t-navy', sky: 'border-sky/30 border-t-sky', white: 'border-white/30 border-t-white' }

  return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <div className={`${sizes[size]} ${colors[color]} rounded-full animate-spin`} />
    </div>
  )
}
