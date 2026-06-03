import PageWrapper from '../components/layout/PageWrapper.jsx'
import CustomerHeader from '../components/layout/CustomerHeader.jsx'
import FadeUp from '../components/ui/FadeUp.jsx'

export default function PrivacyPage() {
  return (
    <PageWrapper noPad>
      <CustomerHeader />
      <div className="bg-navy px-4 sm:px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <p className="font-sans text-[11px] uppercase tracking-[4px] text-sky/60 mb-2">Legal</p>
          <h1 className="font-playfair text-3xl text-sky">Privacy Policy</h1>
          <p className="font-cormorant italic text-sky/60 mt-1">Last updated June 3, 2026</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <FadeUp>
          <section className="space-y-3">
            <h2 className="font-playfair text-navy text-2xl">Overview</h2>
            <p className="font-cormorant italic text-text-mid text-lg leading-relaxed">
              Four Winds Mahjong Club respects your privacy. This policy explains what information we collect, how we use it, and the choices you have.
            </p>
          </section>
        </FadeUp>

        <FadeUp delay={50}>
          <section className="space-y-3">
            <h2 className="font-playfair text-navy text-2xl">What we collect</h2>
            <ul className="font-sans text-text-mid text-base leading-relaxed list-disc pl-6 space-y-2">
              <li><strong>Account info:</strong> name, email, phone (if provided), membership tier</li>
              <li><strong>Payment info:</strong> processed entirely by Square. We never store your card numbers — only a secure token Square gives us to re-charge a card you've authorized</li>
              <li><strong>Booking history:</strong> sessions you've reserved, attended, or cancelled</li>
              <li><strong>Communications:</strong> emails or messages you send us</li>
            </ul>
          </section>
        </FadeUp>

        <FadeUp delay={100}>
          <section className="space-y-3">
            <h2 className="font-playfair text-navy text-2xl">How we use it</h2>
            <ul className="font-sans text-text-mid text-base leading-relaxed list-disc pl-6 space-y-2">
              <li>To process subscription payments and session fees</li>
              <li>To manage seat reservations, check-ins, and attendance</li>
              <li>To send transactional emails (receipts, booking confirmations, password resets)</li>
              <li>To respond to your questions or support requests</li>
            </ul>
            <p className="font-cormorant italic text-text-mid text-lg leading-relaxed mt-3">
              We do not sell or rent your data. We do not send marketing emails without your consent.
            </p>
          </section>
        </FadeUp>

        <FadeUp delay={150}>
          <section className="space-y-3">
            <h2 className="font-playfair text-navy text-2xl">Who we share with</h2>
            <p className="font-cormorant italic text-text-mid text-lg leading-relaxed">
              We share your data only with service providers necessary to operate the club:
            </p>
            <ul className="font-sans text-text-mid text-base leading-relaxed list-disc pl-6 space-y-2">
              <li><strong>Square</strong> — payment processing and card storage</li>
              <li><strong>Supabase</strong> — our database and authentication provider</li>
              <li><strong>Netlify</strong> — our website hosting</li>
            </ul>
            <p className="font-cormorant italic text-text-mid text-lg leading-relaxed mt-3">
              We do not share data with advertisers or analytics platforms.
            </p>
          </section>
        </FadeUp>

        <FadeUp delay={200}>
          <section className="space-y-3">
            <h2 className="font-playfair text-navy text-2xl">Your rights</h2>
            <p className="font-cormorant italic text-text-mid text-lg leading-relaxed">
              You can request a copy of your data, correct inaccuracies, or delete your account at any time. Email <a href="mailto:fourwindstulsa@gmail.com" className="text-sky-mid hover:text-navy underline">fourwindstulsa@gmail.com</a> and we'll respond within 7 days.
            </p>
          </section>
        </FadeUp>

        <FadeUp delay={250}>
          <section className="space-y-3">
            <h2 className="font-playfair text-navy text-2xl">Cookies and tracking</h2>
            <p className="font-cormorant italic text-text-mid text-lg leading-relaxed">
              Our website uses only essential cookies needed for login and your session. We do not use analytics or advertising cookies.
            </p>
          </section>
        </FadeUp>

        <FadeUp delay={300}>
          <section className="space-y-3">
            <h2 className="font-playfair text-navy text-2xl">Contact</h2>
            <p className="font-cormorant italic text-text-mid text-lg leading-relaxed">
              Questions about this policy? Email <a href="mailto:fourwindstulsa@gmail.com" className="text-sky-mid hover:text-navy underline">fourwindstulsa@gmail.com</a>.
            </p>
          </section>
        </FadeUp>
      </div>
    </PageWrapper>
  )
}
