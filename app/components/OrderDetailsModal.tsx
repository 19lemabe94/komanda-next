'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { colors } from '../styles/theme'

type Product = { id: string, name: string, price: number, category: string, org_id: string, active: boolean }
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
}

export function OrderDetailsModal({ orderId, label, onClose, onUpdate }: Props) {
  const [items, setItems] = useState<OrderItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [isPaymentStep, setIsPaymentStep] = useState(false)
  const [myOrgId, setMyOrgId] = useState<string | null>(null)

  useEffect(() => { loadData() }, [orderId])

  const loadData = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', session.user.id)
        .single()

      if (profile?.org_id) {
        setMyOrgId(profile.org_id)
        const [itemsRes, prodRes] = await Promise.all([
          supabase.from('order_items').select('*').eq('order_id', orderId).order('created_at', { ascending: true }),
          supabase.from('products').select('*').eq('org_id', profile.org_id).eq('active', true).order('name')
        ])
        if (itemsRes.data) setItems(itemsRes.data)
        if (prodRes.data) setProducts(prodRes.data)
      }
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const handleAddItem = async () => {
    if (!selectedProduct || !myOrgId) return;
    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const novoItem = {
      order_id: orderId, product_id: product.id, quantity: quantity, org_id: myOrgId,
      product_name_snapshot: product.name, product_price_snapshot: product.price
    };

    const { error } = await supabase.from('order_items').insert([novoItem]);
    if (error) alert(`Erro: ${error.message}`);
    else {
      setSelectedProduct(''); setQuantity(1); await loadData(); onUpdate();
    }
  };

  const handleRemoveItem = async (itemId: string) => {
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

  // --- ESTILOS VISUAIS AJUSTADOS ---
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
      {/* AJUSTE CRÍTICO AQUI: 
         - Usamos maxHeight com 'dvh' (Dynamic Viewport Height) para respeitar a barra do navegador mobile.
         - Reduzimos a altura geral para 85dvh para dar uma margem de segurança.
      */}
      <div style={{ 
          backgroundColor: '#fff', 
          width: '100%', 
          maxWidth: '550px', 
          height: 'auto',          // Deixa crescer conforme precisa
          maxHeight: '90vh',       // Trava em 90% da tela normal
          borderRadius: '16px', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
      }}>
        
        {/* HEADER MENOR */}
        <div style={{ padding: '12px 15px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem', color: colors.primary, fontWeight: 900, textTransform: 'capitalize' }}>{label}</h2>
          <button onClick={onClose} style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {isPaymentStep ? (
          <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#fafafa', overflowY: 'auto' }}>
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
            {/* LISTA DE ITENS (Flex 1 para ocupar o espaço que sobrar) */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px', backgroundColor: '#f8fafc' }}>
              {items.length === 0 ? (
                 <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>Nenhum item lançado</div>
              ) : (
                 items.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'white', borderRadius: '10px', marginBottom: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontWeight: 800, fontSize: '0.9rem' }}>{item.quantity}</span>
                      <div>
                        <div style={{ fontWeight: 700, color: '#334155', fontSize: '0.95rem' }}>{item.product_name_snapshot}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Unit: R$ {item.product_price_snapshot.toFixed(2)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: '#334155', fontSize: '0.95rem' }}>R$ {(item.product_price_snapshot * item.quantity).toFixed(2)}</span>
                      <button onClick={() => handleRemoveItem(item.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1rem' }}>🗑️</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* AREA DE LANÇAMENTO (Compacta) */}
            <div style={{ padding: '12px', background: 'white', borderTop: `1px solid ${colors.border}`, boxShadow: '0 -4px 10px rgba(0,0,0,0.05)' }}>
              
              {/* CONTROLE DE QUANTIDADE E SELEÇÃO */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                 <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={qtyBtnStyle}>-</button>
                 <div style={{ width: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 900, background: '#f8fafc', borderRadius: '8px' }}>
                    {quantity}
                 </div>
                 <button onClick={() => setQuantity(quantity + 1)} style={qtyBtnStyle}>+</button>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <select 
                  value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} 
                  style={{ flex: 2, height: '50px', padding: '0 10px', borderRadius: '8px', border: `1px solid ${colors.border}`, fontWeight: 700, fontSize: '1rem', background: 'white' }}
                >
                  <option value="">👇 Produto...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)}</option>)}
                </select>
                <button 
                  onClick={handleAddItem} disabled={!selectedProduct || loading}
                  style={{ flex: 1, borderRadius: '8px', background: !selectedProduct ? '#ccc' : colors.primary, color: 'white', border: 'none', fontWeight: 800, fontSize: '0.9rem' }}
                >
                  LANÇAR
                </button>
              </div>
            </div>

            {/* RODAPÉ TOTAL */}
            <div style={{ padding: '12px 15px', background: '#f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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