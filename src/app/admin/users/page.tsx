'use client'

import { useState, useEffect } from 'react'
import {
  UserCircleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  UsersIcon
} from '@heroicons/react/24/outline'

interface User {
  id: string
  email: string
  name?: string
  role: 'ADMIN' | 'SEO' | 'WRITER'
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    brands: number
  }
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'WRITER',
    isActive: true,
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
      setError('Failed to fetch users')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const payload = {
        email: formData.email,
        name: formData.name || null,
        password: formData.password,
        role: formData.role,
        isActive: formData.isActive,
      }

      const response = await fetch('/api/users', {
        method: editingUser ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingUser ? { ...payload, id: editingUser.id } : payload),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to save user')
        return
      }

      setSuccess(editingUser ? 'User updated successfully!' : 'User created successfully!')
      setShowAddForm(false)
      setEditingUser(null)
      resetForm()
      fetchUsers()
    } catch (error) {
      console.error('Error saving user:', error)
      setError('An unexpected error occurred')
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      email: user.email,
      name: user.name || '',
      password: '',
      role: user.role,
      isActive: user.isActive,
    })
    setShowAddForm(true)
    setError('')
    setSuccess('')
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/users?id=${id}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          setSuccess('User deleted successfully!')
          fetchUsers()
        } else {
          setError('Failed to delete user')
        }
      } catch (error) {
        console.error('Error deleting user:', error)
        setError('Failed to delete user')
      }
    }
  }

  const toggleUserStatus = async (user: User) => {
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: user.id,
          isActive: !user.isActive,
        }),
      })

      if (response.ok) {
        setSuccess(`User ${!user.isActive ? 'activated' : 'deactivated'} successfully!`)
        fetchUsers()
      }
    } catch (error) {
      console.error('Error updating user status:', error)
      setError('Failed to update user status')
    }
  }

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      password: '',
      role: 'WRITER',
      isActive: true,
    })
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = !roleFilter || user.role === roleFilter
    const matchesStatus = !statusFilter ||
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive)
    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'badge-primary'
      case 'SEO':
        return 'badge-info'
      case 'WRITER':
        return 'badge-success'
      default:
        return 'badge-default'
    }
  }

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'ADMIN').length,
    seo: users.filter(u => u.role === 'SEO').length,
    writers: users.filter(u => u.role === 'WRITER').length,
    active: users.filter(u => u.isActive).length,
    inactive: users.filter(u => !u.isActive).length,
  }

  return (
    <div className="page-container">
      <div className="page-content">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="page-title">User Management</h1>
              <p className="text-sm text-muted-foreground">Manage users and permissions</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowAddForm(true)
              setEditingUser(null)
              resetForm()
              setError('')
              setSuccess('')
            }}
            className="btn-primary"
          >
            <PlusIcon className="h-4 w-4" />
            Add User
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-lg text-sm">
            {success}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
                <UsersIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <div className="stat-label">Total</div>
                <div className="stat-value">{stats.total}</div>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg">
                <ShieldCheckIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="stat-label">Admins</div>
                <div className="stat-value text-purple-600 dark:text-purple-400">{stats.admins}</div>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                <UserCircleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="stat-label">SEO Team</div>
                <div className="stat-value text-blue-600 dark:text-blue-400">{stats.seo}</div>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                <UserCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="stat-label">Writers</div>
                <div className="stat-value text-green-600 dark:text-green-400">{stats.writers}</div>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
                <UserCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="stat-label">Active</div>
                <div className="stat-value text-emerald-600 dark:text-emerald-400">{stats.active}</div>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg">
                <UserCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="stat-label">Inactive</div>
                <div className="stat-value text-red-600 dark:text-red-400">{stats.inactive}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filter-bar">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input-field w-auto min-w-[140px]"
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="SEO">SEO</option>
            <option value="WRITER">Writer</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-auto min-w-[140px]"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="table-container">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="spinner-md text-primary"></div>
            </div>
          ) : (
            <div className="table-wrapper scrollbar-thin">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Brands</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="empty-state">
                          <UsersIcon className="empty-state-icon" />
                          <p className="empty-state-title">No users found</p>
                          <p className="empty-state-description">
                            {searchTerm || roleFilter || statusFilter
                              ? 'Try adjusting your filters'
                              : 'Click "Add User" to create your first user'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                              user.role === 'ADMIN'
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                                : user.role === 'SEO'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                            }`}>
                              {(user.name || user.email).charAt(0).toUpperCase()}
                            </div>
                            <span className="cell-primary">{user.name || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap">
                          {user.email}
                        </td>
                        <td className="whitespace-nowrap">
                          <span className={getRoleBadge(user.role)}>
                            {user.role}
                          </span>
                        </td>
                        <td className="whitespace-nowrap">
                          <button
                            onClick={() => toggleUserStatus(user)}
                            className={`${
                              user.isActive ? 'badge-success' : 'badge-destructive'
                            } cursor-pointer hover:opacity-80 transition-opacity`}
                            title={`Click to ${user.isActive ? 'deactivate' : 'activate'} user`}
                          >
                            {user.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="whitespace-nowrap cell-secondary">
                          {user._count?.brands || 0}
                        </td>
                        <td className="whitespace-nowrap cell-secondary">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEdit(user)}
                              className="action-btn"
                              title="Edit user"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              className="action-btn-danger"
                              title="Delete user"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit User Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl">
              <h3 className="text-lg font-semibold mb-4">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                    required
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Password {editingUser ? '(leave blank to keep current)' : '*'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-field"
                    required={!editingUser}
                    placeholder="••••••••"
                  />
                  <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                    Note: Passwords are currently stored in plain text. Hash them in production!
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="input-field"
                    required
                  >
                    <option value="WRITER">Writer</option>
                    <option value="SEO">SEO</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <div className="mt-2 text-xs text-muted-foreground space-y-1">
                    <p><span className="font-medium text-foreground">Admin:</span> Full access to all features</p>
                    <p><span className="font-medium text-foreground">SEO:</span> Manage keywords, rankings, backlinks</p>
                    <p><span className="font-medium text-foreground">Writer:</span> Manage articles only</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <label htmlFor="isActive" className="text-sm text-foreground">
                    Active User
                  </label>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false)
                      setEditingUser(null)
                      resetForm()
                      setError('')
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                  >
                    {editingUser ? 'Update' : 'Create'} User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
