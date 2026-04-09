const STYLES = {
  confirmed:  'bg-sky-light text-navy',
  checked_in: 'bg-sky-mid text-white',
  no_show:    'bg-red-100 text-red-700',
  cancelled:  'bg-gray-100 text-text-mid',
  walk_in:    'bg-navy text-sky',
  open:       'bg-sky-light text-navy',
  closed:     'bg-gray-100 text-text-mid',
  upcoming:   'bg-sky-light text-navy',
  completed:  'bg-gray-100 text-text-mid',
  full:       'bg-gold-light text-navy',
}

const LABELS = {
  confirmed:  'Confirmed',
  checked_in: 'Checked In',
  no_show:    'No Show',
  cancelled:  'Cancelled',
  walk_in:    'Walk-In',
  open:       'Open',
  closed:     'Closed',
  upcoming:   'Upcoming',
  completed:  'Completed',
  full:       'Full',
}

export default function Badge({ status, label, variant, children, className = '' }) {
  const key = status || variant || 'default'
  const style = STYLES[key] ?? 'bg-sky-light text-navy'
  const text = children ?? label ?? LABELS[key] ?? key
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full font-sans text-xs font-medium ${style} ${className}`}>
      {text}
    </span>
  )
}
