'use client'

import { useState, useEffect } from 'react'
import { UserCircleIcon, PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'

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

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
      setError('Failed to fetch users')
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
      password: '', // Don't show password
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
    return matchesSearch && matchesRole
  })

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800'
      case 'SEO':
        return 'bg-blue-100 text-blue-800'
      case 'WRITER':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'ADMIN').length,
    seo: users.filter(u => u.role === 'SEO').length,
    writers: users.filter(u => u.role === 'WRITER').length,
    active: users.filter(u => u.isActive).length,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="h-8 w-8 text-primary-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                <p className="text-gray-600 mt-1">Manage users and permissions</p>
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
              className="btn-primary flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Add User
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="card">
            <div className="text-sm font-medium text-gray-600">Total Users</div>
            <div className="text-2xl font-semibold text-gray-900 mt-1">{stats.total}</div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-600">Admins</div>
            <div className="text-2xl font-semibold text-purple-600 mt-1">{stats.admins}</div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-600">SEO Team</div>
            <div className="text-2xl font-semibold text-blue-600 mt-1">{stats.seo}</div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-600">Writers</div>
            <div className="text-2xl font-semibold text-green-600 mt-1">{stats.writers}</div>
          </div>
          <div className="card">
            <div className="text-sm font-medium text-gray-600">Active</div>
            <div className="text-2xl font-semibold text-gray-900 mt-1">{stats.active}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input-field"
          >
            <option value="">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="SEO">SEO</option>
            <option value="WRITER">Writer</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Brands
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No users found. Click "Add User" to create your first user.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <UserCircleIcon className="h-8 w-8 text-gray-400 mr-3" />
                          <div className="text-sm font-medium text-gray-900">
                            {user.name || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`status-badge ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleUserStatus(user)}
                          className={`status-badge cursor-pointer ${
                            user.isActive ? 'status-success' : 'status-error'
                          }`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user._count?.brands || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
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
        </div>

        {/* Add/Edit User Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <p className="mt-1 text-xs text-red-600">
                    ⚠️ Note: Passwords are currently stored in plain text. Hash them in production!
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <div className="mt-2 text-xs text-gray-600 space-y-1">
                    <p><strong>Admin:</strong> Full access to all features</p>
                    <p><strong>SEO:</strong> Manage keywords, rankings, backlinks</p>
                    <p><strong>Writer:</strong> Manage articles only</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Active User
                  </label>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t">
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
      </main>
    </div>
  )
}
