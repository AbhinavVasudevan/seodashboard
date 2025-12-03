'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
  ChartBarIcon,
  UserGroupIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline'
import { useState, useRef, useEffect } from 'react'
import { useTheme } from 'next-themes'

interface NavItem {
  name: string
  href: string
  children?: { name: string; href: string }[]
}

const fullNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/' },
  { name: 'App Rankings', href: '/app-rankings' },
  { name: 'Brands', href: '/brands' },
  { name: 'Keywords', href: '/keywords' },
  { name: 'Articles', href: '/articles' },
  { name: 'Backlinks', href: '/backlinks' },
  {
    name: 'Link Directory',
    href: '/backlink-directory',
    children: [
      { name: 'Prospects', href: '/backlink-directory/prospects' },
      { name: 'Import', href: '/backlink-directory/import' },
      { name: 'Brand Deals', href: '/backlink-directory/deals' },
    ]
  },
]

const writerNavigation: NavItem[] = [
  { name: 'Articles', href: '/articles' },
]

const adminNavigation: NavItem[] = [
  { name: 'Users', href: '/admin/users' },
]

export default function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!session) return null

  const isAdmin = session.user?.role === 'ADMIN'
  const isWriter = session.user?.role === 'WRITER'
  const baseNavigation = isWriter ? writerNavigation : fullNavigation
  const allNavItems = isAdmin ? [...baseNavigation, ...adminNavigation] : baseNavigation

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-700'
      case 'SEO': return 'bg-green-100 text-green-700'
      case 'WRITER': return 'bg-blue-100 text-blue-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-12">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
                <ChartBarIcon className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground hidden sm:block">
                SEO Dashboard
              </span>
            </Link>
          </div>

          {/* Desktop Navigation - Text only, no icons */}
          <div className="hidden md:flex md:items-center md:gap-0.5" ref={dropdownRef}>
            {allNavItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))

              if (item.children) {
                const isDropdownOpen = openDropdown === item.name
                return (
                  <div key={item.name} className="relative">
                    <button
                      onClick={() => setOpenDropdown(isDropdownOpen ? null : item.name)}
                      className={`px-2.5 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
                        isActive
                          ? 'text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      {item.name}
                      <ChevronDownIcon className={`h-3 w-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isDropdownOpen && (
                      <div className="absolute left-0 mt-1 w-40 bg-popover border border-border rounded-md shadow-lg py-1 z-50">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setOpenDropdown(null)}
                            className={`block px-3 py-1.5 text-sm transition-colors ${
                              pathname === child.href
                                ? 'bg-accent text-accent-foreground'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-2.5 py-1.5 text-sm rounded-md transition-colors ${
                    isActive
                      ? 'text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </div>

          {/* Theme Toggle & User Menu */}
          <div className="hidden md:flex md:items-center md:gap-2" ref={userMenuRef}>
            {/* Theme Toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {resolvedTheme === 'dark' ? (
                  <SunIcon className="h-4 w-4" />
                ) : (
                  <MoonIcon className="h-4 w-4" />
                )}
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1 rounded-md hover:bg-muted transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                  {(session.user?.name || session.user?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <ChevronDownIcon className={`w-3 h-3 text-muted-foreground transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-popover border border-border rounded-md shadow-lg z-50">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium text-foreground truncate">
                      {session.user?.name || session.user?.email?.split('@')[0]}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${getRoleBadgeClass(session.user?.role || '')}`}>
                        {session.user?.role}
                      </span>
                    </div>
                  </div>
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full px-3 py-1.5 text-sm text-left text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
                    >
                      <ArrowRightOnRectangleIcon className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 md:hidden">
            {/* Mobile Theme Toggle */}
            {mounted && (
              <button
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
              >
                {resolvedTheme === 'dark' ? (
                  <SunIcon className="h-5 w-5" />
                ) : (
                  <MoonIcon className="h-5 w-5" />
                )}
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-5 w-5 text-foreground" />
              ) : (
                <Bars3Icon className="h-5 w-5 text-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-card border-t border-border">
          <div className="px-3 py-2 space-y-0.5">
            {allNavItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href))

              if (item.children) {
                return (
                  <div key={item.name}>
                    <div className={`px-3 py-2 text-sm font-medium rounded-md ${
                      isActive ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {item.name}
                    </div>
                    <div className="ml-4 space-y-0.5">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                            pathname === child.href
                              ? 'text-primary bg-primary/5'
                              : 'text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'text-primary bg-primary/5'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </div>
          <div className="px-3 py-3 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                  {(session.user?.name || session.user?.email || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {session.user?.name || session.user?.email?.split('@')[0]}
                  </p>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${getRoleBadgeClass(session.user?.role || '')}`}>
                    {session.user?.role}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors"
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
