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
  const [userRole, setUserRole] = useState<string | null>(null) // Para o Header
  
  // Listas de Dados
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])

  // Controle de Modais
  const [showProductModal, setShowProductModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  
  const [submitting, setSubmitting] = useState(false)

  // Formulário de Produto
  const [prodForm, setProdForm] = useState({
    name: '',
    description: '',
    price: '',
    category: ''
  })

  // Formulário de Categoria
  const [catName, setCatName] = useState('')

  useEffect(() => {
    initPage()
  }, [])

  const initPage = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    // Busca o perfil para pegar org_id e role
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', session.user.id)
      .single()

    if (profile?.org_id) {
      setMyOrgId(profile.org_id)
      setUserRole(profile.role) // Importante para o Header
      fetchData(profile.org_id)
    } else {
      router.push('/setup')
    }
  }

  const fetchData = async (orgId: string) => {
    // 1. Busca Categorias da Organização
    const { data: catData } = await supabase
      .from('categories')
      .select('*')
      .eq('org_id', orgId)
      .order('name', { ascending: true })
    
    if (catData) {
      setCategories(catData)
      if (catData.length > 0 && !prodForm.category) {
        setProdForm(prev => ({ ...prev, category: catData[0].name }))
      }
    }

    // 2. Busca Produtos da Organização
    const { data: prodData } = await supabase
      .from('products')
      .select('*')
      .eq('org_id', orgId)
      .order('name', { ascending: true })
    
    if (prodData) setProducts(prodData || [])
    
    setLoading(false)
  }

  // --- AÇÕES DE PRODUTO ---
  const handleCreateProduct = async (e: FormEvent) => {
    e.preventDefault()
    if (!myOrgId) return
    
    setSubmitting(true)
    const priceNumber = parseFloat(prodForm.price.replace(',', '.'))

    if (!prodForm.name || isNaN(priceNumber) || !prodForm.category) {
      alert('Preencha nome, preço e escolha uma categoria.')
      setSubmitting(false)
      return
    }

    const { error } = await supabase.from('products').insert([{
      name: prodForm.name,
      description: prodForm.description,
      price: priceNumber,
      category: prodForm.category,
      org_id: myOrgId
    }])

    if (!error) {
      setShowProductModal(false)
      setProdForm({ ...prodForm, name: '', description: '', price: '' })
      fetchData(myOrgId)
    } else {
      alert(error.message)
    }
    setSubmitting(false)
  }

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Excluir "${name}"?`)) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  // --- AÇÕES DE CATEGORIA ---
  const handleCreateCategory = async (e: FormEvent) => {
    e.preventDefault()
    if (!catName.trim() || !myOrgId) return

    const randomColor = "hsl(" + 360 * Math.random() + ',' + (25 + 70 * Math.random()) + '%,' + (40 + 10 * Math.random()) + '%)'

    const { error } = await supabase.from('categories').insert([{
      name: catName.trim(),
      color: randomColor,
      org_id: myOrgId
    }])

    if (!error) {
      setCatName('')
      fetchData(myOrgId)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Excluir esta categoria? Produtos que usam ela não serão apagados, mas ficarão sem categoria visual.')) return
    await supabase.from('categories').delete().eq('id', id)
    if (myOrgId) fetchData(myOrgId)
  }

  const getCategoryColor = (catName: string) => {
    const found = categories.find(c => c.name === catName)
    return found ? found.color : '#94a3b8'
  }

  return (
    <div style={{ ...globalStyles.container, justifyContent: 'flex-start', background: '#f8fafc' }}>
      
      {/* HEADER CENTRALIZADO E RESPONSIVO */}
      <Header userRole={userRole} subtitle="MENU / CARDÁPIO" />

      <main style={{ width: '100%', maxWidth: '800px', padding: '30px 20px', flex: 1 }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <span style={{ color: colors.textMuted, fontWeight: 600 }}>{products.length} itens cadastrados</span>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setShowCategoryModal(true)}
              style={{ 
                background: 'white', border: `1px solid ${colors.border}`, color: colors.text,
                padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem'
              }}
            >
              🏷️ Categorias
            </button>

            <button 
              onClick={() => setShowProductModal(true)}
              style={{ 
                backgroundColor: colors.primary, color: 'white', border: 'none', 
                padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
              }}
            >
              + Novo Produto
            </button>
          </div>
        </div>

        {loading ? <p style={{textAlign: 'center', color: colors.textMuted}}>Carregando cardápio...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {products.map(item => (
              <div key={item.id} style={{
                backgroundColor: 'white', padding: '15px', borderRadius: '12px',
                border: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, color: colors.text, fontSize: '1.1rem' }}>{item.name}</span>
                    <span style={{ 
                      fontSize: '0.65rem', padding: '2px 8px', borderRadius: '12px', 
                      backgroundColor: getCategoryColor(item.category), 
                      color: 'white', fontWeight: 'bold', textTransform: 'uppercase',
                      textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                    }}>
                      {item.category}
                    </span>
                  </div>
                  {item.description && (
                    <p style={{ margin: 0, fontSize: '0.85rem', color: colors.textMuted }}>{item.description}</p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ fontWeight: 'bold', color: colors.text }}>R$ {item.price.toFixed(2)}</span>
                  <button 
                    onClick={() => handleDeleteProduct(item.id, item.name)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '5px', fontSize: '1.1rem' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
            {products.length === 0 && (
                <div style={{textAlign: 'center', padding: '40px', color: colors.textMuted, border: '2px dashed #e2e8f0', borderRadius: '12px'}}>
                    Nenhum produto cadastrado. Comece criando categorias e produtos!
                </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: PRODUTO */}
      {showProductModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div style={{ ...globalStyles.card, width: '90%', maxWidth: '400px', padding: '30px' }}>
            <h3 style={{ marginTop: 0, color: colors.primary }}>Novo Item</h3>
            <form onSubmit={handleCreateProduct}>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{display: 'block', fontSize: '0.85rem', color: colors.textMuted, marginBottom: '5px'}}>Nome</label>
                <input required value={prodForm.name} onChange={e => setProdForm({...prodForm, name: e.target.value})} style={globalStyles.input} placeholder="Ex: X-Bacon" />
              </div>

              <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{display: 'block', fontSize: '0.85rem', color: colors.textMuted, marginBottom: '5px'}}>Preço</label>
                  <input required type="number" step="0.01" value={prodForm.price} onChange={e => setProdForm({...prodForm, price: e.target.value})} style={globalStyles.input} placeholder="0.00" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{display: 'block', fontSize: '0.85rem', color: colors.textMuted, marginBottom: '5px'}}>Categoria</label>
                  <select 
                    value={prodForm.category}
                    onChange={e => setProdForm({...prodForm, category: e.target.value})}
                    style={{...globalStyles.input, height: '52px'}}
                  >
                    <option value="" disabled>Selecione...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{display: 'block', fontSize: '0.85rem', color: colors.textMuted, marginBottom: '5px'}}>Descrição</label>
                <textarea value={prodForm.description} onChange={e => setProdForm({...prodForm, description: e.target.value})} style={{...globalStyles.input, resize: 'none'}} rows={3} />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setShowProductModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc', background: 'transparent' }}>Cancelar</button>
                <button type="submit" disabled={submitting} style={{ ...globalStyles.buttonPrimary, flex: 1, marginTop: 0 }}>Salvar</button>
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