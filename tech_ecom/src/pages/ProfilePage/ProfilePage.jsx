import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineUser, HiOutlineLockClosed,
  HiOutlineLocationMarker, HiOutlinePencil, HiOutlineTrash,
  HiOutlinePlusCircle, HiOutlineShoppingBag, HiOutlineHeart,
  HiOutlineX, HiOutlineCheck, HiOutlineLogout, HiOutlineCamera,
  HiOutlineCalendar, HiOutlineExclamation,
} from 'react-icons/hi';
import useAuthStore from '../../stores/authStore';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import './ProfilePage.css';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateProfile, logout, refreshUser } = useAuthStore();
  const avatarInputRef = useRef(null);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Address state
  const [addresses, setAddresses] = useState(user?.addresses || []);
  const [addressModal, setAddressModal] = useState(null);
  const [addressForm, setAddressForm] = useState({
    fullName: '', phone: '', street: '', city: '', state: '', zipCode: '', country: '', isDefault: false,
  });
  const [addressLoading, setAddressLoading] = useState(false);

  // Delete account
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  // Orders count
  const [orderStats, setOrderStats] = useState({ total: 0, active: 0, delivered: 0 });

  useEffect(() => {
    if (user?.addresses) setAddresses(user.addresses);
  }, [user?.addresses]);

  useEffect(() => {
    api.get('/orders/my?limit=100').then(({ data }) => {
      const orders = data.data.orders || [];
      setOrderStats({
        total: orders.length,
        active: orders.filter(o => ['Placed', 'Processing', 'Shipped'].includes(o.orderStatus)).length,
        delivered: orders.filter(o => o.orderStatus === 'Delivered').length,
      });
    }).catch(() => {});
  }, []);

  // ─── Avatar Upload ────────────────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      formData.append('name', user.name); // preserve existing name
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
    } catch {
      toast.error('Failed to remove picture');
    } finally {
      setAvatarLoading(false);
    }
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
    } finally {
      setLoading(false);
    }
  };

  // ─── Change Password ──────────────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
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
    } finally {
      setLoading(false);
    }
  };

  // ─── Address CRUD ─────────────────────────────────────────────────
  const openAddAddress = () => {
    setAddressForm({ fullName: '', phone: '', street: '', city: '', state: '', zipCode: '', country: '', isDefault: false });
    setAddressModal('add');
  };

  const openEditAddress = (addr) => {
    setAddressForm({
      fullName: addr.fullName || '', phone: addr.phone || '', street: addr.street || '',
      city: addr.city || '', state: addr.state || '', zipCode: addr.zipCode || '',
      country: addr.country || '', isDefault: addr.isDefault || false,
    });
    setAddressModal(addr);
  };

  const handleSaveAddress = async () => {
    const required = ['fullName', 'phone', 'street', 'city', 'state', 'zipCode', 'country'];
    for (const field of required) {
      if (!addressForm[field]?.trim()) { toast.error(`Please fill in ${field}`); return; }
    }
    setAddressLoading(true);
    try {
      if (addressModal === 'add') {
        const { data } = await api.post('/users/address', addressForm);
        setAddresses(data.data.addresses);
      } else {
        const { data } = await api.put(`/users/address/${addressModal._id}`, addressForm);
        setAddresses(data.data.addresses);
      }
      await refreshUser();
      toast.success(addressModal === 'add' ? 'Address added!' : 'Address updated!');
      setAddressModal(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save address');
    } finally {
      setAddressLoading(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      const { data } = await api.delete(`/users/address/${addressId}`);
      setAddresses(data.data.addresses);
      await refreshUser();
      toast.success('Address deleted!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete address');
    }
  };

  // ─── Delete Account ───────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') { toast.error('Type DELETE to confirm'); return; }
    try {
      await api.delete('/auth/me');
      await logout();
      toast.success('Account deleted');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete account');
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/');
  };

  if (!user) return null;

  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <HiOutlineUser size={16} /> },
    { id: 'addresses', label: 'Addresses', icon: <HiOutlineLocationMarker size={16} /> },
    { id: 'security', label: 'Security', icon: <HiOutlineLockClosed size={16} /> },
  ];

  return (
    <div className="profile-page">
      <div className="container">
        <h1 className="section-title">My Profile</h1>
        <p className="section-subtitle">Manage your account settings</p>

        <div className="profile-grid">
          {/* ── Sidebar ─────────────────────────────────────────── */}
          <div className="profile-sidebar">
            <motion.div className="profile-card glass-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              {/* Avatar with upload */}
              <div className="profile-avatar-wrapper">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="profile-avatar-img" />
                ) : (
                  <div className="profile-avatar">
                    <span>{user.name?.[0]?.toUpperCase()}</span>
                  </div>
                )}
                <button
                  className="avatar-upload-btn"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarLoading}
                  title="Change profile picture"
                >
                  {avatarLoading ? <div className="avatar-spinner" /> : <HiOutlineCamera size={14} />}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </div>
              {user.avatar && (
                <button className="remove-avatar-btn" onClick={handleRemoveAvatar} disabled={avatarLoading}>
                  Remove Photo
                </button>
              )}

              <h3>{user.name}</h3>
              <p className="profile-email">{user.email}</p>
              <span className={`badge ${user.role === 'admin' ? 'badge-warning' : 'badge-primary'}`}>
                {user.role}
              </span>
              <p className="profile-member-since">
                <HiOutlineCalendar size={12} /> Member since {memberSince}
              </p>

              {/* Quick Stats */}
              <div className="profile-stats">
                <div className="stat-item">
                  <span className="stat-value">{orderStats.total}</span>
                  <span className="stat-label">Orders</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{orderStats.active}</span>
                  <span className="stat-label">Active</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{addresses.length}</span>
                  <span className="stat-label">Addresses</span>
                </div>
              </div>

              {/* Quick Links */}
              <div className="profile-quick-links">
                <Link to="/orders" className="profile-link">
                  <HiOutlineShoppingBag size={16} /> My Orders
                </Link>
                <Link to="/wishlist" className="profile-link">
                  <HiOutlineHeart size={16} /> Wishlist
                </Link>
                <button className="profile-link profile-link-danger" onClick={handleLogout}>
                  <HiOutlineLogout size={16} /> Logout
                </button>
              </div>
            </motion.div>

            {/* Tab Nav */}
            <div className="profile-tabs glass-card">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`profile-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Content Area ─────────────────────────────────────── */}
          <div className="profile-content">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <motion.form className="profile-form glass-card" onSubmit={handleUpdateProfile} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <h3><HiOutlineUser size={18} /> Edit Profile</h3>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </motion.form>
            )}

            {/* Addresses Tab */}
            {activeTab === 'addresses' && (
              <motion.div className="addresses-section" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="addresses-header">
                  <h3><HiOutlineLocationMarker size={18} /> My Addresses</h3>
                  <button className="btn btn-primary btn-sm" onClick={openAddAddress}>
                    <HiOutlinePlusCircle size={16} /> Add Address
                  </button>
                </div>
                {addresses.length === 0 ? (
                  <div className="empty-addresses glass-card">
                    <HiOutlineLocationMarker size={40} />
                    <p>No saved addresses yet</p>
                    <button className="btn btn-primary btn-sm" onClick={openAddAddress}>Add Your First Address</button>
                  </div>
                ) : (
                  <div className="addresses-grid">
                    {addresses.map((addr) => (
                      <div key={addr._id} className={`address-card glass-card ${addr.isDefault ? 'address-default' : ''}`}>
                        {addr.isDefault && <span className="address-badge"><HiOutlineCheck size={12} /> Default</span>}
                        <p className="address-name">{addr.fullName}</p>
                        <p className="address-phone">{addr.phone}</p>
                        <p className="address-line">{addr.street}</p>
                        <p className="address-line">{addr.city}, {addr.state} {addr.zipCode}</p>
                        <p className="address-line">{addr.country}</p>
                        <div className="address-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEditAddress(addr)}>
                            <HiOutlinePencil size={14} /> Edit
                          </button>
                          <button className="btn btn-ghost btn-sm btn-danger-text" onClick={() => handleDeleteAddress(addr._id)}>
                            <HiOutlineTrash size={14} /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="security-section">
                <form className="profile-form glass-card" onSubmit={handleChangePassword}>
                  <h3><HiOutlineLockClosed size={18} /> Change Password</h3>
                  <div className="form-group">
                    <label className="form-label">Current Password</label>
                    <input className="input" type="password" value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input className="input" type="password" value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required minLength={8} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm New Password</label>
                    <input className="input" type="password" value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required minLength={8} />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                </form>

                {/* Danger Zone */}
                <div className="danger-zone glass-card">
                  <h3><HiOutlineExclamation size={18} /> Danger Zone</h3>
                  <p className="danger-description">Permanently delete your account and all associated data. This action cannot be undone.</p>
                  <button className="btn btn-danger" onClick={() => setDeleteModal(true)}>Delete My Account</button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* ── Address Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {addressModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAddressModal(null)}>
            <motion.div className="modal-content glass-card" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{addressModal === 'add' ? 'Add New Address' : 'Edit Address'}</h3>
                <button className="modal-close" onClick={() => setAddressModal(null)}><HiOutlineX size={20} /></button>
              </div>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Full Name</label>
                    <input className="input" value={addressForm.fullName} onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Phone</label>
                    <input className="input" value={addressForm.phone} onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })} /></div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Street Address</label>
                    <input className="input" value={addressForm.street} onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">City</label>
                    <input className="input" value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">State</label>
                    <input className="input" value={addressForm.state} onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">ZIP Code</label>
                    <input className="input" value={addressForm.zipCode} onChange={(e) => setAddressForm({ ...addressForm, zipCode: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Country</label>
                    <input className="input" value={addressForm.country} onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })} /></div>
                </div>
                <label className="checkbox-label" style={{ marginTop: 16 }}>
                  <input type="checkbox" checked={addressForm.isDefault} onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })} />
                  <span>Set as default address</span>
                </label>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setAddressModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveAddress} disabled={addressLoading}>
                  {addressLoading ? 'Saving...' : addressModal === 'add' ? 'Add Address' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Account Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {deleteModal && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteModal(false)}>
            <motion.div className="modal-content glass-card" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Delete Account</h3>
                <button className="modal-close" onClick={() => setDeleteModal(false)}><HiOutlineX size={20} /></button>
              </div>
              <div className="modal-body">
                <div className="cancel-warning">
                  <HiOutlineExclamation size={32} />
                  <p>This will permanently delete your account</p>
                  <p className="cancel-warning-sub">All your orders, addresses, wishlists, and data will be removed. This cannot be undone.</p>
                </div>
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Type <strong>DELETE</strong> to confirm</label>
                  <input className="input" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setDeleteModal(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDeleteAccount} disabled={deleteConfirm !== 'DELETE'}>
                  Delete Forever
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
