'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { colors } from '../styles/theme'

// --- ÍCONES SVG ---
const IconPen = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
)
const IconClose = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
)
const IconPrint = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"></polyline>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
    <rect x="6" y="14" width="12" height="8"></rect>
  </svg>
)
const IconTrash = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
)

// --- TIPOS ---
type Product = { id: string, name: string, price: number, category: string, org_id: string, active: boolean, description?: string }
type Category = { id: string, name: string, color: string }
type OrderItem = { id: string, product_name_snapshot: string, product_price_snapshot: number, quantity: number, org_id: string }
type Client = { id: string, name: string }

interface Props {
  orderId: string, label: string, onClose: () => void, onUpdate: () => void, userRole: string | null 
}

export function OrderDetailsModal({ orderId, label, onClose, onUpdate, userRole }: Props) {
  const [items, setItems] = useState<OrderItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([]) 
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [isPaymentStep, setIsPaymentStep] = useState(false)
  const [showClientSelector, setShowClientSelector] = useState(false)
  const [myOrgId, setMyOrgId] = useState<string | null>(null)
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('TODAS')
  const [selectedProductId, setSelectedProductId] = useState('') 
  const [quantity, setQuantity] = useState(1)
  const categoriesRef = useRef<HTMLDivElement>(null)
  
  const grenaColor = '#800020'
  const orangeTheme = '#f97316'

  useEffect(() => { loadData() }, [orderId])
  useEffect(() => {
    const el = categoriesRef.current
    if (el) {
      const onWheel = (e: WheelEvent) => { if (e.deltaY === 0) return; e.preventDefault(); el.scrollLeft += e.deltaY }
      el.addEventListener('wheel', onWheel); return () => el.removeEventListener('wheel', onWheel)
    }
  }, [categories])

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', session.user.id).single()
      if (profile?.org_id) {
        setMyOrgId(profile.org_id)
        const [itemsRes, prodRes, catRes, clientRes] = await Promise.all([
          supabase.from('order_items').select('*').eq('order_id', orderId).order('created_at', { ascending: true }),
          supabase.from('products').select('*').eq('org_id', profile.org_id).eq('active', true).order('name'),
          supabase.from('categories').select('*').eq('org_id', profile.org_id).order('name'),
          supabase.from('clients').select('id, name').eq('org_id', profile.org_id).order('name')
        ])
        if (itemsRes.data) setItems(itemsRes.data); if (prodRes.data) setProducts(prodRes.data); if (catRes.data) setCategories(catRes.data); if (clientRes.data) setClients(clientRes.data)
      }
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'TODAS' || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })
  const getCategoryColor = (catName: string) => { const found = categories.find(c => c.name === catName); return found ? found.color : '#94a3b8' }

  const handleAddItem = async () => {
    if (!myOrgId) return;
    let payload: any = {}
    if (isCustomMode) {
        if (!customName.trim()) return alert('Digite o nome do item.')
        const price = parseFloat(customPrice.replace(',', '.'))
        if (isNaN(price) || price <= 0) return alert('Digite um preço válido.')
        payload = { order_id: orderId, product_id: null, quantity: quantity, org_id: myOrgId, product_name_snapshot: customName.trim() + ' (Avulso)', product_price_snapshot: price }
    } else {
        if (!selectedProductId) return;
        const product = products.find(p => p.id === selectedProductId);
        if (!product) return;
        payload = { order_id: orderId, product_id: product.id, quantity: quantity, org_id: myOrgId, product_name_snapshot: product.name, product_price_snapshot: product.price }
    }
    const { error } = await supabase.from('order_items').insert([payload]);
    if (error) { alert(`Erro: ${error.message}`) } else { setQuantity(1); setCustomName(''); setCustomPrice(''); await loadData(); onUpdate() }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (userRole !== 'admin') { alert('🔒 Acesso Negado: Apenas gerentes podem remover itens lançados.'); return }
    if (!confirm('Tem certeza que deseja remover este item?')) return;
    const { error } = await supabase.from('order_items').delete().eq('id', itemId); if (!error) { await loadData(); onUpdate() }
  }

  const handlePaymentSelection = (method: string) => { if (method === 'fiado') { setShowClientSelector(true) } else { handleFinishOrder(method, null) } }

  const handleFinishOrder = async (method: string, clientId: string | null) => {
    let confirmMsg = `Receber R$ ${localTotal.toFixed(2)} via ${method.toUpperCase()}?`
    if (method === 'fiado') { const clientName = clients.find(c => c.id === clientId)?.name; confirmMsg = `⚠️ Confirmar FIADO para ${clientName}?\nValor: R$ ${localTotal.toFixed(2)}` }
    if (!confirm(confirmMsg)) return
    const { error } = await supabase.from('orders').update({ status: 'concluida', payment_method: method, total: localTotal, client_id: clientId }).eq('id', orderId)
    if (!error) { onUpdate(); onClose() } else { alert('Erro ao fechar venda: ' + error.message) }
  }

  const handlePrint = () => {
    const txt = items.map(i => `${i.quantity}x ${i.product_name_snapshot}`).join('\n')
    window.alert(`MESA: ${label}\n\n${txt}\n\nTOTAL: R$ ${localTotal.toFixed(2)}`)
  }

  const localTotal = items.reduce((acc, item) => acc + (item.product_price_snapshot * item.quantity), 0)

  const touchBtnBase = { cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, borderRadius: '12px', border: 'none', transition: 'transform 0.1s', minHeight: '52px', fontSize: '1rem' }
  const qtyBtnStyle = { ...touchBtnBase, background: '#f1f5f9', color: colors.primary, fontSize: '1.8rem', flex: 1 }
  const btnPayStyle = (bg: string) => ({ ...touchBtnBase, backgroundColor: bg, color: 'white', flexDirection: 'column' as 'column', gap: '4px', padding: '10px' })

  return (
    <>
      <style jsx global>{`
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        input:focus { outline: 2px solid ${colors.primary}; }
        .btn-grena-interactive { background-color: white; color: ${grenaColor}; border: 1px solid ${grenaColor}; transition: all 0.1s ease-in-out; }
        .btn-grena-interactive:active { background-color: ${grenaColor}; color: white; transform: scale(0.95); }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', backdropFilter: 'blur(3px)' }}>
        <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '600px', height: '100%', maxHeight: '95vh', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          
          {/* HEADER FIXO */}
          <div style={{ padding: '15px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', flexShrink: 0 }}>
            <div><h2 style={{ margin: 0, fontSize: '1.4rem', color: colors.primary, fontWeight: 900, textTransform: 'capitalize' }}>{label}</h2><span style={{ fontSize: '0.9rem', color: colors.textMuted }}>{items.length} itens lançados</span></div>
            <button onClick={onClose} style={{ border: 'none', background: '#f1f5f9', width: '42px', height: '42px', borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          {showClientSelector ? (
            <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', background: '#fffbeb' }}>
                <h3 style={{ textAlign: 'center', color: '#b45309', margin: '0 0 20px' }}>Selecione o Cliente</h3>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {clients.length === 0 && <p style={{textAlign: 'center', color: '#999'}}>Nenhum cliente cadastrado.</p>}
                    {clients.map(client => (
                        <button key={client.id} onClick={() => handleFinishOrder('fiado', client.id)} style={{ ...touchBtnBase, justifyContent: 'flex-start', padding: '0 20px', border: '2px solid #fcd34d', background: 'white', color: '#78350f' }}>👤 {client.name}</button>
                    ))}
                </div>
                <button onClick={() => setShowClientSelector(false)} style={{ ...touchBtnBase, marginTop: '15px', background: 'white', border: '2px solid #ccc', color: colors.text }}>Cancelar</button>
            </div>
          ) : isPaymentStep ? (
            <div className="no-scrollbar" style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#fafafa', overflowY: 'auto' }}>
              <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#166534', marginBottom: '30px' }}>R$ {localTotal.toFixed(2)}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%', marginBottom: '20px' }}>
                <button onClick={() => handlePaymentSelection('pix')} style={btnPayStyle('#06b6d4')}>💠 PIX</button>
                <button onClick={() => handlePaymentSelection('dinheiro')} style={btnPayStyle('#22c55e')}>💵 DINHEIRO</button>
                <button onClick={() => handlePaymentSelection('cartao_debito')} style={btnPayStyle('#3b82f6')}>💳 DÉBITO</button>
                <button onClick={() => handlePaymentSelection('cartao_credito')} style={btnPayStyle('#1d4ed8')}>💳 CRÉDITO</button>
                <button onClick={() => handlePaymentSelection('fiado')} style={{ ...btnPayStyle(orangeTheme), gridColumn: 'span 2' }}>📝 FIADO</button>
              </div>
              <button onClick={() => setIsPaymentStep(false)} style={{ ...touchBtnBase, width: '100%', background: 'white', border: '2px solid #ddd', color: colors.text }}>Voltar</button>
            </div>
          ) : (
            <>
              {/* LISTA DE ITENS JÁ LANÇADOS (Topo - Tamanho reduzido em mobile) */}
              <div className="no-scrollbar" style={{ flexShrink: 0, maxHeight: '25vh', overflowY: 'auto', backgroundColor: '#f8fafc', borderBottom: `1px solid ${colors.border}` }}>
                {items.length === 0 ? (
                  <div style={{ padding: '15px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>Nenhum item lançado.</div>
                ) : (
                  items.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px', background: 'white', borderBottom: '1px solid #eee' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '6px', fontWeight: 800, fontSize: '0.9rem', minWidth: '30px', textAlign: 'center' }}>{item.quantity}x</span>
                        <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.9rem' }}>{item.product_name_snapshot}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, color: '#334155', fontSize: '0.9rem' }}>R$ {(item.product_price_snapshot * item.quantity).toFixed(2)}</span>
                        {userRole === 'admin' && (<button onClick={() => handleRemoveItem(item.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', padding: '5px' }}><IconTrash /></button>)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ÁREA DE PRODUTOS E BUSCA (Flex 1 - Ocupa todo o resto) */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'white', minHeight: 0 }}>
                
                {/* 1. BUSCA E CATEGORIAS */}
                <div style={{ padding: '15px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {isCustomMode ? (
                      <div style={{ width: '100%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff7ed', borderRadius: '12px', color: orangeTheme, fontWeight: 'bold', border: `2px dashed ${orangeTheme}`, fontSize: '1rem' }}>Modo Item Avulso Ativado</div>
                  ) : (
                      <div style={{ position: 'relative', width: '100%' }}>
                          <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '1.2rem' }}>🔍</span>
                          <input placeholder="Buscar produto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '0 15px 0 45px', height: '52px', borderRadius: '12px', border: `2px solid ${colors.border}`, fontSize: '1rem', outline: 'none', background: '#f8fafc' }} />
                      </div>
                  )}
                  {!isCustomMode && (
                      <div ref={categoriesRef} className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' }}>
                        <button onClick={() => setSelectedCategory('TODAS')} style={{ padding: '8px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, background: selectedCategory === 'TODAS' ? colors.text : '#f1f5f9', color: selectedCategory === 'TODAS' ? 'white' : colors.textMuted, whiteSpace: 'nowrap' }}>TODAS</button>
                        {categories.map(cat => (
                          <button key={cat.id} onClick={() => setSelectedCategory(cat.name)} style={{ padding: '8px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, background: selectedCategory === cat.name ? cat.color : '#f1f5f9', color: selectedCategory === cat.name ? 'white' : colors.textMuted, whiteSpace: 'nowrap' }}>{cat.name}</button>
                        ))}
                      </div>
                  )}
                </div>

                {/* 2. LISTA DE PRODUTOS SCROLLÁVEL */}
                <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 15px 15px 15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {isCustomMode ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', paddingTop: '10px' }}>
                          <input autoFocus placeholder="Nome do Item (Ex: Rolha, Taxa...)" value={customName} onChange={e => setCustomName(e.target.value)} style={{ width: '100%', height: '55px', padding: '0 15px', borderRadius: '12px', border: `2px solid ${colors.border}`, fontSize: '1.1rem' }} />
                          <input type="number" placeholder="Preço (R$)" value={customPrice} onChange={e => setCustomPrice(e.target.value)} style={{ width: '100%', height: '55px', padding: '0 15px', borderRadius: '12px', border: `2px solid ${colors.border}`, fontSize: '1.1rem' }} />
                          <p style={{ fontSize: '0.8rem', color: colors.textMuted, textAlign: 'center', margin: 0 }}>Este item será adicionado apenas nesta comanda.</p>
                      </div>
                  ) : (
                      <>
                        {filteredProducts.map(p => {
                            const isSelected = selectedProductId === p.id
                            return (
                            <div key={p.id} onClick={() => setSelectedProductId(p.id)} style={{ border: isSelected ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`, backgroundColor: isSelected ? '#eff6ff' : 'white', borderRadius: '12px', padding: '12px 15px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.1s', flexShrink: 0, minHeight: '60px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <span style={{ fontSize: '1rem', fontWeight: 700, color: colors.text }}>{p.name}</span>
                                <span style={{ fontSize: '0.7rem', color: 'white', background: getCategoryColor(p.category), padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', textTransform: 'uppercase', width: 'fit-content' }}>{p.category.slice(0, 15)}</span>
                                </div>
                                <div style={{ fontWeight: 800, color: colors.primary, fontSize: '1.1rem', whiteSpace: 'nowrap' }}>R$ {p.price.toFixed(2)}</div>
                            </div>
                            )
                        })}
                        {filteredProducts.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: colors.textMuted, opacity: 0.7, fontSize: '0.9rem' }}>Nenhum produto encontrado.</div>}
                      </>
                  )}
                </div>

                {/* 3. RODAPÉ DE AÇÃO (Fixo) */}
                <div style={{ padding: '15px', background: 'white', borderTop: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 -4px 10px rgba(0,0,0,0.05)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', gap: '12px', height: '55px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f1f5f9', borderRadius: '12px', padding: '4px', flex: 0.4 }}>
                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{...qtyBtnStyle}}>-</button>
                        <span style={{ fontWeight: 900, fontSize: '1.3rem', width: '35px', textAlign: 'center' }}>{quantity}</span>
                        <button onClick={() => setQuantity(quantity + 1)} style={{...qtyBtnStyle}}>+</button>
                      </div>
                      <button onClick={handleAddItem} disabled={!isCustomMode && !selectedProductId} style={{ ...touchBtnBase, flex: 1, backgroundColor: (!isCustomMode && !selectedProductId) ? '#e2e8f0' : colors.primary, color: (!isCustomMode && !selectedProductId) ? '#94a3b8' : 'white', fontSize: '1rem', textTransform: 'uppercase' }}>{isCustomMode ? 'ADICIONAR AVULSO' : (selectedProductId ? 'ADICIONAR ITEM' : 'SELECIONE...')}</button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px dashed #eee' }}>
                      <div><span style={{ fontSize: '0.75rem', fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase' }}>TOTAL MESA</span><div style={{ fontSize: '1.6rem', fontWeight: 900, color: colors.primary, lineHeight: 1 }}>R$ {localTotal.toFixed(2)}</div></div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => setIsCustomMode(!isCustomMode)} style={{ ...touchBtnBase, width: '55px', border: `2px solid ${isCustomMode ? orangeTheme : '#ccc'}`, background: isCustomMode ? '#fff7ed' : 'white', color: isCustomMode ? orangeTheme : colors.text }} title="Item Avulso"> {isCustomMode ? <IconClose /> : <IconPen />} </button>
                        <button onClick={handlePrint} className="btn-grena-interactive" style={{ ...touchBtnBase, width: '55px' }} title="Imprimir Comanda"><IconPrint /></button>
                        <button onClick={() => setIsPaymentStep(true)} disabled={items.length === 0} style={{ ...touchBtnBase, padding: '0 20px', background: items.length > 0 ? '#16a34a' : '#cbd5e1', color: 'white' }}>FECHAR ($)</button>
                      </div>
                    </div>
                </div>

              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}