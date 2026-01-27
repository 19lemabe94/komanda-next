'use client'
import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { colors, globalStyles } from '../styles/theme'
import { Header } from '../components/Header'
import { MenuExportModal } from '../components/MenuExportModal' // <--- NOVO IMPORT

// --- ÍCONES SVG ---
const IconSearch = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
const IconPlus = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
const IconTag = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
const IconEdit = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
const IconTrash = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
const IconX = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
const IconCheck = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
const IconPdf = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>

// --- PALETA DE CORES EXPANDIDA (15 CORES VIBRANTES) ---
const COLOR_PALETTE = [
  '#ef4444', '#dc2626', '#f97316', '#ea580c', '#d97706', 
  '#65a30d', '#16a34a', '#059669', '#0d9488', '#0891b2', 
  '#2563eb', '#4f46e5', '#7c3aed', '#c026d3', '#be123c'
]

// Tipos
type Product = { id: string, name: string, description: string, price: number, category: string, active: boolean, org_id: string }
type Category = { id: string, name: string, color: string, org_id: string }

export default function ProductsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [myOrgId, setMyOrgId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null) 
  
  // Listas de Dados
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('TODAS')

  // Modais
  const [showProductModal, setShowProductModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false) // <--- ESTADO EXPORTAR
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null) 
  
  const [submitting, setSubmitting] = useState(false)

  // Formulários
  const [prodForm, setProdForm] = useState({ name: '', description: '', price: '', category: '' })
  const [catName, setCatName] = useState('')
  const [catColor, setCatColor] = useState(COLOR_PALETTE[10])

  // Estilos
  const grenaColor = '#800020'
  const touchBtnStyle = { 
    padding: '12px 16px', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem', 
    cursor: 'pointer', border: 'none', minHeight: '48px', 
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.1s' 
  }

  useEffect(() => { initPage() }, [])

  const initPage = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('id', session.user.id).single()
    if (profile?.org_id) {
      setMyOrgId(profile.org_id)
      setUserRole(profile.role)
      fetchData(profile.org_id)
    } else { router.push('/setup') }
  }

  const fetchData = async (orgId: string) => {
    const { data: catData } = await supabase.from('categories').select('*').eq('org_id', orgId).order('name', { ascending: true })
    if (catData) {
      setCategories(catData)
      if (catData.length > 0 && !prodForm.category && !editingProduct) { setProdForm(prev => ({ ...prev, category: catData[0].name })) }
    }
    const { data: prodData } = await supabase.from('products').select('*').eq('org_id', orgId).order('name', { ascending: true })
    if (prodData) setProducts(prodData || [])
    setLoading(false)
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'TODAS' || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // --- CRUD MODALS ---
  const openCreateModal = () => {
    setEditingProduct(null)
    setProdForm({ name: '', description: '', price: '', category: categories.length > 0 ? categories[0].name : '' })
    setShowProductModal(true)
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setProdForm({ name: product.name, description: product.description || '', price: product.price.toString(), category: product.category })
    setShowProductModal(true)
  }

  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault()
    if (!myOrgId) return
    setSubmitting(true)
    const priceNumber = parseFloat(prodForm.price.replace(',', '.'))

    if (!prodForm.name || isNaN(priceNumber) || !prodForm.category) { alert('Preencha os campos obrigatórios.'); setSubmitting(false); return }

    const finalName = prodForm.name.trim().toLowerCase() // Nome em minúsculo para busca
    const payload = { name: finalName, description: prodForm.description, price: priceNumber, category: prodForm.category, org_id: myOrgId, active: true }

    try {
        if (editingProduct) {
            const { error } = await supabase.from('products').update(payload).eq('id', editingProduct.id)
            if (error) throw error
        } else {
            const { error } = await supabase.from('products').insert([payload])
            if (error) throw error
        }
        setShowProductModal(false)
        fetchData(myOrgId)
    } catch (error: any) { alert('Erro: ' + error.message) } 
    finally { setSubmitting(false) }
  }

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Excluir "${name}"?`)) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  // --- LÓGICA DE CATEGORIA (CRIAR E EDITAR) ---
  const startEditCategory = (cat: Category) => {
    setEditingCategory(cat)
    setCatName(cat.name)
    setCatColor(cat.color)
  }

  const cancelEditCategory = () => {
    setEditingCategory(null)
    setCatName('')
    setCatColor(COLOR_PALETTE[10])
  }

  const handleSaveCategory = async (e: FormEvent) => {
    e.preventDefault()
    if (!catName.trim() || !myOrgId) return

    if (editingCategory) {
        const { error } = await supabase.from('categories').update({ name: catName.trim(), color: catColor }).eq('id', editingCategory.id)
        if (!error) { 
            cancelEditCategory()
            fetchData(myOrgId)
        }
    } else {
        const { error } = await supabase.from('categories').insert([{ name: catName.trim(), color: catColor, org_id: myOrgId }])
        if (!error) { 
            setCatName('')
            fetchData(myOrgId)
        }
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Excluir categoria? Produtos desta categoria ficarão sem cor.')) return
    await supabase.from('categories').delete().eq('id', id)
    if (myOrgId) fetchData(myOrgId)
  }

  const getCategoryColor = (catName: string) => {
    const found = categories.find(c => c.name === catName)
    return found ? found.color : '#94a3b8'
  }

  return (
    <div style={{ ...globalStyles.container, justifyContent: 'flex-start', background: '#f8fafc' }}>
      
      <Header userRole={userRole} subtitle="MENU / CARDÁPIO" />

      <main style={{ width: '100%', maxWidth: '900px', padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* TOPO: TÍTULO E BOTÕES */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', color: colors.text, margin: 0 }}>Gerenciar Produtos</h2>
            <span style={{ fontSize: '0.85rem', color: colors.textMuted }}>{products.length} itens cadastrados</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {/* BOTÃO CATEGORIAS */}
            <button onClick={() => setShowCategoryModal(true)} style={{ ...touchBtnStyle, background: 'white', border: `1px solid ${colors.border}`, color: colors.text }} title="Gerenciar Categorias">
                <IconTag />
            </button>
            
            {/* BOTÃO EXPORTAR PDF (NOVO) */}
            <button onClick={() => setIsExportModalOpen(true)} style={{ ...touchBtnStyle, background: 'white', border: `1px solid ${colors.primary}`, color: colors.primary }} title="Exportar PDF">
                <IconPdf />
            </button>

            {/* BOTÃO NOVO PRODUTO */}
            <button onClick={openCreateModal} style={{ ...touchBtnStyle, backgroundColor: grenaColor, color: 'white' }}>
                <IconPlus /> Novo
            </button>
          </div>
        </div>

        {/* BARRA DE PESQUISA */}
        <div style={{ position: 'relative', marginBottom: '15px' }}>
           <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: colors.textMuted }}><IconSearch /></span>
           <input 
             type="text" 
             placeholder="Buscar produto..." 
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             style={{ width: '100%', padding: '15px 15px 15px 50px', borderRadius: '12px', border: `1px solid ${colors.border}`, fontSize: '1rem', outline: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', height: '52px' }}
           />
           {searchTerm && (
             <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><IconX /></button>
           )}
        </div>

        {/* FILTROS DE CATEGORIA (SCROLL) */}
        <div className="no-scrollbar" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '15px' }}>
           <button 
             onClick={() => setSelectedCategory('TODAS')}
             style={{ 
               padding: '10px 20px', borderRadius: '25px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 800, fontSize: '0.8rem',
               backgroundColor: selectedCategory === 'TODAS' ? colors.text : 'white',
               color: selectedCategory === 'TODAS' ? 'white' : colors.textMuted,
               border: selectedCategory === 'TODAS' ? 'none' : `1px solid ${colors.border}`,
               boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
             }}
           >
             TODAS
           </button>
           {categories.map(cat => (
             <button 
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                style={{ 
                  padding: '10px 20px', borderRadius: '25px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 800, fontSize: '0.8rem',
                  backgroundColor: selectedCategory === cat.name ? cat.color : 'white',
                  color: selectedCategory === cat.name ? 'white' : colors.text,
                  border: selectedCategory === cat.name ? 'none' : `1px solid ${colors.border}`,
                  boxShadow: selectedCategory === cat.name ? `0 4px 10px ${cat.color}60` : '0 2px 5px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s'
                }}
             >
               {cat.name}
             </button>
           ))}
        </div>

        {/* LISTA DE PRODUTOS */}
        {loading ? <p style={{textAlign: 'center', color: colors.textMuted, marginTop: '40px'}}>Carregando...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto', paddingBottom: '30px' }}>
            {filteredProducts.map(item => (
              <div key={item.id} style={{
                backgroundColor: 'white', padding: '20px', borderRadius: '16px',
                border: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
              }}>
                <div style={{ flex: 1, paddingRight: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, color: colors.text, fontSize: '1.1rem', textTransform: 'capitalize' }}>{item.name}</span>
                    <span style={{ fontSize: '0.65rem', padding: '4px 10px', borderRadius: '12px', backgroundColor: getCategoryColor(item.category), color: 'white', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      {item.category}
                    </span>
                  </div>
                  {item.description && <p style={{ margin: 0, fontSize: '0.85rem', color: colors.textMuted }}>{item.description}</p>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ fontWeight: 900, color: grenaColor, fontSize: '1.2rem' }}>R$ {item.price.toFixed(2)}</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => openEditModal(item)} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', color: colors.text, width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconEdit /></button>
                    <button onClick={() => handleDeleteProduct(item.id, item.name)} style={{ background: '#fee2e2', border: 'none', cursor: 'pointer', color: '#ef4444', width: '42px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><IconTrash /></button>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredProducts.length === 0 && (
                <div style={{textAlign: 'center', padding: '50px', color: colors.textMuted, opacity: 0.7}}>
                    <div style={{fontSize: '2rem', marginBottom: '10px'}}>📦</div>
                    {searchTerm ? 'Nenhum produto encontrado.' : 'Nenhum produto nesta categoria.'}
                </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: PRODUTO (Create/Edit) */}
      {showProductModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
          <div style={{ ...globalStyles.card, width: '90%', maxWidth: '450px', padding: '30px' }}>
            <h3 style={{ marginTop: 0, color: grenaColor, fontSize: '1.4rem' }}>{editingProduct ? 'Editar Item' : 'Novo Item'}</h3>
            <form onSubmit={handleSaveProduct}>
              <label style={{display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: colors.textMuted, fontWeight: 700}}>Nome</label>
              <input required value={prodForm.name} onChange={e => setProdForm({...prodForm, name: e.target.value})} style={{...globalStyles.input, padding: '12px'}} placeholder="Ex: X-Bacon" />
              
              <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: colors.textMuted, fontWeight: 700}}>Preço (R$)</label>
                  <input required type="number" step="0.01" value={prodForm.price} onChange={e => setProdForm({...prodForm, price: e.target.value})} style={{...globalStyles.input, padding: '12px'}} placeholder="0.00" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: colors.textMuted, fontWeight: 700}}>Categoria</label>
                  <select value={prodForm.category} onChange={e => setProdForm({...prodForm, category: e.target.value})} style={{...globalStyles.input, height: '48px'}}>
                    <option value="" disabled>Selecione...</option>
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                  </select>
                </div>
              </div>
              
              <label style={{display: 'block', fontSize: '0.9rem', marginBottom: '8px', marginTop: '15px', color: colors.textMuted, fontWeight: 700}}>Descrição (Opcional)</label>
              <textarea value={prodForm.description} onChange={e => setProdForm({...prodForm, description: e.target.value})} style={{...globalStyles.input, resize: 'none', padding: '12px'}} rows={3} placeholder="Ingredientes, observações..." />
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowProductModal(false)} style={{ ...touchBtnStyle, flex: 1, border: '2px solid #ccc', background: 'transparent' }}>Cancelar</button>
                <button type="submit" disabled={submitting} style={{ ...touchBtnStyle, ...globalStyles.buttonPrimary, backgroundColor: grenaColor, flex: 1 }}>{submitting ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CATEGORIAS (Listar, Criar e Editar) */}
      {showCategoryModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
          <div style={{ ...globalStyles.card, width: '90%', maxWidth: '380px', padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: colors.text, fontSize: '1.3rem' }}>Categorias</h3>
              <button onClick={() => setShowCategoryModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: colors.text }}><IconX /></button>
            </div>

            {/* LISTA DE CATEGORIAS */}
            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '25px', border: `1px solid ${colors.border}`, borderRadius: '12px' }}>
              {categories.map(cat => (
                <div key={cat.id} style={{ padding: '12px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: editingCategory?.id === cat.id ? '#f0f9ff' : 'white' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: cat.color }} />
                    <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{cat.name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => startEditCategory(cat)} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}><IconEdit /></button>
                    <button onClick={() => handleDeleteCategory(cat.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}><IconTrash /></button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && <p style={{ padding: '15px', textAlign: 'center', color: colors.textMuted, fontSize: '0.9rem' }}>Nenhuma categoria criada.</p>}
            </div>

            {/* FORMULÁRIO DE CATEGORIA (Criação e Edição) */}
            <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{display: 'block', fontSize: '0.9rem', color: colors.textMuted, fontWeight: 700}}>
                        {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                    </label>
                    {editingCategory && (
                        <button onClick={cancelEditCategory} style={{ fontSize: '0.8rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Cancelar</button>
                    )}
                </div>
                
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Nome..." style={{ ...globalStyles.input, flex: 1, padding: '12px' }} />
                    <button onClick={handleSaveCategory} style={{ ...globalStyles.buttonPrimary, backgroundColor: editingCategory ? '#3b82f6' : grenaColor, width: 'auto', padding: '0 20px', borderRadius: '12px' }}>
                        {editingCategory ? <IconCheck /> : <IconPlus />}
                    </button>
                </div>
                
                <label style={{display: 'block', fontSize: '0.8rem', marginBottom: '8px', color: colors.textMuted}}>Cor da Etiqueta:</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {COLOR_PALETTE.map(color => (
                        <button 
                            key={color} 
                            onClick={() => setCatColor(color)}
                            style={{ 
                                width: '32px', height: '32px', borderRadius: '50%', backgroundColor: color, cursor: 'pointer',
                                border: catColor === color ? `3px solid ${colors.text}` : '2px solid transparent',
                                transform: catColor === color ? 'scale(1.1)' : 'scale(1)',
                                transition: 'all 0.2s'
                            }}
                        />
                    ))}
                </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 3: EXPORTAR CARDÁPIO (Novo) */}
      <MenuExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        categories={categories}
        products={products}
      />

      <style jsx>{`
        @media (max-width: 600px) {
            .hide-mobile { display: none; }
        }
      `}</style>

    </div>
  )
}