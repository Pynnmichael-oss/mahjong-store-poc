import PageWrapper from '../components/layout/PageWrapper.jsx'
import CustomerHeader from '../components/layout/CustomerHeader.jsx'
import FadeUp from '../components/ui/FadeUp.jsx'

export default function TermsPage() {
  return (
    <PageWrapper noPad>
      <CustomerHeader />
      <div className="bg-navy px-4 sm:px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky/60 mb-2">Legal</p>
          <h1 className="font-playfair text-3xl text-sky">Terms of Service</h1>
          <p className="font-cormorant italic text-sky/60 mt-1">Last updated June 3, 2026</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <FadeUp>
          <section className="space-y-3">
            <h2 className="font-playfair text-navy text-2xl">Welcome</h2>
            <p className="font-cormorant italic text-text-mid text-lg leading-relaxed">
              By creating an account or booking a session with Four Winds Mahjong Club, you agree to these terms.
            </p>
          </section>
        </FadeUp>

        <FadeUp delay={50}>
          <section className="space-y-3">
            <h2 className="font-playfair text-navy text-2xl">Memberships</h2>
            <p className="font-cormorant italic text-text-mid text-lg leading-relaxed">
              Our paid memberships (Dragon, Flower, Bamboo, Founding Member) renew monthly. You can change or cancel your plan at any time from your profile. Changes between paid tiers take effect immediately and your card on file is charged the new amount. Cancellations to the free Four Winds Member tier are scheduled at the end of your current billing period — you keep your benefits until that date.
            </p>
          </section>
        </FadeUp>

        <FadeUp delay={100}>
          <section className="space-y-3">
            <h2 className="font-playfair text-navy text-2xl">Reservations and cancellation</h2>
            <p className="font-cormorant italic text-text-mid text-lg leading-relaxed">
              You may cancel a reservation at any time. If you cancel <strong>24 or more hours</strong> before the session starts, paid session fees are refunded to your card within 5-10 business days. Cancellations within 24 hours of the session start are not eligible for a refund, but your seat will be released for others.
            </p>
            <p className="font-cormorant italic text-text-mid text-lg leading-relaxed">
              Cancelling an individual guest seat from a group booking will release that seat. Refunds for guest seat cancellations are processed at the front counter when you next visit the club.
            </p>
          </section>
        </FadeUp>

        <FadeUp delay={150}>
          <section className="space-y-3">
            <h2 className="font-playfair text-navy text-2xl">Check-in and no-shows</h2>
            <p className="font-cormorant italic text-text-mid text-lg leading-relaxed">
              Reservations must be checked in at the club within 15 minutes of the session start time. If you don't check in within that window, your reservation may be marked as a no-show and the seat released.
            </p>
          </section>
        </FadeUp>

        <FadeUp delay={200}>
          <section className="space-y-3">
            <h2 className="font-playfair text-navy text-2xl">Code of conduct</h2>
            <p className="font-cormorant italic text-text-mid text-lg leading-relaxed">
              We expect courtesy and respect among all members and staff. Disruptive behavior, harassment, or repeated violations of club policy may result in suspension or termination of membership without refund. We reserve the right to refuse service.
            </p>
          </section>
        </FadeUp>

        <FadeUp delay={250}>
          <section className="space-y-3">
            <h2 className="font-playfair text-navy text-2xl">Payments</h2>
            <p className="font-cormorant italic text-text-mid text-lg leading-relaxed">
              All payments are processed by Square. We never see or store your card numbers. Subscriptions are billed monthly to the card on file. Failed payments may result in temporary suspension of membership benefits until the issue is resolved.
            </p>
          </section>
        </FadeUp>

        <FadeUp delay={300}>
          <section className="space-y-3">
            <h2 className="font-playfair text-navy text-2xl">Changes to these terms</h2>
            <p className="font-cormorant italic text-text-mid text-lg leading-relaxed">
              We may update these terms occasionally. If we make material changes, we'll email registered members.
            </p>
          </section>
        </FadeUp>

        <FadeUp delay={350}>
          <section className="space-y-3">
            <h2 className="font-playfair text-navy text-2xl">Contact</h2>
            <p className="font-cormorant italic text-text-mid text-lg leading-relaxed">
              Questions? Email <a href="mailto:fourwindstulsa@gmail.com" className="text-sky-mid hover:text-navy underline">fourwindstulsa@gmail.com</a>.
            </p>
          </section>
        </FadeUp>
      </div>
    </PageWrapper>
  )
}
