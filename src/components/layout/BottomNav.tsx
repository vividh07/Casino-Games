import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: 'Home', icon: '⌂' },
  { to: '/bank', label: 'Bank', icon: '₹' },
  { to: '/quests', label: 'Quests', icon: '★' },
  { to: '/leaderboard', label: 'Ranks', icon: '▲' },
  { to: '/profile', label: 'You', icon: '☺' },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0a0a12]/90 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-1 py-2">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-[11px] font-semibold transition ${
                  isActive
                    ? 'bg-violet-500/20 text-violet-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`
              }
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
