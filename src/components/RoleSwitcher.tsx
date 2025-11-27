'use client'

import { useState, useEffect } from 'react'
import { getCurrentUser, setCurrentUser, type User, type UserRole } from '@/lib/auth-helper'
import { UserCircleIcon } from '@heroicons/react/24/outline'

export default function RoleSwitcher() {
  const [currentUser, setCurrentUserState] = useState<User | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const user = getCurrentUser()
    setCurrentUserState(user)
  }, [])

  const switchRole = (role: UserRole) => {
    const mockUser: User = {
      id: `mock-${role.toLowerCase()}`,
      email: `${role.toLowerCase()}@seodashboard.com`,
      name: `${role} User`,
      role,
      isActive: true,
    }
    setCurrentUser(mockUser)
    setCurrentUserState(mockUser)
    setIsOpen(false)
    // Reload to reflect changes
    window.location.reload()
  }

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800'
      case 'SEO':
        return 'bg-blue-100 text-blue-800'
      case 'WRITER':
        return 'bg-green-100 text-green-800'
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg ${getRoleColor(currentUser?.role || 'ADMIN')} hover:shadow-xl transition-shadow`}
        >
          <UserCircleIcon className="h-5 w-5" />
          <span className="font-medium">{currentUser?.role || 'ADMIN'}</span>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[200px]">
            <div className="px-4 py-2 border-b border-gray-200">
              <p className="text-xs font-medium text-gray-500 uppercase">Switch Role</p>
            </div>
            <button
              onClick={() => switchRole('ADMIN')}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
            >
              <span className="status-badge bg-purple-100 text-purple-800">ADMIN</span>
              <span className="text-sm text-gray-600">Full Access</span>
            </button>
            <button
              onClick={() => switchRole('SEO')}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
            >
              <span className="status-badge bg-blue-100 text-blue-800">SEO</span>
              <span className="text-sm text-gray-600">SEO Tools</span>
            </button>
            <button
              onClick={() => switchRole('WRITER')}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
            >
              <span className="status-badge bg-green-100 text-green-800">WRITER</span>
              <span className="text-sm text-gray-600">Articles Only</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
