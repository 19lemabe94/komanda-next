'use client'
import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { colors, globalStyles } from '../styles/theme'
// Importamos o Header centralizado
import { Header } from '../components/Header'

// Tipos
type Product = {
  id: string
  name: string
  description: string
  price: number
  category: string
  org_id: string
}

type Category = {
  id: string
  name: string
  color: string
  org_id: string
}

export default function ProductsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [myOrgId, setMyOrgId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null) 
  
  // Listas de Dados
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  // --- NOVOS ESTADOS DE FILTRO ---
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('TODAS')

  // Controle de Modais
  const [showProductModal, setShowProductModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Formulários
  const [prodForm, setProdForm] = useState({ name: '', description: '', price: '', category: '' })
  const [catName, setCatName] = useState('')

  useEffect(() => {
    initPage()
  }, [])

  const initPage = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles').select('org_id, role').eq('id', session.user.id).single()

    if (profile?.org_id) {
      setMyOrgId(profile.org_id)
      setUserRole(profile.role)
      fetchData(profile.org_id)
    } else {
      router.push('/setup')
    }
  }

  const fetchData = async (orgId: string) => {
    // 1. Busca Categorias
    const { data: catData } = await supabase
      .from('categories').select('*').eq('org_id', orgId).order('name', { ascending: true })
    
    if (catData) {
      setCategories(catData)
      if (catData.length > 0 && !prodForm.category && !editingProduct) {
        setProdForm(prev => ({ ...prev, category: catData[0].name }))
      }
    }

    // 2. Busca Produtos
    const { data: prodData } = await supabase
      .from('products').select('*').eq('org_id', orgId).order('name', { ascending: true })
    
    if (prodData) setProducts(prodData || [])
    
    setLoading(false)
  }

  // --- LÓGICA DE FILTRAGEM ---
  const filteredProducts = products.filter(product => {
    // Filtro por Nome (Case insensitive)
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    // Filtro por Categoria
    const matchesCategory = selectedCategory === 'TODAS' || product.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  // --- MODAL CONTROLLERS ---
  const openCreateModal = () => {
    setEditingProduct(null)
    setProdForm({ name: '', description: '', price: '', category: categories.length > 0 ? categories[0].name : '' })
    setShowProductModal(true)
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setProdForm({
        name: product.name, description: product.description || '',
        price: product.price.toString(), category: product.category
    })
    setShowProductModal(true)
  }

  // --- CRUD ACTIONS ---
  const handleSaveProduct = async (e: FormEvent) => {
    e.preventDefault()
    if (!myOrgId) return
    setSubmitting(true)
    const priceNumber = parseFloat(prodForm.price.replace(',', '.'))

    if (!prodForm.name || isNaN(priceNumber) || !prodForm.category) {
      alert('Preencha os campos obrigatórios.')
      setSubmitting(false); return
    }

    // --- AQUI APLICAMOS A PADRONIZAÇÃO LOWERCASE ---
    // .trim() remove espaços extras no começo e fim
    // .toLowerCase() converte tudo para minúsculo
    const finalName = prodForm.name.trim().toLowerCase()

    const payload = { 
        name: finalName, 
        description: prodForm.description, 
        price: priceNumber, 
        category: prodForm.category, 
        org_id: myOrgId 
    }

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

  const handleCreateCategory = async (e: FormEvent) => {
    e.preventDefault()
    if (!catName.trim() || !myOrgId) return
    const randomColor = "hsl(" + 360 * Math.random() + ',' + (25 + 70 * Math.random()) + '%,' + (40 + 10 * Math.random()) + '%)'
    const { error } = await supabase.from('categories').insert([{ name: catName.trim(), color: randomColor, org_id: myOrgId }])
    if (!error) { setCatName(''); fetchData(myOrgId); }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Excluir categoria? Produtos não serão apagados.')) return
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

      <main style={{ width: '100%', maxWidth: '800px', padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* TOPO: BOTÕES DE AÇÃO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', color: colors.text, margin: 0 }}>Gerenciar Produtos</h2>
            <span style={{ fontSize: '0.8rem', color: colors.textMuted }}>{products.length} itens no total</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowCategoryModal(true)} style={{ background: 'white', border: `1px solid ${colors.border}`, color: colors.text, padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>🏷️ Categ.</button>
            <button onClick={openCreateModal} style={{ backgroundColor: colors.primary, color: 'white', border: 'none', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>+ Novo</button>
          </div>
        </div>

        {/* BARRA DE PESQUISA */}
        <div style={{ position: 'relative', marginBottom: '15px' }}>
           <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem', opacity: 0.5 }}>🔍</span>
           <input 
             type="text" 
             placeholder="Buscar por nome..." 
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             style={{ 
               width: '100%', padding: '12px 12px 12px 45px', borderRadius: '12px', border: `1px solid ${colors.border}`,
               fontSize: '1rem', outline: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
             }}
           />
           {searchTerm && (
             <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
           )}
        </div>

        {/* FILTROS RÁPIDOS (SCROLL HORIZONTAL) */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '10px', scrollbarWidth: 'none' }}>
           {/* Botão TODAS */}
           <button 
             onClick={() => setSelectedCategory('TODAS')}
             style={{ 
               padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 700, fontSize: '0.85rem',
               backgroundColor: selectedCategory === 'TODAS' ? colors.text : '#e2e8f0',
               color: selectedCategory === 'TODAS' ? 'white' : colors.textMuted,
               border: 'none',
               transition: 'all 0.2s'
             }}
           >
             TODAS
           </button>
           
           {/* Categorias Dinâmicas */}
           {categories.map(cat => (
             <button 
               key={cat.id}
               onClick={() => setSelectedCategory(cat.name)}
               style={{ 
                 padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 700, fontSize: '0.85rem',
                 backgroundColor: selectedCategory === cat.name ? cat.color : 'white',
                 color: selectedCategory === cat.name ? 'white' : colors.text,
                 border: selectedCategory === cat.name ? 'none' : `1px solid ${colors.border}`,
                 boxShadow: selectedCategory === cat.name ? `0 4px 10px ${cat.color}60` : 'none',
                 transition: 'all 0.2s'
               }}
             >
               {cat.name}
             </button>
           ))}
        </div>

        {/* LISTA DE PRODUTOS FILTRADA */}
        {loading ? <p style={{textAlign: 'center', color: colors.textMuted, marginTop: '20px'}}>Carregando...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', paddingBottom: '20px' }}>
            {filteredProducts.map(item => (
              <div key={item.id} style={{
                backgroundColor: 'white', padding: '15px', borderRadius: '12px',
                border: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}>
                <div style={{ flex: 1, paddingRight: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    {/* NOME AGORA É SEMPRE MINÚSCULO MAS COM CAPITALIZAÇÃO CSS */}
                    <span style={{ fontWeight: 800, color: colors.text, fontSize: '1.05rem', textTransform: 'capitalize' }}>{item.name}</span>
                    <span style={{ 
                      fontSize: '0.6rem', padding: '2px 8px', borderRadius: '12px', 
                      backgroundColor: getCategoryColor(item.category), 
                      color: 'white', fontWeight: 'bold', textTransform: 'uppercase'
                    }}>
                      {item.category}
                    </span>
                  </div>
                  {item.description && <p style={{ margin: 0, fontSize: '0.8rem', color: colors.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</p>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 'bold', color: colors.text, fontSize: '1rem' }}>R$ {item.price.toFixed(2)}</span>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => openEditModal(item)} style={{ background: '#eff6ff', border: 'none', cursor: 'pointer', color: '#3b82f6', padding: '6px', fontSize: '1rem', borderRadius: '6px' }}>✏️</button>
                    <button onClick={() => handleDeleteProduct(item.id, item.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '6px', fontSize: '1rem' }}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredProducts.length === 0 && (
                <div style={{textAlign: 'center', padding: '40px', color: colors.textMuted}}>
                    {searchTerm ? 'Nenhum produto encontrado na busca.' : 'Nenhum produto nesta categoria.'}
                </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: PRODUTO (Create/Edit) */}
      {showProductModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div style={{ ...globalStyles.card, width: '90%', maxWidth: '400px', padding: '30px' }}>
            <h3 style={{ marginTop: 0, color: colors.primary }}>{editingProduct ? 'Editar Item' : 'Novo Item'}</h3>
            <form onSubmit={handleSaveProduct}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{display: 'block', fontSize: '0.85rem', color: colors.textMuted}}>Nome</label>
                <input 
                  required 
                  value={prodForm.name} 
                  onChange={e => setProdForm({...prodForm, name: e.target.value})} 
                  style={globalStyles.input} 
                  placeholder="Ex: X-Bacon" 
                />
                <span style={{fontSize: '0.7rem', color: colors.textMuted}}>*Será salvo em minúsculo</span>
              </div>
              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{display: 'block', fontSize: '0.85rem', color: colors.textMuted}}>Preço</label>
                  <input required type="number" step="0.01" value={prodForm.price} onChange={e => setProdForm({...prodForm, price: e.target.value})} style={globalStyles.input} placeholder="0.00" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{display: 'block', fontSize: '0.85rem', color: colors.textMuted}}>Categoria</label>
                  <select value={prodForm.category} onChange={e => setProdForm({...prodForm, category: e.target.value})} style={{...globalStyles.input, height: '52px'}}>
                    <option value="" disabled>Selecione...</option>
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{display: 'block', fontSize: '0.85rem', color: colors.textMuted}}>Descrição</label>
                <textarea value={prodForm.description} onChange={e => setProdForm({...prodForm, description: e.target.value})} style={{...globalStyles.input, resize: 'none'}} rows={3} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowProductModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc', background: 'transparent' }}>Cancelar</button>
                <button type="submit" disabled={submitting} style={{ ...globalStyles.buttonPrimary, flex: 1, marginTop: 0 }}>{submitting ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CATEGORIAS */}
      {showCategoryModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div style={{ ...globalStyles.card, width: '90%', maxWidth: '350px', padding: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: colors.text }}>Categorias</h3>
              <button onClick={() => setShowCategoryModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px', border: `1px solid ${colors.border}`, borderRadius: '8px' }}>
              {categories.map(cat => (
                <div key={cat.id} style={{ padding: '10px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: cat.color }} />
                    <span style={{ fontSize: '0.9rem' }}>{cat.name}</span>
                  </div>
                  <button onClick={() => handleDeleteCategory(cat.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                </div>
              ))}
              {categories.length === 0 && <p style={{ padding: '10px', textAlign: 'center', color: colors.textMuted, fontSize: '0.8rem' }}>Nenhuma categoria.</p>}
            </div>
            <form onSubmit={handleCreateCategory} style={{ display: 'flex', gap: '8px' }}>
              <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Nova Categoria..." style={{ ...globalStyles.input, marginBottom: 0, padding: '10px' }} />
              <button type="submit" style={{ ...globalStyles.buttonPrimary, width: 'auto', marginTop: 0, padding: '0 15px' }}>+</button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}