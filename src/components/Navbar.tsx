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
  BuildingOfficeIcon,
  ChevronDownIcon,
  PencilSquareIcon,
  FolderIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { useState } from 'react'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  children?: { name: string; href: string }[]
}

// Full navigation for Admin and SEO roles
const fullNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'App Rankings', href: '/app-rankings', icon: ChartBarIcon },
  { name: 'Brands', href: '/brands', icon: BuildingOfficeIcon },
  { name: 'Keywords', href: '/keywords', icon: DocumentTextIcon },
  { name: 'Articles', href: '/articles', icon: PencilSquareIcon },
  { name: 'Backlinks', href: '/backlinks', icon: LinkIcon },
  {
    name: 'Link Directory',
    href: '/backlink-directory',
    icon: FolderIcon,
    children: [
      { name: 'Prospects', href: '/backlink-directory/prospects' },
      { name: 'Import', href: '/backlink-directory/import' },
      { name: 'Brand Deals', href: '/backlink-directory/deals' },
    ]
  },
]

// Limited navigation for Writers - only Articles
const writerNavigation: NavItem[] = [
  { name: 'Articles', href: '/articles', icon: PencilSquareIcon },
]

const adminNavigation: NavItem[] = [
  { name: 'Manage Users', href: '/admin/users', icon: UserGroupIcon },
]

export default function Navbar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  if (!session) return null

  const isAdmin = session.user?.role === 'ADMIN'
  const isWriter = session.user?.role === 'WRITER'

  // Writers only see Articles, Admin/SEO see full navigation
  const baseNavigation = isWriter ? writerNavigation : fullNavigation
  const allNavItems = isAdmin ? [...baseNavigation, ...adminNavigation] : baseNavigation

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case 'ADMIN': return 'default'
      case 'SEO': return 'secondary'
      case 'WRITER': return 'outline'
      default: return 'secondary'
    }
  }

  const NavLink = ({ item, onClick }: { item: NavItem; onClick?: () => void }) => {
    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

    if (item.children) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              size="sm"
              className="gap-1.5"
            >
              <item.icon className="h-4 w-4" />
              {item.name}
              <ChevronDownIcon className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {item.children.map((child) => (
              <DropdownMenuItem key={child.href} asChild>
                <Link href={child.href} onClick={onClick}>
                  {child.name}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }

    return (
      <Button
        variant={isActive ? "secondary" : "ghost"}
        size="sm"
        asChild
        className="gap-1.5"
      >
        <Link href={item.href} onClick={onClick}>
          <item.icon className="h-4 w-4" />
          {item.name}
        </Link>
      </Button>
    )
  }

  return (
    <nav className="sticky top-0 z-50 border-b bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <ChartBarIcon className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold hidden sm:block">
                SEO Dashboard
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-1">
            {allNavItems.map((item) => (
              <NavLink key={item.name} item={item} />
            ))}
          </div>

          {/* User Menu - Desktop */}
          <div className="hidden md:flex md:items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 h-auto py-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {(session.user?.name || session.user?.email || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden lg:flex lg:flex-col lg:items-start">
                    <span className="text-sm font-medium">
                      {session.user?.name || session.user?.email?.split('@')[0]}
                    </span>
                    <Badge variant={getRoleBadgeVariant(session.user?.role || '')} className="text-[10px] px-1.5 py-0">
                      {session.user?.role}
                    </Badge>
                  </div>
                  <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{session.user?.name || 'User'}</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      {session.user?.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Bars3Icon className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex flex-col gap-1">
                  {allNavItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))

                    if (item.children) {
                      return (
                        <div key={item.name} className="space-y-1">
                          <div className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md ${
                            isActive ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground'
                          }`}>
                            <item.icon className="h-5 w-5" />
                            {item.name}
                          </div>
                          <div className="ml-6 space-y-1">
                            {item.children.map((child) => (
                              <Link
                                key={child.href}
                                href={child.href}
                                onClick={() => setMobileOpen(false)}
                                className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                                  pathname === child.href
                                    ? 'bg-secondary text-secondary-foreground'
                                    : 'text-muted-foreground hover:bg-accent'
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
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                          isActive
                            ? 'bg-secondary text-secondary-foreground'
                            : 'text-muted-foreground hover:bg-accent'
                        }`}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.name}
                      </Link>
                    )
                  })}
                </div>

                <Separator className="my-4" />

                <div className="px-3">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {(session.user?.name || session.user?.email || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {session.user?.name || session.user?.email?.split('@')[0]}
                      </p>
                      <Badge variant={getRoleBadgeVariant(session.user?.role || '')} className="text-[10px]">
                        {session.user?.role}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleLogout}
                  >
                    <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                    Sign out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}
