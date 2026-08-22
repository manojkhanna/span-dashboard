import { createContext, useContext, useState, useCallback } from 'react'

const ROLES = {
  admin: {
    label: 'Admin',
    description: 'Full access — manage users, configure integrations, edit all data',
    permissions: ['view', 'edit', 'upload', 'delete', 'manage_users', 'integrations', 'export', 'recommendations'],
  },
  pm: {
    label: 'Project Manager',
    description: 'Manage project data, view reports, configure alerts',
    permissions: ['view', 'edit', 'upload', 'export', 'recommendations'],
  },
  engineer: {
    label: 'Field Engineer',
    description: 'View dashboards, submit RFIs, update progress',
    permissions: ['view', 'upload', 'export'],
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access to dashboards and reports',
    permissions: ['view'],
  },
}

const STORAGE_KEY = 'span_auth'

function loadAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function saveAuth(auth) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => loadAuth() || { user: null, role: null })

  const login = useCallback((name, role) => {
    const newAuth = { user: { name, email: `${name.toLowerCase().replace(/\s+/g, '.')}@prothious.com` }, role }
    setAuth(newAuth)
    saveAuth(newAuth)
  }, [])

  const logout = useCallback(() => {
    setAuth({ user: null, role: null })
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const switchRole = useCallback((role) => {
    setAuth(prev => {
      const updated = { ...prev, role }
      saveAuth(updated)
      return updated
    })
  }, [])

  const hasPermission = useCallback((perm) => {
    if (!auth.role) return true
    return ROLES[auth.role]?.permissions.includes(perm) ?? false
  }, [auth.role])

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, switchRole, hasPermission, roles: ROLES }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export { ROLES }
