import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try { const { data } = await api.get('/admin/users'); setUsers(data.data.users || []); }
    catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Change role to ${newRole}?`)) return;
    try { await api.put(`/admin/users/${userId}`, { role: newRole }); toast.success(`Role changed to ${newRole}`); fetchUsers(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const toggleStatus = async (userId, isActive) => {
    try { await api.put(`/admin/users/${userId}`, { isActive: !isActive }); toast.success(isActive ? 'User deactivated' : 'User activated'); fetchUsers(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Users</h1><p className="page-subtitle">{users.length} registered users</p></div>
      </div>

      <div className="card">
        {loading ? <p style={{ padding:'2rem', textAlign:'center', color:'var(--color-text-muted)' }}>Loading...</p> : (
          <table className="data-table">
            <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td><div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', background:'linear-gradient(135deg, var(--color-primary), var(--color-accent))', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'0.75rem', fontWeight:700, flexShrink:0 }}>{u.name?.[0]?.toUpperCase()}</div>
                    <span style={{ fontWeight:600, fontSize:'0.8125rem' }}>{u.name}</span>
                  </div></td>
                  <td style={{ fontSize:'0.8125rem', color:'var(--color-text-secondary)' }}>{u.email}</td>
                  <td><span className={`badge ${u.role === 'admin' ? 'badge-warning' : 'badge-primary'}`}>{u.role}</span></td>
                  <td><span className={`badge ${u.isActive !== false ? 'badge-success' : 'badge-error'}`}>{u.isActive !== false ? 'Active' : 'Inactive'}</span></td>
                  <td style={{ color:'var(--color-text-muted)', fontSize:'0.75rem' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td><div style={{ display:'flex', gap:'0.25rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleRole(u._id, u.role)}>{u.role === 'admin' ? 'Demote' : 'Promote'}</button>
                    <button className={`btn btn-sm ${u.isActive !== false ? 'btn-danger' : 'btn-success'}`} onClick={() => toggleStatus(u._id, u.isActive !== false)}>{u.isActive !== false ? 'Deactivate' : 'Activate'}</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
