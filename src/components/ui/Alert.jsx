export default function Alert({ type = 'info', children, className = '' }) {
  const styles = {
    info:    'bg-sky-light border-sky-mid text-navy',
    success: 'bg-green-50 border-green-400 text-green-800',
    warning: 'bg-gold-light border-gold text-navy',
    error:   'bg-red-50 border-red-300 text-red-700',
  }

  return (
    <div className={`border-l-4 rounded-r-xl p-4 font-cormorant text-base leading-relaxed ${styles[type] ?? styles.info} ${className}`}>
      {children}
    </div>
  )
}
