"use client";

import { useState, useEffect } from "react";
import { X, Edit2, Save, RefreshCw, AlertCircle } from "lucide-react";

// Get backend URL from environment variable
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

// Debug logging (will be visible in browser console)
if (typeof window !== 'undefined') {
  console.log('[AdminDashboard] Backend URL:', BACKEND_URL);
}

interface User {
  id: string;
  google_id: string;
  email: string;
  name: string | null;
  photo_url: string | null;
  queries_used: number;
  pdfs_uploaded: number;
  max_queries: number;
  max_pdfs: number;
  has_own_keys: boolean;
  created_at: string;
}

interface AdminDashboardProps {
  onClose: () => void;
  adminEmail: string;
  adminId: string;
}

export function AdminDashboard({ onClose, adminEmail, adminId }: AdminDashboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    max_queries: number;
    max_pdfs: number;
    queries_used: number;
    pdfs_uploaded: number;
  } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/admin/users`, {
        headers: {
          "x-user-id": adminId,
          "x-user-email": adminEmail,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Unauthorized: Admin access required");
        }
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (user: User) => {
    setEditingUser(user.google_id);
    setEditValues({
      max_queries: user.max_queries,
      max_pdfs: user.max_pdfs,
      queries_used: user.queries_used,
      pdfs_uploaded: user.pdfs_uploaded,
    });
  };

  const handleSave = async (userId: string) => {
    if (!editValues) return;

    try {
      const response = await fetch(`${BACKEND_URL}/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": adminId,
          "x-user-email": adminEmail,
        },
        body: JSON.stringify(editValues),
      });

      if (!response.ok) {
        throw new Error("Failed to update user");
      }

      const data = await response.json();

      // Update the user in the list
      setUsers(users.map(u => u.google_id === userId ? data.user : u));
      setEditingUser(null);
      setEditValues(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update user");
    }
  };

  const handleCancel = () => {
    setEditingUser(null);
    setEditValues(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-6xl max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-2xl font-semibold">Admin Dashboard</h2>
            <p className="text-sm text-gray-600">Manage user quotas and view statistics</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchUsers}
              className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold transition hover:bg-gray-100"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center rounded-lg border border-gray-300 p-2 transition hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">Loading users...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">No users found</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold">User</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Queries Used</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Max Queries</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">PDFs Uploaded</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Max PDFs</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Own Keys</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isEditing = editingUser === user.google_id;
                    return (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {user.photo_url && (
                              <img
                                src={user.photo_url}
                                alt={user.name || "User"}
                                className="h-8 w-8 rounded-full border border-gray-200"
                              />
                            )}
                            <span className="font-medium">{user.name || "Unknown"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              value={editValues?.queries_used || 0}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues!,
                                  queries_used: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-20 rounded border border-gray-300 px-2 py-1 text-center text-sm"
                            />
                          ) : (
                            <span className="text-sm">{user.queries_used}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              value={editValues?.max_queries || 0}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues!,
                                  max_queries: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-20 rounded border border-gray-300 px-2 py-1 text-center text-sm"
                            />
                          ) : (
                            <span className="text-sm font-semibold">{user.max_queries}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              value={editValues?.pdfs_uploaded || 0}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues!,
                                  pdfs_uploaded: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-20 rounded border border-gray-300 px-2 py-1 text-center text-sm"
                            />
                          ) : (
                            <span className="text-sm">{user.pdfs_uploaded}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              value={editValues?.max_pdfs || 0}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues!,
                                  max_pdfs: parseInt(e.target.value) || 0,
                                })
                              }
                              className="w-20 rounded border border-gray-300 px-2 py-1 text-center text-sm"
                            />
                          ) : (
                            <span className="text-sm font-semibold">{user.max_pdfs}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                              user.has_own_keys
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {user.has_own_keys ? "Yes" : "No"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleSave(user.google_id)}
                                className="flex items-center gap-1 rounded border border-transparent bg-blue-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-blue-700"
                              >
                                <Save className="h-3 w-3" />
                                Save
                              </button>
                              <button
                                onClick={handleCancel}
                                className="rounded border border-gray-300 px-3 py-1 text-xs font-semibold transition hover:bg-gray-100"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEdit(user)}
                              className="flex items-center gap-1 rounded border border-gray-300 px-3 py-1 text-xs font-semibold transition hover:bg-gray-100"
                            >
                              <Edit2 className="h-3 w-3" />
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Total Users: {users.length}</span>
            <span>
              Users with own keys: {users.filter((u) => u.has_own_keys).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
