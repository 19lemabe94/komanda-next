'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { colors, globalStyles } from '../styles/theme'

type Product = { id: string, name: string, price: number, category: string, org_id: string }
type OrderItem = { id: string, name: string, unit_price: number, quantity: number, org_id: string }

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

      // 1. Busca o perfil para garantir o org_id do usuário logado
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', session.user.id)
        .single()

      if (profile?.org_id) {
        setMyOrgId(profile.org_id)

        // 2. Busca Itens e Produtos em paralelo para maior performance
        const [itemsRes, prodRes] = await Promise.all([
          supabase.from('order_items').select('*').eq('order_id', orderId).order('created_at', { ascending: true }),
          supabase.from('products').select('*').eq('org_id', profile.org_id).order('name')
        ])

        if (itemsRes.data) setItems(itemsRes.data)
        if (prodRes.data) setProducts(prodRes.data)
      }
    } catch (err) {
      console.error("Erro ao carregar dados do modal:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async () => {
    if (!selectedProduct || !myOrgId) {
      alert("Selecione um produto e aguarde o carregamento.")
      return
    }

    const product = products.find(p => p.id === selectedProduct)
    if (!product) return

    const { error } = await supabase.from('order_items').insert([{
      order_id: orderId,
      product_id: product.id,
      name: product.name,
      unit_price: product.price,
      quantity: quantity,
      org_id: myOrgId 
    }])

    if (error) {
      alert("Erro ao adicionar item: " + error.message)
    } else {
      setSelectedProduct('')
      setQuantity(1)
      await loadData()
      onUpdate()
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    const { error } = await supabase.from('order_items').delete().eq('id', itemId)
    if (!error) {
      await loadData()
      onUpdate()
    }
  }

  const handleFinishOrder = async (method: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'fiado') => {
    const confirm = window.confirm(`Confirmar recebimento de R$ ${localTotal.toFixed(2)} no ${method.toUpperCase()}?`)
    if (!confirm) return

    const { error } = await supabase
      .from('orders')
      .update({ status: 'concluida', payment_method: method })
      .eq('id', orderId)

    if (!error) {
      onUpdate()
      onClose()
    } else {
      alert("Erro ao encerrar conta: " + error.message)
    }
  }

  const handlePrint = () => {
    window.alert('🖨️ Enviando para impressora...\n\n' + 
      `MESA: ${label}\n` + 
      items.map(i => `${i.quantity}x ${i.name} - R$ ${(i.unit_price * i.quantity).toFixed(2)}`).join('\n') + 
      `\nTOTAL: R$ ${localTotal.toFixed(2)}`
    )
  }

  const localTotal = items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0)

  // Estilos auxiliares
  const qtyBtn = { padding: '10px 15px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }
  const btnPay = (color: string) => ({
    backgroundColor: color, color: 'white', border: 'none', padding: '18px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem'
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px'
    }}>
      <div style={{
        backgroundColor: '#fff', width: '100%', maxWidth: '600px', height: '85vh',
        borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        
        <div style={{ padding: '20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '1px' }}>
              {isPaymentStep ? 'Pagamento' : 'Detalhes da Mesa'}
            </span>
            <h2 style={{ margin: 0, fontSize: '2rem', color: colors.primary }}>{label}</h2>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: colors.textMuted }}>✕</button>
        </div>

        {isPaymentStep ? (
          <div style={{ flex: 1, padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0fdf4' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#166534', margin: 0 }}>Total a Pagar</h3>
            <div style={{ fontSize: '3.5rem', fontWeight: 800, color: '#166534', marginBottom: '30px' }}>
              R$ {localTotal.toFixed(2)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
              <button onClick={() => handleFinishOrder('pix')} style={btnPay('#06b6d4') as any}>💠 PIX</button>
              <button onClick={() => handleFinishOrder('dinheiro')} style={btnPay('#22c55e') as any}>💵 DINHEIRO</button>
              <button onClick={() => handleFinishOrder('cartao_debito')} style={btnPay('#3b82f6') as any}>💳 DÉBITO</button>
              <button onClick={() => handleFinishOrder('cartao_credito')} style={btnPay('#1d4ed8') as any}>💳 CRÉDITO</button>
              <button onClick={() => handleFinishOrder('fiado')} style={{ ...btnPay('#f97316'), gridColumn: 'span 2' } as any}>📝 PENDURAR (FIADO)</button>
            </div>
            <button onClick={() => setIsPaymentStep(false)} style={{ marginTop: '20px', background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer' }}>← Voltar para a comanda</button>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {loading ? <p style={{textAlign: 'center', color: colors.textMuted}}>Carregando itens...</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {items.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ background: colors.primary, color: 'white', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold' }}>{item.quantity}x</span>
                        <span style={{ fontWeight: 600 }}>{item.name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold' }}>R$ {(item.unit_price * item.quantity).toFixed(2)}</span>
                        <button onClick={() => handleRemoveItem(item.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}>🗑️</button>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <p style={{textAlign: 'center', color: colors.textMuted, marginTop: '20px'}}>Mesa vazia.</p>}
                </div>
              )}
            </div>

            <div style={{ padding: '15px 20px', backgroundColor: '#f1f5f9', borderTop: `1px solid ${colors.border}`, display: 'flex', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'white', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={qtyBtn as any}>-</button>
                <span style={{ width: '30px', textAlign: 'center', fontWeight: 'bold' }}>{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} style={qtyBtn as any}>+</button>
              </div>
              <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                <option value="">O que vai sair?</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)}</option>)}
              </select>
              <button onClick={handleAddItem} disabled={!selectedProduct || loading} style={{ ...globalStyles.buttonPrimary, marginTop: 0, width: 'auto', padding: '0 20px' }}>ADD</button>
            </div>

            <div style={{ padding: '20px', borderTop: `1px solid ${colors.border}`, background: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <span style={{ color: colors.textMuted }}>Total da Mesa</span>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: colors.primary }}>R$ {localTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={handlePrint} style={{ flex: 1, padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: 'white', fontWeight: 'bold', cursor: 'pointer' }}>🖨️ Imprimir</button>
                <button 
                    onClick={() => setIsPaymentStep(true)} 
                    disabled={items.length === 0} 
                    style={{ flex: 1.5, padding: '15px', borderRadius: '8px', background: items.length > 0 ? '#22c55e' : '#cbd5e1', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    💰 Encerrar Conta
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}