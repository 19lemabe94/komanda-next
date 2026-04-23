'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { colors } from '../styles/theme'

// --- ÍCONES SVG ---
const IconPen = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
const IconClose = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
const IconPrint = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
const IconTrash = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
const IconSearch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
const IconBluetooth = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6.5 6.5 17.5 17.5 12 23 12 1 17.5 6.5 6.5 17.5"></polyline></svg>

type OrderItem = { id: string, product_name_snapshot: string, product_price_snapshot: number, quantity: number }
type Product = { id: string, name: string, price: number, category: string }
type Category = { id: string, name: string }

interface Props {
  orderId: string; 
  label: string; 
  total?: number; 
  onPayment?: (orderId: string, amount: number, method: string, clientId?: string | null) => Promise<void>
  onClose: () => void; 
  onUpdate: () => void; 
  userRole: string | null 
}

export function OrderDetailsModal({ orderId, label, onPayment, onClose, onUpdate, userRole }: Props) {
  const luxuryBlack = '#111111'; const grenaColor = '#800020'; const textMuted = '#737373'; const borderLight = '#eaeaea'

  const [activeTab, setActiveTab] = useState<'menu' | 'comanda'>('menu')
  const [items, setItems] = useState<OrderItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([]) 
  const [myOrgId, setMyOrgId] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState('KOMANDAPRO')
  
  const [loading, setLoading] = useState(true)
  const [isPaymentStep, setIsPaymentStep] = useState(false)
  const [showClientSelector, setShowClientSelector] = useState(false)
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('TODAS')
  const [selectedProductId, setSelectedProductId] = useState('') 
  const [quantity, setQuantity] = useState(1)
  const [paidAmount, setPaidAmount] = useState(0)
  const [amountToPay, setAmountToPay] = useState('')
  const [clients, setClients] = useState<{id: string, name: string}[]>([])
  const [clientSearch, setClientSearch] = useState('')

  useEffect(() => { loadData() }, [orderId])
  
  const loadData = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', session.user.id).single()
      if (profile?.org_id) {
        setMyOrgId(profile.org_id)
        const [itemsRes, prodRes, catRes, payRes, clientRes, configRes] = await Promise.all([
          supabase.from('order_items').select('*').eq('order_id', orderId).order('created_at', { ascending: true }),
          supabase.from('products').select('*').eq('org_id', profile.org_id).eq('active', true).order('name'),
          supabase.from('categories').select('*').eq('org_id', profile.org_id).order('name'),
          supabase.from('payments').select('amount').eq('order_id', orderId),
          supabase.from('clients').select('id, name').eq('org_id', profile.org_id).order('name'),
          supabase.from('menu_config').select('restaurant_name').eq('org_id', profile.org_id).single()
        ])
        if (itemsRes.data) setItems(itemsRes.data)
        if (prodRes.data) setProducts(prodRes.data)
        if (catRes.data) setCategories(catRes.data)
        if (clientRes.data) setClients(clientRes.data)
        if (configRes.data?.restaurant_name) setRestaurantName(configRes.data.restaurant_name)
        const totalPaid = payRes.data?.reduce((acc, curr) => acc + curr.amount, 0) || 0
        setPaidAmount(totalPaid)
      }
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const itemsTotal = items.reduce((acc, item) => acc + (item.product_price_snapshot * item.quantity), 0)
  const remainingBalance = Math.max(0, itemsTotal - paidAmount)

  // --- FUNÇÃO DE IMPRESSÃO WEB BLUETOOTH REVISADA ---
  const handlePrintBluetooth = async () => {
    try {
      // @ts-ignore
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2']
      });
      const server = await device.gatt?.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristics = await service.getCharacteristics();
      const writeChar = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);

      // Funções de formatação (30 Colunas)
      const COLS = 30;
      const formatL = (l: string, r: string) => l + " ".repeat(Math.max(1, COLS - l.length - r.length)) + r;
      const centerText = (text: string) => { 
        if (text.length >= COLS) return text.substring(0, COLS); 
        const padding = Math.floor((COLS - text.length) / 2); 
        return " ".repeat(padding) + text; 
      };
      
      let txt = `\n${centerText(restaurantName.toUpperCase())}\n`;
      txt += centerText(`CONTA: ${label.toUpperCase()}`) + "\n";
      txt += "-".repeat(COLS) + "\n";
      
      items.forEach(i => {
        txt += `${i.product_name_snapshot.toUpperCase()}\n`;
        txt += formatL(`${i.quantity}x R$${i.product_price_snapshot.toFixed(2)}`, `R$${(i.quantity * i.product_price_snapshot).toFixed(2)}`) + "\n";
      });
      
      txt += "-".repeat(COLS) + "\n";
      txt += formatL("TOTAL:", `R$${itemsTotal.toFixed(2)}`) + "\n";
      
      if (paidAmount > 0) {
        txt += formatL("JA PAGO:", `R$${paidAmount.toFixed(2)}`) + "\n";
        txt += formatL("FALTA:", `R$${remainingBalance.toFixed(2)}`) + "\n";
      }
      
      txt += "-".repeat(COLS) + "\n";
      txt += centerText("OBRIGADO PELA PREFERENCIA") + "\n\n\n\n";

      const cleanTxt = txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const encoder = new TextEncoder();
      const bytes = encoder.encode(cleanTxt);
      
      await writeChar.writeValue(new Uint8Array([27, 64])); // Reset
      const chunkSize = 256;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        await writeChar.writeValue(bytes.slice(i, i + chunkSize));
      }
      alert("Impressão enviada!");
    } catch (e: any) {
      alert("Erro Bluetooth: " + e.message);
    }
  };

  const handleAddItem = async () => {
    if (!myOrgId) return
    let payload: any = {}
    if (isCustomMode) {
      if (!customName.trim() || !customPrice) return alert('Preencha nome e preço.')
      payload = { order_id: orderId, quantity, org_id: myOrgId, product_name_snapshot: customName.trim() + ' (Avulso)', product_price_snapshot: parseFloat(customPrice.replace(',', '.')) }
    } else {
      const p = products.find(prod => prod.id === selectedProductId)
      if (!p) return
      payload = { order_id: orderId, product_id: p.id, quantity, org_id: myOrgId, product_name_snapshot: p.name, product_price_snapshot: p.price }
    }
    const { error } = await supabase.from('order_items').insert([payload])
    if (!error) {
      setQuantity(1); setCustomName(''); setCustomPrice(''); setSelectedProductId(''); setIsCustomMode(false);
      await loadData(); onUpdate()
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    if (userRole !== 'admin') return alert('Apenas gerentes.')
    await supabase.from('order_items').delete().eq('id', itemId)
    await loadData(); onUpdate()
  }

  const processPayment = async (method: string, clientId: string | null) => {
    const val = parseFloat(amountToPay.replace(',', '.'))
    if (isNaN(val) || val <= 0) return alert('Valor inválido')
    if (onPayment) { await onPayment(orderId, val, method, clientId); onClose() }
  }

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) && (selectedCategory === 'TODAS' || p.category === selectedCategory))

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <style jsx global>{` .no-scrollbar::-webkit-scrollbar { display: none; } .slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); } @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } } `}</style>

      <div className="slide-up" style={{ backgroundColor: '#fff', width: '100%', maxWidth: '550px', height: '94vh', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* HEADER */}
        <div style={{ padding: '20px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${borderLight}` }}>
          <div><h2 style={{ margin: 0, fontSize: '1.3rem', color: luxuryBlack, fontWeight: 700, textTransform: 'capitalize' }}>{label}</h2><p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: textMuted }}>Total: R$ {itemsTotal.toFixed(2)}</p></div>
          <button onClick={onClose} style={{ background: '#f5f5f5', border: 'none', width: '38px', height: '38px', borderRadius: '50%', cursor: 'pointer' }}><IconClose /></button>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', background: '#fafafa', borderBottom: `1px solid ${borderLight}` }}>
          <button onClick={() => {setActiveTab('menu'); setIsPaymentStep(false)}} style={{ flex: 1, padding: '16px', border: 'none', borderBottom: activeTab === 'menu' ? `2px solid ${luxuryBlack}` : 'none', background: 'none', fontWeight: activeTab === 'menu' ? 700 : 500, color: activeTab === 'menu' ? luxuryBlack : textMuted, cursor: 'pointer' }}>Cardápio</button>
          <button onClick={() => {setActiveTab('comanda'); setIsPaymentStep(false)}} style={{ flex: 1, padding: '16px', border: 'none', borderBottom: activeTab === 'comanda' ? `2px solid ${luxuryBlack}` : 'none', background: 'none', fontWeight: activeTab === 'comanda' ? 700 : 500, color: activeTab === 'comanda' ? luxuryBlack : textMuted, cursor: 'pointer' }}>Comanda ({items.length})</button>
        </div>

        {activeTab === 'menu' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: `1px solid ${borderLight}` }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input placeholder="Buscar no cardápio..." disabled={isCustomMode} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '12px 15px 12px 45px', borderRadius: '10px', border: `1px solid ${borderLight}`, outline: 'none', background: isCustomMode ? '#f5f5f5' : '#fff', fontSize: '0.95rem' }} />
                  <div style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: '#999', display: 'flex' }}><IconSearch /></div>
                </div>
              </div>
              {!isCustomMode && (
                  <div className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' }}>
                    <button onClick={() => setSelectedCategory('TODAS')} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, background: selectedCategory === 'TODAS' ? luxuryBlack : '#f5f5f5', color: selectedCategory === 'TODAS' ? 'white' : textMuted, whiteSpace: 'nowrap' }}>Todas</button>
                    {categories.map(cat => (
                      <button key={cat.id} onClick={() => setSelectedCategory(cat.name)} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, background: selectedCategory === cat.name ? luxuryBlack : '#f5f5f5', color: selectedCategory === cat.name ? 'white' : textMuted, whiteSpace: 'nowrap' }}>{cat.name}</button>
                    ))}
                  </div>
              )}
            </div>
            <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {isCustomMode ? (
                <div className="slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <input autoFocus placeholder="Nome do Produto" value={customName} onChange={e => setCustomName(e.target.value)} style={{ width: '100%', padding: '18px', borderRadius: '12px', border: `1px solid ${borderLight}`, fontSize: '1.1rem', outline: 'none' }} />
                  <input type="number" placeholder="Preço (R$ 0.00)" value={customPrice} onChange={e => setCustomPrice(e.target.value)} style={{ width: '100%', padding: '18px', borderRadius: '12px', border: `1px solid ${borderLight}`, fontSize: '1.5rem', fontWeight: 700, outline: 'none', color: '#166534', textAlign: 'center' }} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredProducts.map(p => (
                    <div key={p.id} onClick={() => setSelectedProductId(p.id)} style={{ padding: '15px', borderRadius: '12px', border: `1px solid ${selectedProductId === p.id ? luxuryBlack : borderLight}`, background: selectedProductId === p.id ? '#f9f9f9' : '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div><div style={{ fontWeight: 600 }}>{p.name}</div><small style={{ color: textMuted }}>{p.category}</small></div>
                      <div style={{ fontWeight: 700 }}>R$ {p.price.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: '20px', borderTop: `1px solid ${borderLight}`, background: '#fff' }}>
                <div style={{ display: 'flex', gap: '10px', height: '55px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#f5f5f5', borderRadius: '12px', padding: '5px', flex: '0 0 110px' }}>
                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ flex: 1, border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>-</button>
                        <span style={{ fontWeight: 800, fontSize: '1.2rem', width: '30px', textAlign: 'center' }}>{quantity}</span>
                        <button onClick={() => setQuantity(quantity + 1)} style={{ flex: 1, border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>+</button>
                    </div>
                    <button onClick={() => setIsCustomMode(!isCustomMode)} style={{ width: '55px', borderRadius: '12px', border: `1px solid ${isCustomMode ? grenaColor : borderLight}`, background: isCustomMode ? '#fff1f2' : '#fff', color: isCustomMode ? grenaColor : luxuryBlack, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{isCustomMode ? <IconClose /> : <IconPen />}</button>
                    <button onClick={handleAddItem} disabled={!isCustomMode && !selectedProductId} style={{ flex: 1, background: (!isCustomMode && !selectedProductId) ? '#f5f5f5' : luxuryBlack, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', textTransform: 'uppercase' }}>{isCustomMode ? 'Lançar' : 'Lançar Item'}</button>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'comanda' && !isPaymentStep && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fafafa' }}>
            <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {items.length === 0 ? <p style={{ textAlign: 'center', color: textMuted, marginTop: '40px' }}>Nenhum item.</p> : (
                <div style={{ background: '#fff', borderRadius: '16px', border: `1px solid ${borderLight}`, overflow: 'hidden' }}>
                  {items.map(item => (
                    <div key={item.id} style={{ padding: '15px 20px', borderBottom: `1px solid ${borderLight}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}><span style={{ background: '#f0f0f0', padding: '4px 8px', borderRadius: '6px', fontWeight: 800, fontSize: '0.8rem' }}>{item.quantity}x</span><span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.product_name_snapshot}</span></div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}><span style={{ fontWeight: 700 }}>R$ {(item.product_price_snapshot * item.quantity).toFixed(2)}</span>{userRole === 'admin' && <button onClick={() => handleRemoveItem(item.id)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}><IconTrash /></button>}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ padding: '25px', background: '#fff', borderTop: `1px solid ${borderLight}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '1.2rem', fontWeight: 700 }}><span>Total</span><span>R$ {itemsTotal.toFixed(2)}</span></div>
              {paidAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', marginBottom: '15px', fontWeight: 600 }}><span>Já Pago</span><span>- R$ {paidAmount.toFixed(2)}</span></div>}
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button onClick={handlePrintBluetooth} style={{ width: '55px', height: '55px', borderRadius: '12px', border: `1px solid ${borderLight}`, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Imprimir Bluetooth"><IconPrint /></button>
                <button onClick={() => setIsPaymentStep(true)} disabled={items.length === 0 && remainingBalance <= 0} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>Receber Pagamento</button>
              </div>
            </div>
          </div>
        )}

        {isPaymentStep && (
            <div className="slide-up" style={{ flex: 1, padding: '30px 20px', textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '1.2rem', color: luxuryBlack, fontWeight: 600 }}>Qual o valor recebido?</h3>
                <input type="number" value={amountToPay} onChange={(e) => setAmountToPay(e.target.value)} style={{ width: '100%', padding: '20px', fontSize: '2.5rem', fontWeight: 700, textAlign: 'center', color: '#166534', border: `2px solid #166534`, borderRadius: '12px', marginBottom: '30px', outline: 'none', background: 'white' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <button onClick={() => processPayment('pix', null)} style={{ padding: '20px', borderRadius: '12px', border: 'none', background: '#06b6d4', color: '#fff', fontWeight: 700 }}>PIX</button>
                    <button onClick={() => processPayment('dinheiro', null)} style={{ padding: '20px', borderRadius: '12px', border: 'none', background: '#22c55e', color: '#fff', fontWeight: 700 }}>DINHEIRO</button>
                    <button onClick={() => processPayment('cartao', null)} style={{ padding: '20px', borderRadius: '12px', border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 700, gridColumn: 'span 2' }}>CARTÃO</button>
                </div>
                <button onClick={() => setIsPaymentStep(false)} style={{ marginTop: '40px', background: 'none', border: 'none', color: textMuted, cursor: 'pointer', textDecoration: 'underline' }}>Voltar para Comanda</button>
            </div>
        )}
      </div>
    </div>
  )
}

