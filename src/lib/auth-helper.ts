// Temporary auth helper for role-based access
// TODO: Replace with proper NextAuth.js implementation

export type UserRole = 'ADMIN' | 'SEO' | 'WRITER'

export interface User {
  id: string
  email: string
  name?: string
  role: UserRole
  isActive: boolean
}

// Temporary mock user - Replace with actual session management
export const getCurrentUser = (): User | null => {
  // For development, return a mock admin user
  // TODO: Replace with actual session check
  if (typeof window !== 'undefined') {
    const storedUser = localStorage.getItem('currentUser')
    if (storedUser) {
      return JSON.parse(storedUser)
    }
  }

  // Default to admin for development
  return {
    id: 'dev-admin',
    email: 'admin@seodashboard.com',
    name: 'Admin User',
    role: 'ADMIN',
    isActive: true,
  }
}

export const setCurrentUser = (user: User | null) => {
  if (typeof window !== 'undefined') {
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user))
    } else {
      localStorage.removeItem('currentUser')
    }
  }
}

export const hasPermission = (user: User | null, requiredRole: UserRole): boolean => {
  if (!user || !user.isActive) return false

  const roleHierarchy: Record<UserRole, number> = {
    ADMIN: 3,
    SEO: 2,
    WRITER: 1,
  }

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole]
}

export const canAccessArticles = (user: User | null): boolean => {
  return user !== null && user.isActive // All roles can access articles
}

export const canAccessKeywords = (user: User | null): boolean => {
  return hasPermission(user, 'SEO') // SEO and ADMIN
}

export const canAccessBacklinks = (user: User | null): boolean => {
  return hasPermission(user, 'SEO') // SEO and ADMIN
}

export const canAccessUsers = (user: User | null): boolean => {
  return hasPermission(user, 'ADMIN') // ADMIN only
}

export const canAccessBrands = (user: User | null): boolean => {
  return hasPermission(user, 'SEO') // SEO and ADMIN
}
