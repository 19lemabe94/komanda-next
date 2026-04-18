'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useParams } from 'next/navigation'

type Product = {
  id: string
  name: string
  price: number
  category: string
  description: string | null
  image_url: string | null
  available: boolean
  has_sides: boolean // A coluna nova adicionada aqui!
}

type MenuConfig = {
  restaurant_name: string
  tagline: string
  primary_color: string
  logo_url: string | null
  whatsapp: string | null
  address: string | null
}

type DeliveryFee = {
  id: string
  neighborhood: string
  fee: number
}

type CartItem = {
  product: Product
  quantity: number
  accompaniment?: 'fritas' | 'salada'
  notes?: string
}

type DeliveryForm = {
  name: string
  modality: 'entrega' | 'retirada'
  address: string
  neighborhood: string
  reference: string
  payment: 'dinheiro' | 'cartao' | 'pix'
  change: string
}

export default function MenuPage() {
  const { org_id } = useParams()
  const [config, setConfig] = useState<MenuConfig | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [fees, setFees] = useState<DeliveryFee[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('Todos')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [orderSent, setOrderSent] = useState(false)
  const [sending, setSending] = useState(false)

  // Modal de produto (acompanhamento + observações)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [accompaniment, setAccompaniment] = useState<'fritas' | 'salada' | null>(null)
  const [notes, setNotes] = useState('')

  const [form, setForm] = useState<DeliveryForm>({
    name: '', modality: 'entrega', address: '',
    neighborhood: '', reference: '', payment: 'pix', change: ''
  })

  useEffect(() => { fetchMenu() }, [org_id])

  const fetchMenu = async () => {
    const { data: configData } = await supabase
      .from('menu_config').select('*').eq('org_id', org_id).single()

    const { data: categoriesData } = await supabase
      .from('categories').select('name, available').eq('org_id', org_id)

    const availableCategoryNames = (categoriesData || [])
      .filter(c => c.available !== false).map(c => c.name)

    const { data: productsData } = await supabase
      .from('products').select('*').eq('org_id', org_id).eq('available', true)
      .in('category', availableCategoryNames.length > 0 ? availableCategoryNames : ['__none__'])
      .order('category')

    const { data: feesData } = await supabase
      .from('delivery_fees').select('*').eq('org_id', org_id).order('neighborhood')

    if (configData) setConfig(configData)
    if (productsData) setProducts(productsData)
    if (feesData) setFees(feesData)
    
    setLoading(false)
  }

  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category)))]

  const filtered = products.filter(p => {
    const matchCategory = activeCategory === 'Todos' || p.category === activeCategory
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    return matchCategory && matchSearch
  })

  // --- NOVA LÓGICA DE ACOMPANHAMENTO ---
  const handleAddClick = (product: Product) => {
    // Agora olhamos para a coluna has_sides do banco, em vez da categoria inteira!
    if (product.has_sides) {
      setSelectedProduct(product)
      setAccompaniment(null)
      setNotes('')
    } else {
      addToCart(product, undefined, '')
    }
  }

  const addToCart = (product: Product, acc?: 'fritas' | 'salada', obs?: string) => {
    setCart(prev => {
      const key = `${product.id}-${acc || ''}-${obs || ''}`
      const exists = prev.find(i =>
        i.product.id === product.id &&
        i.accompaniment === acc &&
        i.notes === obs
      )
      if (exists) {
        return prev.map(i =>
          i.product.id === product.id && i.accompaniment === acc && i.notes === obs
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      return [...prev, { product, quantity: 1, accompaniment: acc, notes: obs }]
    })
  }

  const removeFromCart = (product: Product, acc?: 'fritas' | 'salada', obs?: string) => {
    setCart(prev => {
      const exists = prev.find(i =>
        i.product.id === product.id && i.accompaniment === acc && i.notes === obs
      )
      if (exists && exists.quantity > 1) {
        return prev.map(i =>
          i.product.id === product.id && i.accompaniment === acc && i.notes === obs
            ? { ...i, quantity: i.quantity - 1 }
            : i
        )
      }
      return prev.filter(i =>
        !(i.product.id === product.id && i.accompaniment === acc && i.notes === obs)
      )
    })
  }

  const handleConfirmProduct = () => {
    if (!selectedProduct) return
    // Validação também usa o has_sides agora
    if (selectedProduct.has_sides && !accompaniment) {
      alert('Escolha o acompanhamento!')
      return
    }
    addToCart(selectedProduct, accompaniment || undefined, notes)
    setSelectedProduct(null)
  }

  // Cálculos de Totais e Taxas
  const cartSubtotal = cart.reduce((acc, i) => acc + i.product.price * i.quantity, 0)
  const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0)
  
  const currentDeliveryFee = form.modality === 'entrega' && form.neighborhood
    ? fees.find(f => f.neighborhood === form.neighborhood)?.fee || 0
    : 0

  const finalTotal = cartSubtotal + currentDeliveryFee

  const primary = config?.primary_color || '#800020'

  const getNextDeliveryLabel = async (): Promise<string> => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('orders')
      .select('label')
      .eq('org_id', org_id)
      .eq('type', 'delivery')
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`)

    const count = (data?.length || 0) + 1
    return `delivery ${count}`
  }

  const sendOrder = async () => {
    if (!form.name.trim()) { alert('Digite seu nome!'); return }
    if (form.modality === 'entrega') {
      if (!form.address.trim()) { alert('Digite o endereço!'); return }
      if (!form.neighborhood) { alert('Selecione o bairro de entrega!'); return }
    }
    if (!config?.whatsapp) { alert('Restaurante sem WhatsApp cadastrado.'); return }

    setSending(true)

    try {
      const label = await getNextDeliveryLabel()

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          org_id,
          label,
          status: 'aberta',
          type: 'delivery',
          total: finalTotal, 
          payment_method: form.payment,
          delivery_info: {
            customer_name: form.name,
            modality: form.modality,
            address: form.address,
            neighborhood: form.neighborhood,
            delivery_fee: currentDeliveryFee, 
            reference: form.reference,
            change: form.change
          }
        }])
        .select()
        .single()

      if (orderError) throw orderError

      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        product_id: item.product.id,
        quantity: item.quantity,
        product_name_snapshot: item.product.name +
          (item.accompaniment ? ` + ${item.accompaniment}` : '') +
          (item.notes ? ` (${item.notes})` : ''),
        product_price_snapshot: item.product.price,
        unit_price: item.product.price
      }))

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      const items = cart.map(i => {
        let line = `  • ${i.quantity}x ${i.product.name}`
        if (i.accompaniment) line += ` + ${i.accompaniment}`
        if (i.notes) line += ` _(${i.notes})_`
        line += ` — R$ ${(i.product.price * i.quantity).toFixed(2)}`
        return line
      }).join('\n')

      const modalityLine = form.modality === 'entrega'
        ? `🛵 *Entrega*\n📍 ${form.address}, ${form.neighborhood}${form.reference ? '\n📌 Ref: ' + form.reference : ''}`
        : `🏃 *Retirada no local*`

      const paymentLine = form.payment === 'dinheiro'
        ? `💵 Dinheiro${form.change ? ' — Troco para R$ ' + form.change : ' — Sem troco'}`
        : form.payment === 'pix' ? '💠 PIX' : '💳 Cartão'

      const msg = [
        `🍽️ *NOVO PEDIDO — ${config.restaurant_name}*`,
        `🏷️ *${label.toUpperCase()}*`,
        ``,
        `👤 *Cliente:* ${form.name}`,
        ``,
        `🛒 *Itens:*`,
        items,
        ``,
        `💰 *Subtotal:* R$ ${cartSubtotal.toFixed(2)}`,
        ...(currentDeliveryFee > 0 ? [`🛵 *Taxa de Entrega:* R$ ${currentDeliveryFee.toFixed(2)}`] : []),
        `💲 *Total Final: R$ ${finalTotal.toFixed(2)}*`,
        ``,
        modalityLine,
        ``,
        `💳 *Pagamento:* ${paymentLine}`,
      ].join('\n')

      const phone = config.whatsapp.replace(/\D/g, '')
      const final = phone.startsWith('55') ? phone : `55${phone}`
      const url = `https://wa.me/${final}?text=${encodeURIComponent(msg)}`

      const link = document.createElement('a')
      link.href = url
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setOrderSent(true)
      setCart([])
      setShowCheckout(false)
      setShowCart(false)
      setForm({ name: '', modality: 'entrega', address: '', neighborhood: '', reference: '', payment: 'pix', change: '' })

    } catch (err: any) {
      alert('Erro ao registrar pedido: ' + err.message)
    } finally {
      setSending(false)
    }
  }

  const inputStyle = {
    width: '100%', padding: '12px 15px', border: '1px solid #e2e8f0',
    borderRadius: '12px', fontSize: '1rem', outline: 'none',
    boxSizing: 'border-box' as 'border-box', background: '#f8fafc', color: '#334155'
  }

  const optionBtnStyle = (active: boolean, color = primary) => ({
    flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
    fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
    background: active ? color : '#f1f5f9',
    color: active ? 'white' : '#64748b', transition: 'all 0.2s'
  })

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🍽️</div>
        <p style={{ color: '#64748b', fontWeight: 600 }}>Carregando cardápio...</p>
      </div>
    </div>
  )

  if (!config) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>😕</div>
        <p style={{ color: '#64748b', fontWeight: 600 }}>Cardápio não encontrado.</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif", paddingBottom: '100px' }}>

      {/* HEADER */}
      <div style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)`, color: 'white', padding: '40px 20px 30px', textAlign: 'center' }}>
        {config.logo_url && (
          <img src={config.logo_url} alt="Logo" style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.5)', marginBottom: '15px' }} />
        )}
        <h1 style={{ margin: '0 0 8px', fontSize: '1.8rem', fontWeight: 900 }}>{config.restaurant_name}</h1>
        {config.tagline && <p style={{ margin: '0 0 10px', opacity: 0.85, fontSize: '0.95rem' }}>{config.tagline}</p>}
        {config.address && <p style={{ margin: 0, opacity: 0.7, fontSize: '0.8rem' }}>📍 {config.address}</p>}
      </div>

      {/* CATEGORIAS + BUSCA */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10, padding: '12px 15px' }}>
        <div style={{ position: 'relative', maxWidth: '500px', margin: '0 auto 10px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem' }}>🔍</span>
          <input type="text" placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 38px', borderRadius: '20px', border: '1px solid #e2e8f0', fontSize: '0.9rem', outline: 'none', background: '#f8fafc', boxSizing: 'border-box' as 'border-box' }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1rem' }}>✕</button>}
        </div>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', justifyContent: 'center', flexWrap: 'wrap', paddingBottom: '2px' }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              style={{ padding: '7px 16px', borderRadius: '20px', border: 'none', whiteSpace: 'nowrap', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', background: activeCategory === cat ? primary : '#f1f5f9', color: activeCategory === cat ? 'white' : '#64748b', transition: 'all 0.2s' }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* PRODUTOS */}
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px 15px' }}>
        {orderSent && (
          <div style={{ background: '#dcfce7', border: '1px solid #22c55e', borderRadius: '16px', padding: '20px', textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>✅</div>
            <p style={{ margin: 0, fontWeight: 800, color: '#16a34a' }}>Pedido registrado e enviado!</p>
            <p style={{ margin: '5px 0 0', fontSize: '0.85rem', color: '#166534' }}>Obrigado.</p>
          </div>
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🔍</div>
            <p style={{ fontWeight: 600 }}>Nenhum produto encontrado.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {filtered.map(product => {
            const cartItems = cart.filter(i => i.product.id === product.id)
            const totalQty = cartItems.reduce((acc, i) => acc + i.quantity, 0)

            return (
              <div key={product.id} style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                {product.image_url
                  ? <img src={product.image_url} alt={product.name} style={{ width: '110px', height: '110px', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: '110px', height: '110px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '2rem' }}>🍽️</div>
                }
                <div style={{ flex: 1, padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800, color: '#0f172a', textTransform: 'capitalize' }}>{product.name}</h3>
                    {product.has_sides && (
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>🍟 Acompanha fritas ou salada</span>
                    )}
                    {product.description && <p style={{ margin: '4px 0 8px', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>{product.description}</p>}
                    <span style={{ fontWeight: 900, color: primary, fontSize: '1.1rem' }}>R$ {product.price.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    {totalQty > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button onClick={() => handleAddClick(product)}
                          style={{ padding: '6px 14px', background: primary, color: 'white', border: 'none', borderRadius: '20px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}>
                          + Add
                        </button>
                        <span style={{ fontWeight: 800, fontSize: '0.9rem', color: primary, background: `${primary}15`, padding: '4px 10px', borderRadius: '12px' }}>
                          {totalQty} no carrinho
                        </span>
                      </div>
                    ) : (
                      <button onClick={() => handleAddClick(product)}
                        style={{ padding: '8px 20px', background: primary, color: 'white', border: 'none', borderRadius: '20px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>
                        + Adicionar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* MODAL PRODUTO — Centralizado */}
      {selectedProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '450px', borderRadius: '24px', padding: '25px 20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', textTransform: 'capitalize' }}>{selectedProduct.name}</h3>
                <span style={{ color: primary, fontWeight: 900 }}>R$ {selectedProduct.price.toFixed(2)}</span>
              </div>
              <button onClick={() => setSelectedProduct(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            {/* SÓ MOSTRA AS OPÇÕES DE FRITAS/SALADA SE O PRODUTO PERMITIR */}
            {selectedProduct.has_sides && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 800, marginBottom: '10px', fontSize: '0.95rem', color: '#0f172a' }}>
                  Acompanhamento <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" onClick={() => setAccompaniment('fritas')}
                    style={{ ...optionBtnStyle(accompaniment === 'fritas', '#f97316'), padding: '15px', fontSize: '1rem', flex: 1, borderRadius: '12px', border: accompaniment === 'fritas' ? 'none' : '2px solid #e2e8f0' }}>
                    🍟 Fritas
                  </button>
                  <button type="button" onClick={() => setAccompaniment('salada')}
                    style={{ ...optionBtnStyle(accompaniment === 'salada', '#16a34a'), padding: '15px', fontSize: '1rem', flex: 1, borderRadius: '12px', border: accompaniment === 'salada' ? 'none' : '2px solid #e2e8f0' }}>
                    🥗 Salada
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.9rem', color: '#475569' }}>
                Observações (opcional)
              </label>
              <input
                placeholder="Ex: sem cebola, molho à parte..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                style={inputStyle}
              />
            </div>

            <button onClick={handleConfirmProduct}
              style={{ width: '100%', padding: '16px', background: primary, color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}>
              Adicionar ao Carrinho
            </button>
          </div>
        </div>
      )}

      {/* BOTÃO CARRINHO FLUTUANTE */}
      {cartCount > 0 && !showCart && !showCheckout && !selectedProduct && (
        <button onClick={() => setShowCart(true)}
          style={{ position: 'fixed', bottom: '25px', left: '50%', transform: 'translateX(-50%)', background: primary, color: 'white', border: 'none', borderRadius: '50px', padding: '16px 35px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', boxShadow: `0 8px 25px ${primary}60`, zIndex: 50, whiteSpace: 'nowrap' }}>
          🛒 Ver pedido ({cartCount}) — R$ {cartSubtotal.toFixed(2)}
        </button>
      )}

      {/* MODAL CARRINHO — Centralizado */}
      {showCart && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '450px', borderRadius: '24px', padding: '25px 20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem' }}>🛒 Seu Pedido</h3>
              <button onClick={() => setShowCart(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            {cart.map((item, idx) => (
              <div key={idx} style={{ padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: '0 0 2px', fontWeight: 700, textTransform: 'capitalize' }}>
                      {item.product.name}
                      {item.accompaniment && <span style={{ color: item.accompaniment === 'fritas' ? '#f97316' : '#16a34a', fontWeight: 800 }}> + {item.accompaniment}</span>}
                    </p>
                    {item.notes && <p style={{ margin: '0 0 2px', fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>📝 {item.notes}</p>}
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>R$ {item.product.price.toFixed(2)} cada</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => removeFromCart(item.product, item.accompaniment, item.notes)} style={{ width: '28px', height: '28px', borderRadius: '50%', border: `2px solid ${primary}`, background: 'white', color: primary, fontWeight: 900, cursor: 'pointer' }}>−</button>
                    <span style={{ fontWeight: 800, minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                    <button onClick={() => item.product.has_sides ? (setSelectedProduct(item.product), setAccompaniment(item.accompaniment || null), setNotes(item.notes || '')) : addToCart(item.product, item.accompaniment, item.notes)}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: primary, color: 'white', fontWeight: 900, cursor: 'pointer' }}>+</button>
                    <span style={{ fontWeight: 800, color: primary, minWidth: '70px', textAlign: 'right' }}>R$ {(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderTop: `2px solid ${primary}20`, marginTop: '10px' }}>
              <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>Subtotal</span>
              <span style={{ fontWeight: 900, fontSize: '1.2rem', color: primary }}>R$ {cartSubtotal.toFixed(2)}</span>
            </div>

            <button onClick={() => { setShowCart(false); setShowCheckout(true) }}
              style={{ width: '100%', padding: '16px', background: primary, color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', marginTop: '10px' }}>
              Continuar → Dados de Entrega
            </button>
          </div>
        </div>
      )}

      {/* MODAL CHECKOUT — Centralizado */}
      {showCheckout && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '450px', borderRadius: '24px', padding: '25px 20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem' }}>📋 Dados do Pedido</h3>
              <button onClick={() => { setShowCheckout(false); setShowCart(true) }} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '15px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Subtotal ({cartCount} itens)</span>
                <span style={{ fontWeight: 700 }}>R$ {cartSubtotal.toFixed(2)}</span>
              </div>
              {form.modality === 'entrega' && currentDeliveryFee > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Taxa de Entrega</span>
                  <span style={{ fontWeight: 700 }}>+ R$ {currentDeliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '1rem', color: primary, fontWeight: 800 }}>TOTAL A PAGAR</span>
                <span style={{ fontWeight: 900, color: primary, fontSize: '1.1rem' }}>R$ {finalTotal.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.9rem', color: '#475569' }}>Seu nome *</label>
              <input placeholder="Ex: João Silva" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.9rem', color: '#475569' }}>Modalidade *</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setForm(f => ({ ...f, modality: 'entrega' }))} style={optionBtnStyle(form.modality === 'entrega')}>🛵 Entrega</button>
                <button type="button" onClick={() => setForm(f => ({ ...f, modality: 'retirada', neighborhood: '' }))} style={optionBtnStyle(form.modality === 'retirada')}>🏃 Retirada</button>
              </div>
            </div>

            {form.modality === 'entrega' && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.9rem', color: '#475569' }}>Bairro de Entrega *</label>
                  <select 
                    value={form.neighborhood} 
                    onChange={e => setForm(f => ({ ...f, neighborhood: e.target.value }))} 
                    style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }}
                  >
                    <option value="">Selecione o bairro...</option>
                    {fees.map(f => (
                      <option key={f.id} value={f.neighborhood}>
                        {f.neighborhood} (+ R$ {f.fee.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.9rem', color: '#475569' }}>Endereço (Rua e Número) *</label>
                  <input placeholder="Ex: Rua das Flores, 123" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.9rem', color: '#475569' }}>Ponto de referência</label>
                  <input placeholder="Ex: Próximo ao mercado X" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} style={inputStyle} />
                </div>
              </>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.9rem', color: '#475569' }}>Forma de pagamento *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setForm(f => ({ ...f, payment: 'pix', change: '' }))} style={optionBtnStyle(form.payment === 'pix', '#0891b2')}>💠 PIX</button>
                <button type="button" onClick={() => setForm(f => ({ ...f, payment: 'dinheiro' }))} style={optionBtnStyle(form.payment === 'dinheiro', '#16a34a')}>💵 Dinheiro</button>
                <button type="button" onClick={() => setForm(f => ({ ...f, payment: 'cartao', change: '' }))} style={optionBtnStyle(form.payment === 'cartao', '#4f46e5')}>💳 Cartão</button>
              </div>
            </div>

            {form.payment === 'dinheiro' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.9rem', color: '#475569' }}>Troco para quanto?</label>
                <input type="number" placeholder="Ex: 50.00" value={form.change} onChange={e => setForm(f => ({ ...f, change: e.target.value }))} style={inputStyle} />
              </div>
            )}

            <button onClick={sendOrder} disabled={sending}
              style={{ width: '100%', padding: '16px', background: sending ? '#94a3b8' : '#25D366', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '1rem', cursor: sending ? 'not-allowed' : 'pointer', marginTop: '10px' }}>
              {sending ? 'Registrando...' : '📲 Confirmar e Enviar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}