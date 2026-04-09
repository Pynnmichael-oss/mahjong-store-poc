export default function EmptyState({ message, title, description, icon, action }) {
  const msg = message || title
  const sub = description
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="text-4xl mb-4 opacity-30">{icon}</div>}
      <p className="font-cormorant italic text-lg text-text-mid leading-relaxed">{msg}</p>
      {sub && <p className="font-sans text-sm text-text-soft mt-1">{sub}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
