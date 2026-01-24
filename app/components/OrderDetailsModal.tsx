'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { colors, globalStyles } from '../styles/theme'

type Product = { id: string, name: string, price: number, category: string }
type OrderItem = { id: string, name: string, unit_price: number, quantity: number }

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
  const [loading, setLoading] = useState(true)
  
  // Estado para controlar a tela de pagamento
  const [isPaymentStep, setIsPaymentStep] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: itemsData } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
    
    const { data: prodData } = await supabase
      .from('products')
      .select('*')
      .order('name')

    if (itemsData) setItems(itemsData)
    if (prodData) setProducts(prodData)
    setLoading(false)
  }

  // --- ADICIONAR ITEM ---
  const handleAddItem = async () => {
    if (!selectedProduct) return
    const product = products.find(p => p.id === selectedProduct)
    if (!product) return

    await supabase.from('order_items').insert([{
      order_id: orderId,
      product_id: product.id,
      name: product.name,
      unit_price: product.price,
      quantity: 1
    }])

    setSelectedProduct('')
    loadData() 
    onUpdate() 
  }

  // --- REMOVER ITEM ---
  const handleRemoveItem = async (itemId: string) => {
    await supabase.from('order_items').delete().eq('id', itemId)
    loadData()
    onUpdate()
  }

  // --- FINALIZAR COMANDA (PAGAMENTO) ---
  const handleFinishOrder = async (method: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'fiado') => {
    const confirm = window.confirm(`Confirmar recebimento de R$ ${localTotal.toFixed(2)} no ${method.toUpperCase()}?\nA mesa será encerrada.`)
    if (!confirm) return

    const { error } = await supabase
      .from('orders')
      .update({ 
        status: 'concluida',      // Marca como finalizada (some do dashboard principal)
        payment_method: method    // Grava como pagou
      })
      .eq('id', orderId)

    if (error) {
      alert('Erro ao finalizar: ' + error.message)
    } else {
      onUpdate() // Atualiza Dashboard
      onClose()  // Fecha Modal
    }
  }

  // --- IMPRIMIR ---
  const handlePrint = () => {
    window.alert('🖨️ Enviando para impressora...\n\n' + 
      `MESA: ${label}\n` + 
      items.map(i => `${i.name} - R$ ${i.unit_price}`).join('\n') + 
      `\nTOTAL: R$ ${localTotal.toFixed(2)}`
    )
  }

  const localTotal = items.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0)

  // -- RENDERIZAÇÃO --
  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px'
    }}>
      <div style={{
        backgroundColor: '#fff', width: '100%', maxWidth: '600px', height: '80vh',
        borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        
        {/* CABEÇALHO */}
        <div style={{ padding: '20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '1px' }}>
              {isPaymentStep ? 'Pagamento' : 'Detalhes da Mesa'}
            </span>
            <h2 style={{ margin: 0, fontSize: '2rem', color: colors.primary }}>{label}</h2>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: colors.textMuted }}>✕</button>
        </div>

        {/* CONTEÚDO: SE FOR TELA DE PAGAMENTO */}
        {isPaymentStep ? (
          <div style={{ flex: 1, padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0fdf4' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '10px', color: '#166534' }}>Total a Receber</h3>
            <div style={{ fontSize: '3.5rem', fontWeight: 800, color: '#166534', marginBottom: '40px' }}>
              R$ {localTotal.toFixed(2)}
            </div>
            
            <p style={{ marginBottom: '15px', color: '#166534', fontWeight: 600 }}>Selecione a forma de pagamento:</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', width: '100%' }}>
              <button onClick={() => handleFinishOrder('pix')} style={paymentButtonStyle('#06b6d4')}>💠 PIX</button>
              <button onClick={() => handleFinishOrder('dinheiro')} style={paymentButtonStyle('#22c55e')}>💵 DINHEIRO</button>
              <button onClick={() => handleFinishOrder('cartao_debito')} style={paymentButtonStyle('#3b82f6')}>💳 DÉBITO</button>
              <button onClick={() => handleFinishOrder('cartao_credito')} style={paymentButtonStyle('#1d4ed8')}>💳 CRÉDITO</button>
              <button onClick={() => handleFinishOrder('fiado')} style={paymentButtonStyle('#f97316')}>📝 FIADO /PENDURA</button>
            </div>

            <button 
              onClick={() => setIsPaymentStep(false)} 
              style={{ marginTop: '30px', background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', textDecoration: 'underline' }}
            >
              ← Voltar para pedidos
            </button>
          </div>
        ) : (
          /* CONTEÚDO: LISTA DE PEDIDOS (NORMAL) */
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', backgroundColor: 'white' }}>
              {loading ? <p>Carregando...</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {items.length === 0 && <p style={{textAlign:'center', color: colors.textMuted, marginTop: '20px'}}>Nenhum item lançado.</p>}
                  {items.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px dashed #eee' }}>
                      <div><span style={{ fontWeight: 600 }}>{item.name}</span></div>
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <span>R$ {item.unit_price.toFixed(2)}</span>
                        <button onClick={() => handleRemoveItem(item.id)} style={{ color: '#ef4444', background: '#fee2e2', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* INPUT DE ADICIONAR */}
            <div style={{ padding: '15px 20px', backgroundColor: '#f1f5f9', borderTop: `1px solid ${colors.border}`, display: 'flex', gap: '10px' }}>
              <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                <option value="">Adicionar produto...</option>
                {products.map(p => (<option key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)}</option>))}
              </select>
              <button onClick={handleAddItem} disabled={!selectedProduct} style={{ ...globalStyles.buttonPrimary, marginTop: 0, width: 'auto' }}>ADD</button>
            </div>
          </>
        )}

        {/* RODAPÉ DO TOTAL (Aparece só se NÃO estiver pagando) */}
        {!isPaymentStep && (
          <div style={{ padding: '20px', borderTop: `1px solid ${colors.border}`, backgroundColor: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
              <span style={{ color: colors.textMuted }}>Total Parcial</span>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: colors.primary }}>R$ {localTotal.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <button onClick={handlePrint} style={{ flex: 1, padding: '15px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: 'white', fontWeight: 'bold' }}>🖨️ Imprimir</button>
              
              {/* Este botão agora Leva para a TELA DE PAGAMENTO */}
              <button 
                onClick={() => setIsPaymentStep(true)}
                disabled={localTotal <= 0} // Trava se for 0
                style={{ flex: 1, padding: '15px', borderRadius: '8px', backgroundColor: localTotal > 0 ? '#22c55e' : '#cbd5e1', color: 'white', fontWeight: 'bold', border: 'none', cursor: localTotal > 0 ? 'pointer' : 'not-allowed' }}
              >
                💰 Encerrar Conta
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// Estilo auxiliar para os botões de pagamento ficarem bonitos
const paymentButtonStyle = (color: string) => ({
  backgroundColor: color,
  color: 'white',
  border: 'none',
  padding: '20px',
  borderRadius: '12px',
  fontSize: '1rem',
  fontWeight: 'bold',
  cursor: 'pointer',
  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  transition: 'transform 0.1s'
})