'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { colors } from '../styles/theme'

// --- TIPOS ---
type Product = { id: string, name: string, price: number, category: string, org_id: string, active: boolean, description?: string }
type Category = { id: string, name: string, color: string }
type OrderItem = { 
  id: string, 
  product_name_snapshot: string, 
  product_price_snapshot: number, 
  quantity: number, 
  org_id: string 
}

interface Props {
  orderId: string
  label: string
  onClose: () => void
  onUpdate: () => void
  userRole: string | null 
}

export function OrderDetailsModal({ orderId, label, onClose, onUpdate, userRole }: Props) {
  // Dados
  const [items, setItems] = useState<OrderItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([]) 
  
  // Controle de Interface
  const [loading, setLoading] = useState(true)
  const [isPaymentStep, setIsPaymentStep] = useState(false)
  const [myOrgId, setMyOrgId] = useState<string | null>(null)

  // Filtros e Seleção
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('TODAS')
  const [selectedProductId, setSelectedProductId] = useState('') 
  const [quantity, setQuantity] = useState(1)

  useEffect(() => { loadData() }, [orderId])

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: profile } = await supabase
        .from('profiles').select('org_id').eq('id', session.user.id).single()

      if (profile?.org_id) {
        setMyOrgId(profile.org_id)
        
        const [itemsRes, prodRes, catRes] = await Promise.all([
          supabase.from('order_items').select('*').eq('order_id', orderId).order('created_at', { ascending: true }),
          supabase.from('products').select('*').eq('org_id', profile.org_id).eq('active', true).order('name'),
          supabase.from('categories').select('*').eq('org_id', profile.org_id).order('name')
        ])
        
        if (itemsRes.data) setItems(itemsRes.data)
        if (prodRes.data) setProducts(prodRes.data)
        if (catRes.data) setCategories(catRes.data)
      }
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  // --- LÓGICA DE FILTRAGEM ---
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'TODAS' || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // --- AUXILIARES ---
  const getCategoryColor = (catName: string) => {
    const found = categories.find(c => c.name === catName)
    return found ? found.color : '#94a3b8'
  }

  const handleAddItem = async () => {
    if (userRole !== 'admin') return; 

    if (!selectedProductId || !myOrgId) return;
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const novoItem = {
      order_id: orderId, product_id: product.id, quantity: quantity, org_id: myOrgId,
      product_name_snapshot: product.name, product_price_snapshot: product.price
    };

    const { error } = await supabase.from('order_items').insert([novoItem]);
    if (error) alert(`Erro: ${error.message}`);
    else {
      setSelectedProductId(''); 
      setQuantity(1); 
      await loadData(); 
      onUpdate();
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (userRole !== 'admin') {
      alert('🔒 Acesso Negado: Apenas gerentes podem remover itens lançados.')
      return
    }
    if (!confirm('Tem certeza que deseja remover este item?')) return;
    const { error } = await supabase.from('order_items').delete().eq('id', itemId)
    if (!error) { await loadData(); onUpdate(); }
  }

  const handleFinishOrder = async (method: string) => {
    if (!confirm(`Receber R$ ${localTotal.toFixed(2)} via ${method.toUpperCase()}?`)) return
    const { error } = await supabase.from('orders').update({ status: 'concluida', payment_method: method, total: localTotal }).eq('id', orderId)
    if (!error) { onUpdate(); onClose(); }
  }

  const handlePrint = () => {
    const txt = items.map(i => `${i.quantity}x ${i.product_name_snapshot}`).join('\n')
    window.alert(`MESA: ${label}\n\n${txt}\n\nTOTAL: R$ ${localTotal.toFixed(2)}`)
  }

  const localTotal = items.reduce((acc, item) => acc + (item.product_price_snapshot * item.quantity), 0)

  // --- ESTILOS ---
  const qtyBtnStyle = { 
    flex: 1, height: '45px', border: 'none', background: '#f1f5f9', cursor: 'pointer', 
    fontWeight: '900', fontSize: '1.5rem', color: colors.primary, borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  }
  const btnPayStyle = (bg: string) => ({
    backgroundColor: bg, color: 'white', border: 'none', padding: '15px', borderRadius: '10px', 
    fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column' as 'column', alignItems: 'center', gap: '5px'
  })

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', backdropFilter: 'blur(3px)' }}>
      <div style={{ 
          backgroundColor: '#fff', width: '100%', maxWidth: '600px', 
          height: '95vh', 
          borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      }}>
        
        {/* HEADER */}
        <div style={{ padding: '12px 15px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: colors.primary, fontWeight: 900, textTransform: 'capitalize' }}>{label}</h2>
            <span style={{ fontSize: '0.8rem', color: colors.textMuted }}>{items.length} itens lançados</span>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {isPaymentStep ? (
          <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#fafafa', overflowY: 'auto' }}>
            {/* TELA DE PAGAMENTO */}
            <div style={{ fontSize: '3rem', fontWeight: 900, color: '#166534', marginBottom: '20px' }}>R$ {localTotal.toFixed(2)}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', marginBottom: '20px' }}>
              <button onClick={() => handleFinishOrder('pix')} style={btnPayStyle('#06b6d4')}>💠 PIX</button>
              <button onClick={() => handleFinishOrder('dinheiro')} style={btnPayStyle('#22c55e')}>💵 DINHEIRO</button>
              <button onClick={() => handleFinishOrder('cartao_debito')} style={btnPayStyle('#3b82f6')}>💳 DÉBITO</button>
              <button onClick={() => handleFinishOrder('cartao_credito')} style={btnPayStyle('#1d4ed8')}>💳 CRÉDITO</button>
              <button onClick={() => handleFinishOrder('fiado')} style={{ ...btnPayStyle('#f97316'), gridColumn: 'span 2' }}>📝 FIADO</button>
            </div>
            <button onClick={() => setIsPaymentStep(false)} style={{ padding: '15px', width: '100%', borderRadius: '10px', background: 'white', border: '1px solid #ddd', fontWeight: 700 }}>Voltar</button>
          </div>
        ) : (
          <>
            {/* --- LISTA DE ITENS JÁ PEDIDOS (Topo - Otimizado) --- */}
            {/* AGORA ELA SÓ CRESCE SE TIVER ITENS (maxHeight 30%) */}
            <div style={{ flex: '0 0 auto', maxHeight: '30%', overflowY: 'auto', backgroundColor: '#f8fafc', borderBottom: `1px solid ${colors.border}` }}>
              {items.length === 0 ? (
                 <div style={{ padding: '10px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>Nenhum item lançado ainda.</div>
              ) : (
                 items.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 15px', background: 'white', borderBottom: '1px solid #eee' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontWeight: 800, fontSize: '0.8rem' }}>{item.quantity}x</span>
                      <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>{item.product_name_snapshot}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: '#334155', fontSize: '0.9rem' }}>R$ {(item.product_price_snapshot * item.quantity).toFixed(2)}</span>
                      {userRole === 'admin' && (
                        <button onClick={() => handleRemoveItem(item.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>🗑️</button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* --- ÁREA DE LANÇAMENTO (Catálogo) - SÓ ADMIN --- */}
            {userRole === 'admin' ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'white', overflow: 'hidden' }}>
                
                {/* 1. Busca e Categorias */}
                <div style={{ padding: '10px', borderBottom: `1px solid ${colors.border}` }}>
                  {/* Busca */}
                  <div style={{ position: 'relative', marginBottom: '10px' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                    <input 
                      placeholder="Buscar produto..." 
                      value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                      style={{ width: '100%', padding: '10px 10px 10px 35px', borderRadius: '8px', border: `1px solid ${colors.border}`, fontSize: '0.95rem', outline: 'none' }}
                    />
                  </div>
                  {/* Categorias (Scroll Horizontal) */}
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '5px', scrollbarWidth: 'none' }}>
                    <button onClick={() => setSelectedCategory('TODAS')} style={{ padding: '6px 12px', borderRadius: '15px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, background: selectedCategory === 'TODAS' ? colors.text : '#f1f5f9', color: selectedCategory === 'TODAS' ? 'white' : colors.textMuted, whiteSpace: 'nowrap' }}>TODAS</button>
                    {categories.map(cat => (
                      <button key={cat.id} onClick={() => setSelectedCategory(cat.name)} style={{ padding: '6px 12px', borderRadius: '15px', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, background: selectedCategory === cat.name ? cat.color : '#f1f5f9', color: selectedCategory === cat.name ? 'white' : colors.textMuted, whiteSpace: 'nowrap' }}>{cat.name}</button>
                    ))}
                  </div>
                </div>

                {/* 2. Lista de Produtos (LIST VIEW - OTIMIZADO) */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredProducts.map(p => {
                    const isSelected = selectedProductId === p.id
                    return (
                      <div 
                        key={p.id} 
                        onClick={() => setSelectedProductId(p.id)}
                        style={{ 
                          border: isSelected ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`,
                          backgroundColor: isSelected ? '#fff1f2' : 'white',
                          borderRadius: '10px', padding: '12px 15px', cursor: 'pointer',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                          transition: 'all 0.1s'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '1rem', fontWeight: 700, color: colors.text, textTransform: 'capitalize' }}>{p.name}</span>
                              <span style={{ fontSize: '0.6rem', color: 'white', background: getCategoryColor(p.category), padding: '2px 8px', borderRadius: '8px', fontWeight: 'bold', textTransform: 'uppercase' }}>{p.category.slice(0, 10)}</span>
                           </div>
                           {p.description && <span style={{ fontSize: '0.75rem', color: colors.textMuted }}>{p.description}</span>}
                        </div>
                        <div style={{ fontWeight: 800, color: colors.primary, fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
                           R$ {p.price.toFixed(2)}
                        </div>
                      </div>
                    )
                  })}
                  {filteredProducts.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '30px', color: colors.textMuted, opacity: 0.7 }}>Nenhum produto encontrado.</div>
                  )}
                </div>

                {/* 3. Controles de Adição (Rodapé) */}
                <div style={{ padding: '10px', background: 'white', borderTop: `1px solid ${colors.border}`, display: 'flex', gap: '10px', boxShadow: '0 -4px 10px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{...qtyBtnStyle, height: '45px', width: '45px'}}>-</button>
                      <span style={{ fontWeight: 900, fontSize: '1.2rem', width: '35px', textAlign: 'center' }}>{quantity}</span>
                      <button onClick={() => setQuantity(quantity + 1)} style={{...qtyBtnStyle, height: '45px', width: '45px'}}>+</button>
                    </div>
                    <button 
                      onClick={handleAddItem} 
                      disabled={!selectedProductId}
                      style={{ flex: 1, backgroundColor: !selectedProductId ? '#ccc' : colors.primary, color: 'white', border: 'none', borderRadius: '8px', fontWeight: 800, fontSize: '1rem' }}
                    >
                      {selectedProductId ? 'ADICIONAR ITEM' : 'SELECIONE...'}
                    </button>
                </div>

              </div>
            ) : (
              // Mensagem para Funcionário
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: colors.textMuted, opacity: 0.6 }}>
                 <div style={{ fontSize: '3rem' }}>🔒</div>
                 <p>Modo Consulta</p>
              </div>
            )}

            {/* RODAPÉ GERAL (Total e Fechar Conta) */}
            <div style={{ padding: '12px 15px', background: '#f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${colors.border}` }}>
              <div>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase' }}>TOTAL MESA</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: colors.primary, lineHeight: 1 }}>R$ {localTotal.toFixed(2)}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handlePrint} style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc', background: 'white', fontSize: '1.2rem' }}>🖨️</button>
                <button onClick={() => setIsPaymentStep(true)} disabled={items.length === 0} style={{ padding: '10px 15px', borderRadius: '8px', background: items.length > 0 ? '#16a34a' : '#cbd5e1', color: 'white', fontWeight: 800, border: 'none', fontSize: '0.9rem' }}>FECHAR ($)</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}