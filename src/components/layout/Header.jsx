import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

export default function Header() {
  const { profile, isEmployee, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const customerLinks = [
    { to: '/sessions', label: 'Sessions' },
    { to: '/events',   label: 'Events'   },
    { to: '/my-qr',   label: 'My QR'    },
    { to: '/history',  label: 'History'  },
    { to: '/profile',  label: 'Profile'  },
  ]

  const employeeLinks = [
    { to: '/employee',        label: 'Dashboard' },
    { to: '/employee/sessions/today', label: 'Sessions', exact: false },
    { to: '/employee/events', label: 'Events'    },
  ]

  const links = isEmployee ? employeeLinks : customerLinks

  function isActive(to) {
    const hash = location.hash.replace('#', '')
    return hash === to || hash.startsWith(to + '/')
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'shadow-md backdrop-blur-[16px]'
          : 'backdrop-blur-[12px]'
      }`}
      style={{ background: 'rgba(255,254,249,0.92)', borderBottom: '1px solid rgba(26,58,107,0.08)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          to={isEmployee ? '/employee' : '/dashboard'}
          className="flex items-center gap-2 flex-shrink-0"
        >
          <span className="font-playfair text-xl text-navy">
            Four <em className="text-sky-mid not-italic">Winds</em>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`px-4 py-2 rounded-full font-sans text-sm font-medium transition-all duration-150 ${
                isActive(to)
                  ? 'bg-sky-pale text-navy underline decoration-navy underline-offset-4'
                  : 'text-navy hover:bg-sky-pale'
              }`}
            >
              {label}
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            className="ml-3 px-5 py-2 rounded-full font-sans text-sm font-medium bg-navy text-sky hover:bg-navy-deep transition-all duration-150"
          >
            Sign Out
          </button>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-full hover:bg-sky-pale transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <div className={`w-5 h-0.5 bg-navy rounded transition-all ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
          <div className={`w-5 h-0.5 bg-navy rounded mt-1 transition-all ${menuOpen ? 'opacity-0' : ''}`} />
          <div className={`w-5 h-0.5 bg-navy rounded mt-1 transition-all ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden bg-cream border-t border-navy/8 px-4 py-4 space-y-1 shadow-lg">
          {profile && (
            <div className="pb-3 mb-3 border-b border-navy/8">
              <p className="font-sans text-xs text-text-soft">{profile.email}</p>
              <p className="font-playfair text-navy text-base mt-0.5">{profile.full_name}</p>
            </div>
          )}
          {links.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={`block px-4 py-3 rounded-xl font-sans text-sm font-medium transition-colors ${
                isActive(to) ? 'bg-sky-pale text-navy' : 'text-navy hover:bg-sky-pale'
              }`}
            >
              {label}
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-3 rounded-xl font-sans text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}
    </header>
  )
}
