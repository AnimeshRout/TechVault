import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineUser, HiOutlineLockClosed, HiOutlineCamera,
  HiOutlineCalendar, HiOutlineExclamation, HiOutlineMail,
} from 'react-icons/hi';
import useAuthStore from '../stores/authStore';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuthStore();
  const avatarInputRef = useRef(null);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  // ─── Avatar Upload ────────────────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }

    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      formData.append('name', user.name);
      await updateProfile(formData);
      toast.success('Profile picture updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload picture');
    } finally {
      setAvatarLoading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarLoading(true);
    try {
      await updateProfile({ avatar: '' });
      toast.success('Profile picture removed');
    } catch { toast.error('Failed to remove picture'); }
    finally { setAvatarLoading(false); }
  };

  // ─── Profile Update ───────────────────────────────────────────────
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({ name, email });
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Update failed');
    } finally { setLoading(false); }
  };

  // ─── Change Password ──────────────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match'); return;
    }
    setLoading(true);
    try {
      await api.put('/users/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Password changed!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed');
    } finally { setLoading(false); }
  };

  if (!user) return null;

  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">Manage your admin account</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '1.5rem' }}>
        {/* ── Sidebar Card ─────────────────────────────────────── */}
        <div className="card" style={{ alignSelf: 'start', textAlign: 'center', padding: '2rem' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 1rem' }}>
            {user.avatar ? (
              <img src={user.avatar} alt={user.name}
                style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--color-primary-glow)' }} />
            ) : (
              <div style={{
                width: 96, height: 96, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.25rem', fontWeight: 800, color: 'white',
              }}>
                {user.name?.[0]?.toUpperCase()}
              </div>
            )}
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarLoading}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--color-primary)', color: 'white',
                border: '2px solid var(--color-bg-card)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'transform 150ms ease',
              }}
              title="Change profile picture"
            >
              {avatarLoading ? (
                <div style={{
                  width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white', borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                }} />
              ) : <HiOutlineCamera size={14} />}
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          </div>

          {user.avatar && (
            <button onClick={handleRemoveAvatar} disabled={avatarLoading}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.6875rem', color: 'var(--color-error)',
                opacity: 0.7, marginBottom: '0.75rem',
              }}>
              Remove Photo
            </button>
          )}

          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>{user.name}</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>{user.email}</p>
          <span className="badge badge-warning" style={{ marginBottom: '0.75rem' }}>{user.role}</span>
          <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
            <HiOutlineCalendar size={12} /> Member since {memberSince}
          </p>

          {/* Section Nav */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
            {[
              { id: 'profile', label: 'Edit Profile', icon: <HiOutlineUser size={16} /> },
              { id: 'security', label: 'Security', icon: <HiOutlineLockClosed size={16} /> },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem', fontWeight: activeSection === s.id ? 600 : 500,
                  color: activeSection === s.id ? 'var(--color-primary-light)' : 'var(--color-text-muted)',
                  background: activeSection === s.id ? 'var(--color-primary-glow)' : 'transparent',
                  border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                  transition: 'all 150ms ease',
                }}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content Area ─────────────────────────────────────── */}
        <div>
          {activeSection === 'profile' && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                <HiOutlineUser size={18} /> Edit Profile
              </h3>
              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>Name</label>
                  <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} required
                    style={{ width: '100%', padding: '0.625rem 0.875rem', background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)', fontSize: '0.875rem', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>Email</label>
                  <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                    style={{ width: '100%', padding: '0.625rem 0.875rem', background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)', fontSize: '0.875rem', outline: 'none' }} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          )}

          {activeSection === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                  <HiOutlineLockClosed size={18} /> Change Password
                </h3>
                <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>Current Password</label>
                    <input type="password" value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required
                      style={{ width: '100%', padding: '0.625rem 0.875rem', background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)', fontSize: '0.875rem', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>New Password</label>
                    <input type="password" value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required minLength={8}
                      style={{ width: '100%', padding: '0.625rem 0.875rem', background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)', fontSize: '0.875rem', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.375rem', color: 'var(--color-text-secondary)' }}>Confirm New Password</label>
                    <input type="password" value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required minLength={8}
                      style={{ width: '100%', padding: '0.625rem 0.875rem', background: 'var(--color-bg-input)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)', fontSize: '0.875rem', outline: 'none' }} />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: 'flex-start' }}>
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Spinner keyframe for avatar */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
