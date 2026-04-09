export default function SectionTag({ children, className = '' }) {
  return (
    <span className={`font-sans text-[11px] font-medium uppercase tracking-[4px] text-sky-mid ${className}`}>
      {children}
    </span>
  )
}
