const STATUS_STYLES = {
  confirmed: 'bg-blue-100 text-blue-700',
  checked_in: 'bg-green-100 text-green-700',
  no_show: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
  walk_in: 'bg-purple-100 text-purple-700',
  open: 'bg-green-100 text-green-700',
  active: 'bg-blue-100 text-blue-700',
  closed: 'bg-gray-100 text-gray-600',
}

const STATUS_LABELS = {
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  no_show: 'No Show',
  cancelled: 'Cancelled',
  walk_in: 'Walk-In',
  open: 'Open',
  active: 'Active',
  closed: 'Closed',
}

export default function Badge({ status, label, className = '' }) {
  const style = STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'
  const text = label ?? STATUS_LABELS[status] ?? status
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${style} ${className}`}>
      {text}
    </span>
  )
}
