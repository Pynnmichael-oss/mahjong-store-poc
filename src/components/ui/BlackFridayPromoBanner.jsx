import { Link } from 'react-router-dom'
import { isBlackFridayPromoOpen, PROMO_BF_COPY, PROMO_BF_HIGHLIGHT } from '../../lib/promo.js'

/**
 * BlackFridayPromoBanner
 *
 * Public, marketing-only announcement for the Black Friday Special. It takes no
 * payment and needs no auth — it exists so a visitor who is not signed in can
 * discover the offer at all, since the purchase card lives behind the login on
 * the dashboard and profile.
 *
 * Self-gating: renders nothing outside the configured promo window. The window
 * here is cosmetic; purchase-bf-special re-checks it server-side.
 */
export default function BlackFridayPromoBanner() {
  if (!isBlackFridayPromoOpen()) return null

  return (
    <section className="bg-navy border-y border-gold/30 px-4 sm:px-8 py-10">
      <div className="max-w-4xl mx-auto text-center">
        <p className="font-sans text-[11px] uppercase tracking-[4px] text-gold mb-3">
          One Day Only
        </p>

        <h2 className="font-playfair text-sky text-3xl sm:text-4xl mb-3">
          Black Friday Special
        </h2>

        <div className="flex items-baseline justify-center gap-2 mb-4">
          <span className="font-playfair text-gold text-5xl">$357</span>
          <span className="font-sans text-sky/60 text-sm">paid once</span>
        </div>

        <div className="inline-flex items-center gap-2 mb-5 px-5 py-2 rounded-full bg-gold/15 border border-gold/30">
          <span className="text-gold flex-shrink-0">✦</span>
          <p className="font-sans text-sm font-medium text-sky">
            {PROMO_BF_HIGHLIGHT}
          </p>
        </div>

        <p className="font-cormorant italic text-sky/80 text-lg leading-relaxed max-w-2xl mx-auto mb-7">
          {PROMO_BF_COPY}
        </p>

        <Link to="/signup">
          <button className="w-full sm:w-auto sm:min-w-[260px] bg-sky text-navy rounded-full py-3.5 px-10 font-sans font-medium text-base hover:bg-sky-light hover:scale-105 transition-all duration-200">
            Claim the Black Friday Special
          </button>
        </Link>

        <p className="font-sans text-xs text-sky/50 mt-4">
          Already a member? Sign in and you&rsquo;ll find it on your dashboard.
        </p>
      </div>
    </section>
  )
}
