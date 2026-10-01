import { useEffect, useState } from 'react';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch, HiOutlineX } from 'react-icons/hi';
import api from '../api/axios';
import toast from 'react-hot-toast';

const categories = ['mobiles','laptops','tablets','audio','pc-components','gaming-gear'];

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title:'', brand:'', category:'mobiles', price:'', discountPrice:'', stock:'', description:'', isFeatured:false, images:[] });
  const [imageUrl, setImageUrl] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const q = search ? `&search=${search}` : '';
      const { data } = await api.get(`/products?page=${page}&limit=10${q}&sort=-createdAt`);
      setProducts(data.data.products); setPagination(data.pagination);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, [page, search]);

  const openAdd = () => { setEditing(null); setForm({ title:'', brand:'', category:'mobiles', price:'', discountPrice:'', stock:'', description:'', isFeatured:false, images:[] }); setShowModal(true); };
  const openEdit = (p) => { setEditing(p); setForm({ title:p.title, brand:p.brand, category:p.category, price:p.price, discountPrice:p.discountPrice||'', stock:p.stock, description:p.description, isFeatured:p.isFeatured, images:p.images||[] }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/admin/products/${editing._id}`, form);
        toast.success('Product updated');
      } else {
        await api.post('/admin/products', form);
        toast.success('Product created');
      }
      setShowModal(false); fetchProducts();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try { await api.delete(`/admin/products/${id}`); toast.success('Deleted'); fetchProducts(); }
    catch { toast.error('Delete failed'); }
  };

  const addImage = () => { if (imageUrl.trim()) { setForm({...form, images: [...form.images, imageUrl.trim()]}); setImageUrl(''); } };
  const removeImage = (i) => { setForm({...form, images: form.images.filter((_, idx) => idx !== i)}); };

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Products</h1><p className="page-subtitle">{pagination.totalProducts || 0} products total</p></div>
        <button className="btn btn-primary" onClick={openAdd}><HiOutlinePlus size={16} /> Add Product</button>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
          <HiOutlineSearch size={16} style={{ color:'var(--color-text-muted)' }} />
          <input className="input" placeholder="Search products..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ maxWidth:300 }} />
        </div>
      </div>

      <div className="card">
        {loading ? <p style={{ padding:'2rem', textAlign:'center', color:'var(--color-text-muted)' }}>Loading...</p> : (
          <table className="data-table">
            <thead><tr><th>Image</th><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Rating</th><th>Actions</th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id}>
                  <td><img src={p.images?.[0]} alt="" style={{ width:40, height:40, borderRadius:6, objectFit:'cover', background:'var(--color-bg-tertiary)' }} /></td>
                  <td><p style={{ fontWeight:600, fontSize:'0.8125rem' }}>{p.title.length > 40 ? p.title.slice(0,40)+'...' : p.title}</p><p style={{ fontSize:'0.6875rem', color:'var(--color-text-muted)' }}>{p.brand}</p></td>
                  <td><span className="badge badge-primary">{p.category}</span></td>
                  <td style={{ fontWeight:600 }}>${p.discountPrice > 0 ? p.discountPrice : p.price}</td>
                  <td><span className={`badge ${p.stock > 10 ? 'badge-success' : p.stock > 0 ? 'badge-warning' : 'badge-error'}`}>{p.stock}</span></td>
                  <td>{p.rating?.toFixed(1)} ⭐</td>
                  <td><div style={{ display:'flex', gap:'0.25rem' }}>
                    <button className="btn btn-ghost btn-icon" onClick={() => openEdit(p)}><HiOutlinePencil size={15} /></button>
                    <button className="btn btn-ghost btn-icon" onClick={() => handleDelete(p._id)} style={{ color:'var(--color-error)' }}><HiOutlineTrash size={15} /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pagination.totalPages > 1 && (
          <div className="pagination">
            <button className="btn btn-secondary btn-sm" disabled={page<=1} onClick={() => setPage(page-1)}>Prev</button>
            <span style={{ fontSize:'0.8125rem', color:'var(--color-text-muted)' }}>Page {page} of {pagination.totalPages}</span>
            <button className="btn btn-secondary btn-sm" disabled={page>=pagination.totalPages} onClick={() => setPage(page+1)}>Next</button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2>{editing ? 'Edit Product' : 'Add Product'}</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><HiOutlineX size={18} /></button></div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Title</label><input className="input" value={form.title} onChange={(e) => setForm({...form, title:e.target.value})} required /></div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Brand</label><input className="input" value={form.brand} onChange={(e) => setForm({...form, brand:e.target.value})} required /></div>
                  <div className="form-group"><label className="form-label">Category</label><select className="input" value={form.category} onChange={(e) => setForm({...form, category:e.target.value})}>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                </div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Price ($)</label><input className="input" type="number" value={form.price} onChange={(e) => setForm({...form, price:e.target.value})} required /></div>
                  <div className="form-group"><label className="form-label">Discount Price ($)</label><input className="input" type="number" value={form.discountPrice} onChange={(e) => setForm({...form, discountPrice:e.target.value})} /></div>
                </div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Stock</label><input className="input" type="number" value={form.stock} onChange={(e) => setForm({...form, stock:e.target.value})} required /></div>
                  <div className="form-group" style={{ display:'flex', alignItems:'flex-end' }}><label style={{ display:'flex', alignItems:'center', gap:'0.5rem', fontSize:'0.8125rem', cursor:'pointer' }}><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({...form, isFeatured:e.target.checked})} /> Featured</label></div>
                </div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({...form, description:e.target.value})} required /></div>
                <div className="form-group">
                  <label className="form-label">Images (URLs)</label>
                  <div style={{ display:'flex', gap:'0.5rem' }}><input className="input" placeholder="Paste image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} /><button type="button" className="btn btn-secondary" onClick={addImage}>Add</button></div>
                  <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', marginTop:'0.5rem' }}>
                    {form.images.map((img, i) => (
                      <div key={i} style={{ position:'relative' }}>
                        <img src={img} alt="" style={{ width:60, height:60, borderRadius:6, objectFit:'cover' }} />
                        <button type="button" onClick={() => removeImage(i)} style={{ position:'absolute', top:-4, right:-4, background:'var(--color-error)', color:'white', borderRadius:'50%', width:16, height:16, fontSize:'0.6rem', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">{editing ? 'Update' : 'Create'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
