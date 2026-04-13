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
}

type MenuConfig = {
  restaurant_name: string
  tagline: string
  primary_color: string
  logo_url: string | null
  whatsapp: string | null
  address: string | null
}

type CartItem = Product & { quantity: number }

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
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('Todos')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [orderSent, setOrderSent] = useState(false)

  const [form, setForm] = useState<DeliveryForm>({
    name: '',
    modality: 'entrega',
    address: '',
    neighborhood: '',
    reference: '',
    payment: 'pix',
    change: ''
  })

  useEffect(() => { fetchMenu() }, [org_id])

  const fetchMenu = async () => {
    const { data: configData } = await supabase
      .from('menu_config')
      .select('*')
      .eq('org_id', org_id)
      .single()

    const { data: categoriesData } = await supabase
      .from('categories')
      .select('name, available')
      .eq('org_id', org_id)

    const availableCategoryNames = (categoriesData || [])
      .filter(c => c.available !== false)
      .map(c => c.name)

    const { data: productsData } = await supabase
      .from('products')
      .select('*')
      .eq('org_id', org_id)
      .eq('available', true)
      .in('category', availableCategoryNames.length > 0 ? availableCategoryNames : ['__none__'])
      .order('category')

    if (configData) setConfig(configData)
    if (productsData) setProducts(productsData)
    setLoading(false)
  }

  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category)))]

  const filtered = products.filter(p => {
    const matchCategory = activeCategory === 'Todos' || p.category === activeCategory
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    return matchCategory && matchSearch
  })

  const addToCart = (product: Product) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === product.id)
      if (exists) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === productId)
      if (exists && exists.quantity > 1) return prev.map(i => i.id === productId ? { ...i, quantity: i.quantity - 1 } : i)
      return prev.filter(i => i.id !== productId)
    })
  }

  const cartTotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0)
  const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0)
  const primary = config?.primary_color || '#800020'

  const sendWhatsAppOrder = () => {
    if (!form.name.trim()) { alert('Digite seu nome!'); return }
    if (form.modality === 'entrega' && !form.address.trim()) { alert('Digite o endereço de entrega!'); return }
    if (!config?.whatsapp) { alert('Restaurante sem WhatsApp cadastrado.'); return }

    const items = cart.map(i => `  • ${i.quantity}x ${i.name} — R$ ${(i.price * i.quantity).toFixed(2)}`).join('\n')

    const modalityLine = form.modality === 'entrega'
      ? `🛵 *Entrega*\n📍 ${form.address}${form.neighborhood ? ', ' + form.neighborhood : ''}${form.reference ? '\n📌 Ref: ' + form.reference : ''}`
      : `🏃 *Retirada no local*`

    const paymentLine = form.payment === 'dinheiro'
      ? `💵 Dinheiro${form.change ? ' — Troco para R$ ' + form.change : ' — Sem troco'}`
      : form.payment === 'pix' ? '💠 PIX' : '💳 Cartão'

    const msg = [
      `🍽️ *NOVO PEDIDO — ${config.restaurant_name}*`,
      ``,
      `👤 *Cliente:* ${form.name}`,
      ``,
      `🛒 *Itens:*`,
      items,
      ``,
      `💰 *Total: R$ ${cartTotal.toFixed(2)}*`,
      ``,
      modalityLine,
      ``,
      `💳 *Pagamento:* ${paymentLine}`,
    ].join('\n')

    const phone = config.whatsapp.replace(/\D/g, '')
    const final = phone.startsWith('55') ? phone : `55${phone}`
    window.open(`https://wa.me/${final}?text=${encodeURIComponent(msg)}`, '_blank')

    setOrderSent(true)
    setCart([])
    setShowCheckout(false)
    setShowCart(false)
    setForm({ name: '', modality: 'entrega', address: '', neighborhood: '', reference: '', payment: 'pix', change: '' })
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
    color: active ? 'white' : '#64748b',
    transition: 'all 0.2s'
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

        {/* BUSCA */}
        <div style={{ position: 'relative', maxWidth: '500px', margin: '0 auto 10px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem' }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar produto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '10px 10px 10px 38px',
              borderRadius: '20px', border: '1px solid #e2e8f0',
              fontSize: '0.9rem', outline: 'none', background: '#f8fafc',
              boxSizing: 'border-box' as 'border-box'
            }}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1rem' }}>
              ✕
            </button>
          )}
        </div>

        {/* CATEGORIAS CENTRALIZADAS */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', justifyContent: 'center', flexWrap: 'wrap', paddingBottom: '2px' }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              style={{
                padding: '7px 16px', borderRadius: '20px', border: 'none',
                whiteSpace: 'nowrap', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                background: activeCategory === cat ? primary : '#f1f5f9',
                color: activeCategory === cat ? 'white' : '#64748b',
                transition: 'all 0.2s'
              }}>
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
            <p style={{ margin: 0, fontWeight: 800, color: '#16a34a' }}>Pedido enviado pelo WhatsApp!</p>
            <p style={{ margin: '5px 0 0', fontSize: '0.85rem', color: '#166534' }}>Em breve entraremos em contato.</p>
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
            const cartItem = cart.find(i => i.id === product.id)
            return (
              <div key={product.id} style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                {product.image_url
                  ? <img src={product.image_url} alt={product.name} style={{ width: '110px', height: '110px', objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: '110px', height: '110px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '2rem' }}>🍽️</div>
                }
                <div style={{ flex: 1, padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800, color: '#0f172a', textTransform: 'capitalize' }}>{product.name}</h3>
                    {product.description && <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>{product.description}</p>}
                    <span style={{ fontWeight: 900, color: primary, fontSize: '1.1rem' }}>R$ {product.price.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    {cartItem ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button onClick={() => removeFromCart(product.id)} style={{ width: '32px', height: '32px', borderRadius: '50%', border: `2px solid ${primary}`, background: 'white', color: primary, fontWeight: 900, fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ fontWeight: 800, fontSize: '1rem', minWidth: '20px', textAlign: 'center' }}>{cartItem.quantity}</span>
                        <button onClick={() => addToCart(product)} style={{ width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: primary, color: 'white', fontWeight: 900, fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(product)} style={{ padding: '8px 20px', background: primary, color: 'white', border: 'none', borderRadius: '20px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>
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

      {/* BOTÃO CARRINHO FLUTUANTE */}
      {cartCount > 0 && !showCart && !showCheckout && (
        <button onClick={() => setShowCart(true)}
          style={{ position: 'fixed', bottom: '25px', left: '50%', transform: 'translateX(-50%)', background: primary, color: 'white', border: 'none', borderRadius: '50px', padding: '16px 35px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', boxShadow: `0 8px 25px ${primary}60`, zIndex: 50, whiteSpace: 'nowrap' }}>
          🛒 Ver pedido ({cartCount}) — R$ {cartTotal.toFixed(2)}
        </button>
      )}

      {/* MODAL CARRINHO */}
      {showCart && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '500px', borderRadius: '24px 24px 0 0', padding: '25px 20px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem' }}>🛒 Seu Pedido</h3>
              <button onClick={() => setShowCart(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            {cart.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 2px', fontWeight: 700, textTransform: 'capitalize' }}>{item.name}</p>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>R$ {item.price.toFixed(2)} cada</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button onClick={() => removeFromCart(item.id)} style={{ width: '28px', height: '28px', borderRadius: '50%', border: `2px solid ${primary}`, background: 'white', color: primary, fontWeight: 900, cursor: 'pointer' }}>−</button>
                  <span style={{ fontWeight: 800, minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
                  <button onClick={() => addToCart(item)} style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: primary, color: 'white', fontWeight: 900, cursor: 'pointer' }}>+</button>
                  <span style={{ fontWeight: 800, color: primary, minWidth: '70px', textAlign: 'right' }}>R$ {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderTop: `2px solid ${primary}20`, marginTop: '10px' }}>
              <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>Total</span>
              <span style={{ fontWeight: 900, fontSize: '1.2rem', color: primary }}>R$ {cartTotal.toFixed(2)}</span>
            </div>

            <button onClick={() => { setShowCart(false); setShowCheckout(true) }}
              style={{ width: '100%', padding: '16px', background: primary, color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', marginTop: '10px' }}>
              Continuar → Dados de Entrega
            </button>
          </div>
        </div>
      )}

      {/* MODAL CHECKOUT */}
      {showCheckout && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: 'white', width: '100%', maxWidth: '500px', borderRadius: '24px 24px 0 0', padding: '25px 20px', maxHeight: '92vh', overflowY: 'auto' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem' }}>📋 Dados do Pedido</h3>
              <button onClick={() => { setShowCheckout(false); setShowCart(true) }} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>

            {/* RESUMO */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px 15px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
              <p style={{ margin: '0 0 4px', fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>RESUMO</p>
              <p style={{ margin: 0, fontWeight: 800, color: primary, fontSize: '1.1rem' }}>{cartCount} iten(s) — R$ {cartTotal.toFixed(2)}</p>
            </div>

            {/* NOME */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.9rem', color: '#475569' }}>Seu nome *</label>
              <input placeholder="Ex: João Silva" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
            </div>

            {/* MODALIDADE */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.9rem', color: '#475569' }}>Modalidade *</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setForm(f => ({ ...f, modality: 'entrega' }))} style={optionBtnStyle(form.modality === 'entrega')}>🛵 Entrega</button>
                <button type="button" onClick={() => setForm(f => ({ ...f, modality: 'retirada' }))} style={optionBtnStyle(form.modality === 'retirada')}>🏃 Retirada</button>
              </div>
            </div>

            {/* ENDEREÇO */}
            {form.modality === 'entrega' && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.9rem', color: '#475569' }}>Endereço *</label>
                  <input placeholder="Rua, número" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.9rem', color: '#475569' }}>Bairro</label>
                  <input placeholder="Ex: Centro" value={form.neighborhood} onChange={e => setForm(f => ({ ...f, neighborhood: e.target.value }))} style={inputStyle} />
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.9rem', color: '#475569' }}>Ponto de referência</label>
                  <input placeholder="Ex: Próximo ao mercado X" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} style={inputStyle} />
                </div>
              </>
            )}

            {/* PAGAMENTO */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.9rem', color: '#475569' }}>Forma de pagamento *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setForm(f => ({ ...f, payment: 'pix', change: '' }))} style={optionBtnStyle(form.payment === 'pix', '#0891b2')}>💠 PIX</button>
                <button type="button" onClick={() => setForm(f => ({ ...f, payment: 'dinheiro' }))} style={optionBtnStyle(form.payment === 'dinheiro', '#16a34a')}>💵 Dinheiro</button>
                <button type="button" onClick={() => setForm(f => ({ ...f, payment: 'cartao', change: '' }))} style={optionBtnStyle(form.payment === 'cartao', '#4f46e5')}>💳 Cartão</button>
              </div>
            </div>

            {/* TROCO */}
            {form.payment === 'dinheiro' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.9rem', color: '#475569' }}>Troco para quanto? (deixe vazio se não precisar)</label>
                <input type="number" placeholder="Ex: 50.00" value={form.change} onChange={e => setForm(f => ({ ...f, change: e.target.value }))} style={inputStyle} />
              </div>
            )}

            <button onClick={sendWhatsAppOrder}
              style={{ width: '100%', padding: '16px', background: '#25D366', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', marginTop: '10px' }}>
              📲 Confirmar e Enviar pelo WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  )
}