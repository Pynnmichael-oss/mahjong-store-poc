export default function OverageFlagBanner({ checkedInCount, weeklyLimit }) {
  const limitLabel = weeklyLimit === 1 ? '1 session' : `${weeklyLimit} sessions`
  return (
    <div className="bg-gold-light border border-gold/30 rounded-2xl px-5 py-4">
      <p className="font-cormorant italic text-navy text-base leading-relaxed">
        You've used {checkedInCount} of {limitLabel} this week — a $15 overage fee applies. You may still reserve your seat.
      </p>
    </div>
  )
}
