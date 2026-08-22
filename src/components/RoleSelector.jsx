import { useState } from 'react'
import { useAuth, ROLES } from '../contexts/AuthContext'

export default function RoleSelector() {
  const { user, role, login, logout, switchRole } = useAuth()
  const [open, setOpen] = useState(false)
  const [loginForm, setLoginForm] = useState(false)
  const [name, setName] = useState('')

  if (!user) {
    if (!loginForm) {
      return (
        <button
          onClick={() => setLoginForm(true)}
          className="print:hidden px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors shadow-sm"
        >
          Sign In
        </button>
      )
    }

    return (
      <div className="print:hidden relative">
        <div className="fixed inset-0 bg-black/20 z-[60]" onClick={() => setLoginForm(false)} />
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-80 bg-white rounded-xl border border-stone-200 shadow-xl p-6">
          <h3 className="text-sm font-semibold text-stone-800 mb-1">Sign In to SPAN</h3>
          <p className="text-xs text-stone-500 mb-4">Demo mode — enter any name and select a role</p>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-800 focus:border-teal-brand focus:outline-none mb-3"
          />
          <div className="space-y-2">
            {Object.entries(ROLES).map(([key, r]) => (
              <button
                key={key}
                onClick={() => { if (name.trim()) { login(name.trim(), key); setLoginForm(false); setName('') } }}
                disabled={!name.trim()}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-stone-200 hover:border-teal-brand/50 hover:bg-teal-50/50 transition-colors disabled:opacity-40 disabled:hover:border-stone-200 disabled:hover:bg-white"
              >
                <span className="text-sm font-medium text-stone-800">{r.label}</span>
                <span className="block text-xs text-stone-500 mt-0.5">{r.description}</span>
              </button>
            ))}
          </div>
          <button onClick={() => setLoginForm(false)} className="mt-3 w-full py-2 rounded-lg bg-stone-100 text-xs text-stone-500 hover:bg-stone-200 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  const currentRole = ROLES[role]

  return (
    <div className="print:hidden relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 bg-white text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors shadow-sm"
      >
        <div className="w-5 h-5 rounded-full bg-teal-brand text-white flex items-center justify-center text-[10px] font-bold">
          {user.name[0]}
        </div>
        <span className="hidden sm:inline">{user.name}</span>
        <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 text-[10px] font-medium">{currentRole?.label}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[59]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl border border-stone-200 shadow-xl z-[60] overflow-hidden">
            <div className="p-3 border-b border-stone-100">
              <p className="text-sm font-medium text-stone-800">{user.name}</p>
              <p className="text-xs text-stone-500">{user.email}</p>
            </div>
            <div className="p-2">
              <p className="text-[10px] text-stone-400 uppercase tracking-wider px-2 py-1">Switch Role</p>
              {Object.entries(ROLES).map(([key, r]) => (
                <button
                  key={key}
                  onClick={() => { switchRole(key); setOpen(false) }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                    role === key ? 'bg-teal-50 text-teal-800 font-medium' : 'text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {r.label}
                  {role === key && <span className="ml-1 text-teal-600">&#10003;</span>}
                </button>
              ))}
            </div>
            <div className="p-2 border-t border-stone-100">
              <button
                onClick={() => { logout(); setOpen(false) }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
