import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import Button from '../ui/Button.jsx'

export default function Header() {
  const { profile, isEmployee, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to={isEmployee ? '/employee' : '/dashboard'} className="font-bold text-gray-900 text-lg">
          Mahjong Open Play
        </Link>
        <div className="flex items-center gap-3">
          {profile && (
            <span className="text-sm text-gray-500 hidden sm:block">
              {profile.full_name}
            </span>
          )}
          <Button variant="secondary" onClick={handleSignOut} className="text-xs py-1.5">
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  )
}
