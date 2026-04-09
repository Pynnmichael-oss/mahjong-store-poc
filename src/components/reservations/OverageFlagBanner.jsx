export default function OverageFlagBanner({ checkedInCount }) {
  return (
    <div className="bg-gold-light border border-gold/30 rounded-2xl px-5 py-4">
      <p className="font-cormorant italic text-navy text-base leading-relaxed">
        You've used {checkedInCount} of 3 plays this week — a walk-in fee applies at the door. You may still reserve your seat.
      </p>
    </div>
  )
}
