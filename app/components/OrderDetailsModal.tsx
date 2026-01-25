'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { colors, globalStyles } from '../styles/theme'

type Product = { id: string, name: string, price: number, category: string, org_id: string, active: boolean }
// Mantemos a tipagem segura do Snapshot
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

  useEffect(() => {
    loadData()
  }, [orderId])

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
    } catch (err) {
      console.error("Erro ao carregar dados:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async () => {
    if (!selectedProduct || !myOrgId) return;

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    // LÓGICA SEGURA (SNAPSHOT) MANTIDA
    const novoItem = {
      order_id: orderId,
      product_id: product.id,
      quantity: quantity,
      org_id: myOrgId,
      product_name_snapshot: product.name,
      product_price_snapshot: product.price
    };

    const { error } = await supabase.from('order_items').insert([novoItem]);

    if (error) {
      alert(`Erro: ${error.message}`);
    } else {
      setSelectedProduct('');
      setQuantity(1);
      await loadData();
      onUpdate();
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    const { error } = await supabase.from('order_items').delete().eq('id', itemId)
    if (!error) { await loadData(); onUpdate(); }
  }

  const handleFinishOrder = async (method: string) => {
    const confirmFinish = window.confirm(`Confirmar recebimento de R$ ${localTotal.toFixed(2)} via ${method.toUpperCase()}?`)
    if (!confirmFinish) return

    const { error } = await supabase
      .from('orders')
      .update({ status: 'concluida', payment_method: method, total: localTotal })
      .eq('id', orderId)

    if (!error) { onUpdate(); onClose(); }
  }

  const handlePrint = () => {
    const txt = items.map(i => `${i.quantity}x ${i.product_name_snapshot} - R$ ${(i.product_price_snapshot * i.quantity).toFixed(2)}`).join('\n')
    window.alert(`MESA: ${label}\n----------------\n${txt}\n----------------\nTOTAL: R$ ${localTotal.toFixed(2)}`)
  }

  const localTotal = items.reduce((acc, item) => acc + (item.product_price_snapshot * item.quantity), 0)

  // --- ESTILOS VISUAIS ---
  const qtyBtn = { 
    padding: '0 15px', border: 'none', background: '#f1f5f9', cursor: 'pointer', 
    fontWeight: 'bold', fontSize: '1.2rem', color: colors.primary, height: '100%' 
  }
  
  const btnPayStyle = (bgColor: string) => ({
    backgroundColor: bgColor, 
    color: 'white', 
    border: 'none', 
    padding: '20px', 
    borderRadius: '12px', 
    fontWeight: 700, 
    cursor: 'pointer', 
    display: 'flex', 
    flexDirection: 'column' as 'column', 
    alignItems: 'center', 
    gap: '8px',
    fontSize: '0.9rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    transition: 'transform 0.1s'
  })

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', backdropFilter: 'blur(2px)' }}>
      <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '550px', height: '90vh', maxHeight: '800px', borderRadius: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
        
        {/* HEADER */}
        <div style={{ padding: '20px 25px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: colors.textMuted, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
              {isPaymentStep ? '💰 FINALIZAR PAGAMENTO' : '📝 COMANDA EM ABERTO'}
            </span>
            <h2 style={{ margin: '5px 0 0 0', fontSize: '1.8rem', color: colors.primary, fontWeight: 900, textTransform: 'capitalize' }}>{label}</h2>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: '#f1f5f9', width: '40px', height: '40px', borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        {isPaymentStep ? (
          /* TELA DE PAGAMENTO */
          <div style={{ flex: 1, padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#fafafa' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <span style={{ color: colors.textMuted, fontWeight: 600 }}>Valor Total a Receber</span>
              <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#166534', lineHeight: 1, marginTop: '5px' }}>
                R$ {localTotal.toFixed(2)}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', width: '100%', marginBottom: 'auto' }}>
              <button onClick={() => handleFinishOrder('pix')} style={btnPayStyle('#06b6d4')}>
                <span style={{ fontSize: '1.5rem' }}>💠</span> PIX
              </button>
              <button onClick={() => handleFinishOrder('dinheiro')} style={btnPayStyle('#22c55e')}>
                <span style={{ fontSize: '1.5rem' }}>💵</span> DINHEIRO
              </button>
              <button onClick={() => handleFinishOrder('cartao_debito')} style={btnPayStyle('#3b82f6')}>
                <span style={{ fontSize: '1.5rem' }}>💳</span> DÉBITO
              </button>
              <button onClick={() => handleFinishOrder('cartao_credito')} style={btnPayStyle('#1d4ed8')}>
                <span style={{ fontSize: '1.5rem' }}>💳</span> CRÉDITO
              </button>
              {/* FIADO LARANJA */}
              <button onClick={() => handleFinishOrder('fiado')} style={{ ...btnPayStyle('#f97316'), gridColumn: 'span 2' }}>
                <span style={{ fontSize: '1.5rem' }}>📝</span> PENDURAR (FIADO)
              </button>
            </div>

            <button onClick={() => setIsPaymentStep(false)} style={{ padding: '15px', width: '100%', borderRadius: '12px', border: `1px solid ${colors.border}`, background: 'white', color: colors.textMuted, fontWeight: 700, cursor: 'pointer' }}>
              ← Voltar para itens
            </button>
          </div>
        ) : (
          /* TELA DE ITENS */
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: '#f8fafc' }}>
              {items.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                  <span style={{ fontSize: '3rem' }}>🍽️</span>
                  <p style={{ fontWeight: 600 }}>Nenhum item lançado</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {items.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '6px 10px', borderRadius: '8px', fontWeight: 800, fontSize: '0.9rem', minWidth: '35px', textAlign: 'center' }}>
                          {item.quantity}x
                        </span>
                        <div>
                          <div style={{ fontWeight: 700, color: '#334155', fontSize: '1rem' }}>{item.product_name_snapshot}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>Unit: R$ {item.product_price_snapshot.toFixed(2)}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, color: '#334155', fontSize: '1.1rem' }}>R$ {(item.product_price_snapshot * item.quantity).toFixed(2)}</span>
                        <button onClick={() => handleRemoveItem(item.id)} style={{ border: 'none', background: '#fee2e2', color: '#ef4444', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BARRA DE CONTROLE */}
            <div style={{ padding: '15px 20px', backgroundColor: 'white', borderTop: `1px solid ${colors.border}`, display: 'flex', gap: '12px', alignItems: 'center', boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '10px', height: '50px', overflow: 'hidden', border: `1px solid ${colors.border}` }}>
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={qtyBtn}>-</button>
                <span style={{ width: '35px', textAlign: 'center', fontWeight: '800', fontSize: '1.1rem' }}>{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} style={qtyBtn}>+</button>
              </div>
              
              <select 
                value={selectedProduct} 
                onChange={e => setSelectedProduct(e.target.value)} 
                style={{ flex: 1, height: '50px', padding: '0 15px', borderRadius: '10px', border: `1px solid ${colors.border}`, fontWeight: 600, fontSize: '0.95rem', background: 'white', color: colors.text }}
              >
                <option value="">👇 Selecionar Produto...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)}</option>)}
              </select>
              
              <button 
                onClick={handleAddItem} 
                disabled={!selectedProduct || loading}
                style={{ height: '50px', padding: '0 25px', borderRadius: '10px', background: !selectedProduct ? '#94a3b8' : colors.primary, color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem', textTransform: 'uppercase' }}
              >
                Lançar
              </button>
            </div>

            {/* BARRA DE TOTAL E AÇÃO */}
            <div style={{ padding: '20px 25px', background: 'white', borderTop: '1px dashed #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <span style={{ color: colors.textMuted, fontWeight: 700, fontSize: '0.9rem', textTransform: 'uppercase' }}>Subtotal</span>
                <span style={{ fontWeight: 900, color: colors.primary, fontSize: '2rem' }}>R$ {localTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={handlePrint} style={{ flex: 1, padding: '16px', borderRadius: '12px', border: `2px solid ${colors.border}`, background: 'white', fontWeight: 800, cursor: 'pointer', color: colors.text }}>
                  🖨️ Imprimir
                </button>
                <button 
                  onClick={() => setIsPaymentStep(true)} 
                  disabled={items.length === 0} 
                  style={{ flex: 2, padding: '16px', borderRadius: '12px', background: items.length > 0 ? '#16a34a' : '#cbd5e1', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '1rem', boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.2)' }}
                >
                  FECHAR CONTA ($)
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}