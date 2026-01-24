// app/components/admin/ImpersonateUserButton.tsx
'use client';

import { useState, useEffect } from 'react';
import { Users, Mail } from 'lucide-react';
import { useImpersonation } from '@/hooks/useImpersonation';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ImpersonateUserButtonProps {
  users?: User[];
  onUsersLoad?: () => Promise<User[]>;
}

export function ImpersonateUserButton({ users: initialUsers, onUsersLoad }: ImpersonateUserButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<User[]>(initialUsers || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [reason, setReason] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { startImpersonation } = useImpersonation();

    
  const [recentUsers, setRecentUsers] = useState<User[]>([]);

  useEffect(() => {
    if (initialUsers) {
      setUsers(initialUsers);
      // Load recent from localStorage
      try {
        const stored = localStorage.getItem('recentImpersonations');
        if (stored) {
          const recentIds = JSON.parse(stored);
          const recent = initialUsers.filter(u => recentIds.includes(u.id)).slice(0, 3);
          setRecentUsers(recent);
        }
      } catch (e) {
        // Ignore
      }
    }
  }, [initialUsers]);

  const openModal = async () => {
    setIsOpen(true);
    if (!users.length && onUsersLoad) {
      setLoading(true);
      try {
        const loadedUsers = await onUsersLoad();
        setUsers(loadedUsers);
      } catch (error) {
        console.error('Failed to load users:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setSearchQuery('');
    setReason('');
    setSelectedUser(null);
  };

  const handleImpersonate = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      // Save to recent
      try {
        const stored = localStorage.getItem('recentImpersonations');
        const recent = stored ? JSON.parse(stored) : [];
        const updated = [selectedUser.id, ...recent.filter((id: string) => id !== selectedUser.id)].slice(0, 5);
        localStorage.setItem('recentImpersonations', JSON.stringify(updated));
      } catch (e) {
        // Ignore
      }
      await startImpersonation(selectedUser.id, reason);
      closeModal();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to start impersonation');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <button
        onClick={openModal}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Users className="h-4 w-4" />
        Impersonate User
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-gray-900">Impersonate User</h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600">
                View the application as another user. All actions will be logged.
              </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {!selectedUser ? (
                <>
                    {/* Recently Impersonated */}
                    {recentUsers.length > 0 && !selectedUser && (
                      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h3 className="text-sm font-semibold text-blue-900 mb-3">? Recently Impersonated</h3>
                        <div className="flex flex-wrap gap-2">
                          {recentUsers.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => setSelectedUser(user)}
                              className="px-3 py-1.5 bg-white border border-blue-300 rounded-full text-sm hover:bg-blue-100 hover:border-blue-400 transition-colors flex items-center gap-2"
                            >
                              <Mail className="h-3 w-3" />
                              <span className="font-medium">{user.name || user.email}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Search */}
                  <div className="relative mb-4">
                    <input
                      type="text"
                      placeholder="Search users by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* User List */}
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => setSelectedUser(user)}
                          className="w-full p-4 text-left border rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{user.name}</p>
                              <p className="text-sm text-gray-500 truncate">{user.email}</p>
                            </div>
                            <div className="flex-shrink-0">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {user.role}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                      {filteredUsers.length === 0 && (
                        <p className="text-center text-gray-500 py-8">No users found</p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Selected User */}
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-1">Selected User:</p>
                    <p className="font-semibold text-gray-900">{selectedUser.name}</p>
                    <p className="text-sm text-gray-600">{selectedUser.email}</p>
                    <p className="text-sm text-gray-600">Role: {selectedUser.role}</p>
                  </div>

                  {/* Reason Input */}
                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Impersonation (Optional)
                    </label>
                    <textarea
                      id="reason"
                      rows={3}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="e.g., Troubleshooting issue with quote generation..."
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Warning */}
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <strong>?? Warning:</strong> All actions taken while impersonating will be logged
                      and associated with your admin account for audit purposes.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50">
              <div className="flex items-center justify-end gap-3">
                {selectedUser && (
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 bg-white border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                {selectedUser && (
                  <button
                    onClick={handleImpersonate}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Starting...
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4" />
                        Start Impersonation
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}




