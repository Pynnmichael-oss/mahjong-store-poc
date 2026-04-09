import Header from './Header.jsx'

export default function PageWrapper({ children, noPad = false }) {
  return (
    <div className="min-h-screen bg-warm-white">
      <Header />
      <div className="pt-16">
        {noPad ? children : (
          <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
            {children}
          </main>
        )}
      </div>
    </div>
  )
}
