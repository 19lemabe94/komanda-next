'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { colors, globalStyles } from '../styles/theme'

type Product = { id: string, name: string, price: number, category: string, org_id: string, active: boolean }
// Interface atualizada para bater com as novas colunas do banco
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
    // Verificação de segurança
    if (!selectedProduct || !myOrgId) return;

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    // Criamos o objeto LIMPO antes de enviar
    const novoItem = {
      order_id: orderId,
      product_id: product.id,
      quantity: quantity,
      org_id: myOrgId,
      product_name_snapshot: product.name,    // Nome novo
      product_price_snapshot: product.price   // Preço novo
    };

    console.log("Enviando para o banco:", novoItem); // Verifique no console do navegador!

    const { error } = await supabase
      .from('order_items')
      .insert([novoItem]);

    if (error) {
      console.error("Erro detalhado do Supabase:", error);
      alert(`Erro: ${error.message}`);
    } else {
      // Sucesso
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
    const confirmFinish = window.confirm(`Confirmar recebimento de R$ ${localTotal.toFixed(2)}?`)
    if (!confirmFinish) return

    const { error } = await supabase
      .from('orders')
      .update({ status: 'concluida', payment_method: method, total: localTotal })
      .eq('id', orderId)

    if (!error) { onUpdate(); onClose(); }
  }

  const localTotal = items.reduce((acc, item) => acc + (item.product_price_snapshot * item.quantity), 0)

  const qtyBtn = { padding: '10px 15px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }
  const btnPay = (color: string) => ({ backgroundColor: color, color: 'white', border: 'none', padding: '18px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' })

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
      <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '600px', height: '85vh', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        <div style={{ padding: '20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <h2 style={{ margin: 0, fontSize: '1.8rem', color: colors.primary }}>{label}</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
        </div>

        {isPaymentStep ? (
          <div style={{ flex: 1, padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#166534' }}>R$ {localTotal.toFixed(2)}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%', marginTop: '20px' }}>
              <button onClick={() => handleFinishOrder('pix')} style={btnPay('#06b6d4') as any}>PIX</button>
              <button onClick={() => handleFinishOrder('dinheiro')} style={btnPay('#22c55e') as any}>DINHEIRO</button>
              <button onClick={() => handleFinishOrder('cartao_debito')} style={btnPay('#3b82f6') as any}>DÉBITO</button>
              <button onClick={() => handleFinishOrder('cartao_credito')} style={btnPay('#1d4ed8') as any}>CRÉDITO</button>
            </div>
            <button onClick={() => setIsPaymentStep(false)} style={{ marginTop: '20px', background: 'none', border: 'none', cursor: 'pointer' }}>Voltar</button>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {items.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: '#f8fafc', borderRadius: '12px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ background: colors.primary, color: 'white', padding: '4px 10px', borderRadius: '6px', fontWeight: 800 }}>{item.quantity}x</span>
                    <div>
                      <div style={{ fontWeight: 700 }}>{item.product_name_snapshot}</div>
                      <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>un: R$ {item.product_price_snapshot.toFixed(2)}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800 }}>R$ {(item.product_price_snapshot * item.quantity).toFixed(2)}</span>
                    <button onClick={() => handleRemoveItem(item.id)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '15px 20px', backgroundColor: '#f1f5f9', display: 'flex', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', background: 'white', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={qtyBtn as any}>-</button>
                <span style={{ width: '30px', textAlign: 'center', fontWeight: 'bold' }}>{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} style={qtyBtn as any}>+</button>
              </div>
              <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '8px' }}>
                <option value="">Selecionar Produto...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)}</option>)}
              </select>
              <button onClick={handleAddItem} style={{ ...globalStyles.buttonPrimary, marginTop: 0, width: 'auto', padding: '0 25px' }}>Lançar</button>
            </div>

            <div style={{ padding: '20px', background: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <span style={{ fontWeight: 900, color: colors.primary, fontSize: '2.2rem' }}>R$ {localTotal.toFixed(2)}</span>
                <button onClick={() => setIsPaymentStep(true)} disabled={items.length === 0} style={{ padding: '15px 30px', borderRadius: '10px', background: '#22c55e', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer' }}>FECHAR CONTA</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}