'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  HomeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  LinkIcon,
  UserGroupIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline'
import { useState } from 'react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'App Rankings', href: '/app-rankings', icon: ChartBarIcon },
  { name: 'Brands', href: '/brands', icon: BuildingOfficeIcon },
  { name: 'Keywords', href: '/keywords', icon: DocumentTextIcon },
  { name: 'Backlinks', href: '/backlinks', icon: LinkIcon },
]

const adminNavigation = [
  { name: 'Manage Users', href: '/admin/users', icon: UserGroupIcon },
]

export default function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  if (!session) return null

  const isAdmin = session.user?.role === 'ADMIN'
  const allNavItems = isAdmin ? [...navigation, ...adminNavigation] : navigation

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Desktop Navigation */}
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-primary-600">
                SEO Dashboard
              </Link>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
              {allNavItems.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* User info and Logout */}
          <div className="hidden sm:flex sm:items-center sm:space-x-4">
            <span className="text-sm text-gray-600">
              {session.user?.name || session.user?.email}
            </span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {session.user?.role}
            </span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
              Logout
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {allNavItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-3 py-2 text-base font-medium rounded-md ${
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </div>
          <div className="pt-3 pb-3 border-t border-gray-200 px-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {session.user?.name || session.user?.email}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {session.user?.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
