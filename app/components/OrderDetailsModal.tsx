'use client'
import { useEffect, useState, useRef, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { colors } from '../styles/theme'

// --- ÍCONES SVG ---
const IconPen = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
const IconClose = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
const IconPrint = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
const IconTrash = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
const IconUser = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
const IconCalendar = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
const IconCheck = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>

// --- TIPOS ---
type Product = { id: string, name: string, price: number, category: string, org_id: string, active: boolean, description?: string }
type Category = { id: string, name: string, color: string }
type OrderItem = { id: string, product_name_snapshot: string, product_price_snapshot: number, quantity: number, org_id: string }
type Client = { id: string, name: string }

interface Props {
  orderId: string
  label: string
  total?: number
  onPayment?: (orderId: string, amount: number, method: string, clientId?: string | null) => Promise<void>
  onClose: () => void
  onUpdate: () => void
  userRole: string | null 
}

export function OrderDetailsModal({ orderId, label, total, onPayment, onClose, onUpdate, userRole }: Props) {
  const [items, setItems] = useState<OrderItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([]) 
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [isPaymentStep, setIsPaymentStep] = useState(false)
  const [showClientSelector, setShowClientSelector] = useState(false)
  const [myOrgId, setMyOrgId] = useState<string | null>(null)
  
  // Informações Extras (Taxa de Entrega e Nome do Restaurante)
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [deliveryInfo, setDeliveryInfo] = useState<any>(null)
  const [restaurantName, setRestaurantName] = useState('Meu Restaurante')
  
  // Custom Mode
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customPrice, setCustomPrice] = useState('')
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('TODAS')
  const [selectedProductId, setSelectedProductId] = useState('') 
  const [quantity, setQuantity] = useState(1)
  
  // Pagamento / Datas
  const [paidAmount, setPaidAmount] = useState(0)
  const [amountToPay, setAmountToPay] = useState('') 
  const [step, setStep] = useState<'order' | 'date_edit'>('order')
  const [newDateValue, setNewDateValue] = useState('')
  const [orderDate, setOrderDate] = useState<string>('')

  const categoriesRef = useRef<HTMLDivElement>(null)
  const grenaColor = '#800020'
  const orangeTheme = '#f97316'

  useEffect(() => { loadData() }, [orderId])
  
  // Scroll horizontal categorias
  useEffect(() => {
    const el = categoriesRef.current
    if (el) {
      const onWheel = (e: WheelEvent) => { if (e.deltaY === 0) return; e.preventDefault(); el.scrollLeft += e.deltaY }
      // @ts-ignore
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
        const [itemsRes, prodRes, catRes, clientRes, payRes, orderRes, configRes] = await Promise.all([
          supabase.from('order_items').select('*').eq('order_id', orderId).order('created_at', { ascending: true }),
          supabase.from('products').select('*').eq('org_id', profile.org_id).eq('active', true).order('name'),
          supabase.from('categories').select('*').eq('org_id', profile.org_id).order('name'),
          supabase.from('clients').select('id, name').eq('org_id', profile.org_id).order('name'),
          supabase.from('payments').select('amount').eq('order_id', orderId),
          supabase.from('orders').select('created_at, delivery_info').eq('id', orderId).single(),
          supabase.from('menu_config').select('restaurant_name').eq('org_id', profile.org_id).single()
        ])
        if (itemsRes.data) setItems(itemsRes.data)
        if (prodRes.data) setProducts(prodRes.data)
        if (catRes.data) setCategories(catRes.data)
        if (clientRes.data) setClients(clientRes.data)
        
        if (orderRes.data) {
          setOrderDate(orderRes.data.created_at)
          setDeliveryInfo(orderRes.data.delivery_info)
          if (orderRes.data.delivery_info?.delivery_fee) {
            setDeliveryFee(Number(orderRes.data.delivery_info.delivery_fee))
          }
        }

        if (configRes.data?.restaurant_name) {
          setRestaurantName(configRes.data.restaurant_name)
        }
        
        const totalAlreadyPaid = payRes.data?.reduce((acc, curr) => acc + curr.amount, 0) || 0
        setPaidAmount(totalAlreadyPaid)
      }
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  // --- CÁLCULOS TOTAIS ---
  const itemsTotal = items.reduce((acc, item) => acc + (item.product_price_snapshot * item.quantity), 0)
  const localTotal = itemsTotal + deliveryFee 
  const remainingBalance = Math.max(0, localTotal - paidAmount)

  useEffect(() => {
    if (isPaymentStep) setAmountToPay(remainingBalance.toFixed(2))
  }, [isPaymentStep, remainingBalance])

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'TODAS' || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(clientSearch.toLowerCase())
  )
  
  const getCategoryColor = (catName: string) => { const found = categories.find(c => c.name === catName); return found ? found.color : '#94a3b8' }

  // --- AÇÕES DE ITENS COM ATUALIZAÇÃO NO DASHBOARD ---
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
    
    if (error) { 
        alert(`Erro: ${error.message}`) 
    } else { 
        // Atualiza o total da mesa no banco de dados
        const itemTotal = payload.product_price_snapshot * payload.quantity;
        await supabase.from('orders').update({ total: localTotal + itemTotal }).eq('id', orderId);
        
        setQuantity(1); setCustomName(''); setCustomPrice(''); await loadData(); onUpdate() 
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (userRole !== 'admin') { alert('🔒 Acesso Negado: Apenas gerentes podem remover itens.'); return }
    if (!confirm('Remover item?')) return;
    
    // Identifica o item antes de deletar
    const itemToRemove = items.find(i => i.id === itemId);
    
    const { error } = await supabase.from('order_items').delete().eq('id', itemId); 
    
    if (!error) { 
        // Subtrai o valor da mesa no banco de dados
        if (itemToRemove) {
            const itemTotal = itemToRemove.product_price_snapshot * itemToRemove.quantity;
            await supabase.from('orders').update({ total: localTotal - itemTotal }).eq('id', orderId);
        }
        await loadData(); onUpdate() 
    }
  }

  const handleClearOrder = async () => {
    if (items.length === 0) return
    if (userRole !== 'admin') { alert('🔒 Acesso Negado: Apenas gerentes podem zerar mesas.'); return }
    if (!confirm('⚠️ ZERAR COMANDA? Isso apagará TODOS os itens e pagamentos.')) return;
    
    await supabase.from('payments').delete().eq('order_id', orderId);
    await supabase.from('order_items').delete().eq('order_id', orderId); 
    
    // Zera os itens da mesa no banco, deixando apenas a taxa de entrega (se for delivery)
    await supabase.from('orders').update({ total: deliveryFee }).eq('id', orderId);
    
    await loadData(); onUpdate();
  }

  // --- PAGAMENTO E FIADO ---
  const handlePaymentSelection = (method: string) => { 
      if (method === 'fiado') { 
          setShowClientSelector(true) 
      } else { 
          processPayment(method, null) 
      } 
  }

  const processPayment = async (method: string, clientId: string | null) => {
    const valToPay = parseFloat(amountToPay.replace(',', '.'))
    if (isNaN(valToPay) || valToPay <= 0) return alert("Valor inválido")
    if (valToPay > (remainingBalance + 0.10)) return alert("Valor maior que o restante!")

    if (onPayment) {
        await onPayment(orderId, valToPay, method, clientId)
        if (valToPay >= (remainingBalance - 0.05)) onClose()
        else { await loadData(); onUpdate() }
        return
    }

    if (method !== 'fiado') {
        await supabase.from('payments').insert([{ org_id: myOrgId, order_id: orderId, amount: valToPay, method: method }])
        
        if (valToPay >= (remainingBalance - 0.05)) {
            await supabase.from('orders').update({ status: 'concluida', payment_method: method, total: localTotal }).eq('id', orderId)
            onUpdate(); onClose()
        } else {
            alert(`Parcial de R$ ${valToPay.toFixed(2)} recebido!`)
            await loadData(); onUpdate()
        }
    } 
    else if (method === 'fiado' && clientId) {
        const clientName = clients.find(c => c.id === clientId)?.name
        const entrada = paidAmount
        const dividaRestante = remainingBalance

        if(!confirm(`Confirmar FIADO para ${clientName}?\n\nTotal: R$ ${localTotal.toFixed(2)}\nEntrada (Já paga): R$ ${entrada.toFixed(2)}\nFica devendo: R$ ${dividaRestante.toFixed(2)}`)) return

        await supabase.from('orders').update({ 
            status: 'concluida', 
            payment_method: 'fiado', 
            total: localTotal,
            client_id: clientId 
        }).eq('id', orderId)

        if (entrada > 0) {
            await supabase.from('debt_payments').insert([{
                client_id: clientId,
                amount: entrada,
                org_id: myOrgId,
                notes: 'Entrada no ato da venda'
            }])
        }
        onUpdate(); onClose()
    }
  }

  // --- DATA ---
  const handleOpenDateEdit = () => {
      const dateObj = orderDate ? new Date(orderDate) : new Date()
      const offset = dateObj.getTimezoneOffset() * 60000
      const localISOTime = (new Date(dateObj.getTime() - offset)).toISOString().slice(0, 16)
      setNewDateValue(localISOTime)
      setStep('date_edit')
  }

  const handleSaveDate = async () => {
      if (!newDateValue) return
      const isoDate = new Date(newDateValue).toISOString()
      const { error } = await supabase.from('orders').update({ created_at: isoDate }).eq('id', orderId)
      if (error) alert('Erro: ' + error.message)
      else { await loadData(); onUpdate(); setStep('order') }
  }

// --- IMPRESSÃO 58MM (32 COLUNAS COMPLETA) ---
  const handlePrint = () => {
    const formatLine = (left: string, right: string) => {
      const spaces = 32 - left.length - right.length;
      return left + " ".repeat(spaces > 0 ? spaces : 1) + right;
    };
    const centerText = (text: string) => {
      if (text.length >= 32) return text.substring(0, 32);
      const padding = Math.floor((32 - text.length) / 2);
      return " ".repeat(padding) + text;
    };
    const wrapText = (text: string, maxLength: number) => {
      const words = text.split(' ');
      let lines: string[] = [];
      let currentLine = '';
      words.forEach(word => {
        if ((currentLine + word).length > maxLength) {
          lines.push(currentLine.trim());
          currentLine = word + ' ';
        } else {
          currentLine += word + ' ';
        }
      });
      if (currentLine) lines.push(currentLine.trim());
      return lines;
    };
    
    const separator = "-".repeat(32);

    let receipt = "";
    receipt += centerText(restaurantName.toUpperCase()) + "\n";
    receipt += centerText("COMPROVANTE DE PEDIDO") + "\n";
    receipt += separator + "\n";
    
    receipt += `PEDIDO/MESA: ${label.toUpperCase()}\n`;
    if (deliveryInfo?.customer_name) {
      receipt += `CLIENTE: ${deliveryInfo.customer_name}\n`;
    }
    
    if (deliveryInfo?.modality === 'entrega' && deliveryInfo?.address) {
      const address = `END: ${deliveryInfo.address}${deliveryInfo.neighborhood ? ', ' + deliveryInfo.neighborhood : ''}`;
      const addressLines = wrapText(address, 32);
      addressLines.forEach(line => receipt += line + "\n");
      
      if (deliveryInfo?.reference) {
        const refLines = wrapText(`REF: ${deliveryInfo.reference}`, 32);
        refLines.forEach(line => receipt += line + "\n");
      }
    }
    receipt += separator + "\n";
    receipt += centerText("ITENS DO PEDIDO") + "\n";
    receipt += separator + "\n";

    // NOVO LAYOUT DE PRODUTOS COM ESPAÇAMENTO (Unitário e Total)
    items.forEach(item => {
      // Linha 1: Nome do produto
      const nameLines = wrapText(item.product_name_snapshot.toUpperCase(), 32);
      nameLines.forEach(line => receipt += line + "\n");
      
      // Linha 2: Quantidade x Valor Unitário ...... Valor Total
      const unitDetails = `${item.quantity}x R$ ${item.product_price_snapshot.toFixed(2)}`;
      const totalDetails = `R$ ${(item.product_price_snapshot * item.quantity).toFixed(2)}`;
      receipt += formatLine(unitDetails, totalDetails) + "\n\n"; // \n\n cria a linha em branco separadora
    });

    receipt += separator + "\n";
    receipt += formatLine("Subtotal:", `R$ ${itemsTotal.toFixed(2)}`) + "\n";
    if (deliveryFee > 0) {
      receipt += formatLine("Taxa de Entrega:", `R$ ${deliveryFee.toFixed(2)}`) + "\n";
    }
    receipt += formatLine("TOTAL DA CONTA:", `R$ ${localTotal.toFixed(2)}`) + "\n";
    
    if (paidAmount > 0) {
      receipt += formatLine("VALOR PAGO:", `R$ ${paidAmount.toFixed(2)}`) + "\n";
      receipt += formatLine("RESTANTE:", `R$ ${remainingBalance.toFixed(2)}`) + "\n";
    }
    
    if (deliveryInfo?.change) {
      receipt += separator + "\n";
      receipt += formatLine("LEVAR TROCO PARA:", `R$ ${Number(deliveryInfo.change).toFixed(2)}`) + "\n";
    }

    receipt += separator + "\n";
    receipt += centerText("Obrigado pela preferencia!") + "\n";
    receipt += centerText("Volte sempre!") + "\n\n\n\n";

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Imprimir Comanda</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
              @page { margin: 0; size: 58mm auto; }
              body { 
                font-family: 'Courier New', Courier, 'Roboto Mono', 'Liberation Mono', monospace; 
                width: 58mm; margin: 0; padding: 10px; font-size: 12px; color: #000;
              }
              pre { white-space: pre-wrap; word-break: break-word; margin: 0; font-weight: bold; }
            </style>
          </head>
          <body>
            <pre>${receipt}</pre>
            <script>
              // O Atraso Mágico que impede o PDF branco no PC
              setTimeout(function() {
                window.print();
              }, 500);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }

  const touchBtnBase = { cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, borderRadius: '12px', border: 'none', transition: 'transform 0.1s', minHeight: '52px', fontSize: '1rem' }
  const qtyBtnStyle = { ...touchBtnBase, background: '#f1f5f9', color: colors.primary, fontSize: '1.8rem', flex: 1 }
  const btnPayStyle = (bg: string) => ({ ...touchBtnBase, backgroundColor: bg, color: 'white', flexDirection: 'column' as 'column', gap: '4px', padding: '10px' })

  return (
    <>
      <style jsx global>{`
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        input:focus { outline: 2px solid ${colors.primary}; }
        .slide-up { animation: slideUp 0.3s ease-out; }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', backdropFilter: 'blur(3px)' }}>
        <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '600px', height: '100%', maxHeight: '95vh', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
          
          {/* HEADER */}
          <div style={{ padding: '15px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', flexShrink: 0 }}>
            <div><h2 style={{ margin: 0, fontSize: '1.4rem', color: colors.primary, fontWeight: 900, textTransform: 'capitalize' }}>{label}</h2><span style={{ fontSize: '0.9rem', color: colors.textMuted }}>{items.length} itens lançados</span></div>
            <button onClick={onClose} style={{ border: 'none', background: '#f1f5f9', width: '42px', height: '42px', borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          </div>

          {/* --- TELA DE SELEÇÃO DE CLIENTE (UI NOVA) --- */}
          {showClientSelector ? (
            <div className="slide-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
                <div style={{ padding: '20px 20px 10px 20px', borderBottom: '1px solid #f1f5f9' }}>
                    <h3 style={{ margin: '0 0 15px', color: colors.text, fontSize: '1.2rem' }}>Selecionar Cliente</h3>
                    <input 
                        autoFocus
                        placeholder="Buscar cliente..." 
                        value={clientSearch}
                        onChange={e => setClientSearch(e.target.value)}
                        style={{ width: '100%', padding: '12px 15px', borderRadius: '10px', border: `2px solid ${colors.border}`, fontSize: '1rem', outline: 'none' }}
                    />
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredClients.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Nenhum cliente encontrado.</div>
                    ) : (
                        filteredClients.map(client => (
                            <button key={client.id} onClick={() => processPayment('fiado', client.id)} style={{ padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textMuted, fontWeight: 'bold' }}>{client.name.charAt(0).toUpperCase()}</div>
                                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: colors.text }}>{client.name}</span>
                            </button>
                        ))
                    )}
                </div>
                <div style={{ padding: '20px', borderTop: '1px solid #f1f5f9' }}>
                    <button onClick={() => setShowClientSelector(false)} style={{ ...touchBtnBase, width: '100%', background: '#f1f5f9', color: colors.text }}>Cancelar</button>
                </div>
            </div>

          /* --- TELA: EDITAR DATA --- */
          ) : step === 'date_edit' ? (
            <div style={{ flex: 1, padding: '30px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#fff' }}>
                <h3 style={{ textAlign: 'center', color: colors.primary, marginBottom: '20px' }}>Alterar Data de Entrada</h3>
                <input type="datetime-local" value={newDateValue} onChange={e => setNewDateValue(e.target.value)} style={{ padding: '15px', borderRadius: '12px', border: `2px solid ${colors.border}`, fontSize: '1.2rem', marginBottom: '30px' }} />
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setStep('order')} style={{ ...touchBtnBase, flex: 1, background: '#f1f5f9', color: colors.text }}>Cancelar</button>
                    <button onClick={handleSaveDate} style={{ ...touchBtnBase, flex: 1, background: colors.primary, color: 'white' }}>Salvar</button>
                </div>
            </div>

          /* --- TELA: PAGAMENTO --- */
          ) : isPaymentStep ? (
            <div className="no-scrollbar slide-up" style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#fafafa', overflowY: 'auto' }}>
              <div style={{ width: '100%', marginBottom: '20px', background: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: colors.textMuted }}><span>Subtotal (Itens):</span><strong>R$ {itemsTotal.toFixed(2)}</strong></div>
                  
                  {deliveryFee > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#f97316' }}><span>Taxa de Entrega:</span><strong>+ R$ {deliveryFee.toFixed(2)}</strong></div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#16a34a' }}><span>Já Pago (Entradas):</span><strong>- R$ {paidAmount.toFixed(2)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #ccc', paddingTop: '10px', fontSize: '1.2rem', fontWeight: 800, color: colors.primary }}><span>FALTA PAGAR:</span><span>R$ {remainingBalance.toFixed(2)}</span></div>
              </div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: colors.textMuted, marginBottom: '5px' }}>VALOR A RECEBER AGORA</label>
              <input type="number" value={amountToPay} onChange={(e) => setAmountToPay(e.target.value)} style={{ width: '100%', padding: '15px', fontSize: '2rem', fontWeight: 900, textAlign: 'center', color: '#166534', border: `2px solid #166534`, borderRadius: '12px', marginBottom: '25px', outline: 'none' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%', marginBottom: '20px' }}>
                <button onClick={() => handlePaymentSelection('pix')} style={btnPayStyle('#06b6d4')}>💠 PIX</button>
                <button onClick={() => handlePaymentSelection('dinheiro')} style={btnPayStyle('#22c55e')}>💵 DINHEIRO</button>
                <button onClick={() => handlePaymentSelection('cartao_debito')} style={btnPayStyle('#3b82f6')}>💳 DÉBITO</button>
                <button onClick={() => handlePaymentSelection('cartao_credito')} style={btnPayStyle('#1d4ed8')}>💳 CRÉDITO</button>
                
                {/* BOTÃO FIADO DESTACADO */}
                <button onClick={() => handlePaymentSelection('fiado')} style={{ ...btnPayStyle(orangeTheme), gridColumn: 'span 2', background: 'white', border: `2px solid ${orangeTheme}`, color: orangeTheme }}>
                    📝 COLOCAR RESTANTE NO FIADO
                </button>
              </div>
              <button onClick={() => setIsPaymentStep(false)} style={{ ...touchBtnBase, width: '100%', background: 'white', border: '2px solid #ddd', color: colors.text }}>Voltar</button>
            </div>
          ) : (
            <>
              {/* TELA PRINCIPAL (LISTA DE ITENS) */}
              <div className="no-scrollbar" style={{ flexShrink: 0, maxHeight: '140px', overflowY: 'auto', backgroundColor: '#f8fafc', borderBottom: `1px solid ${colors.border}` }}>
                {items.length === 0 ? (
                  <div style={{ padding: '15px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>Nenhum item lançado.</div>
                ) : (
                  items.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px', background: 'white', borderBottom: '1px solid #eee' }}>
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

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'white', minHeight: 0 }}>
                {/* BUSCA */}
                <div style={{ padding: '15px 15px 5px 15px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      {isCustomMode ? (
                          <div style={{ flex: 1, padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff7ed', borderRadius: '12px', color: orangeTheme, fontWeight: 'bold', border: `2px dashed ${orangeTheme}`, fontSize: '0.9rem' }}>✍️ Modo Item Avulso</div>
                      ) : (
                          <div style={{ position: 'relative', width: '100%' }}>
                              <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                              <input placeholder="Buscar produto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '0 15px 0 40px', height: '45px', borderRadius: '12px', border: `2px solid ${colors.border}`, fontSize: '1rem', outline: 'none', background: '#f8fafc' }} />
                          </div>
                      )}
                      <button onClick={handleOpenDateEdit} style={{ marginLeft: '10px', background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted }} title="Mudar Data"><IconCalendar /></button>
                  </div>
                  {!isCustomMode && (
                      <div ref={categoriesRef} className="no-scrollbar" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' }}>
                        <button onClick={() => setSelectedCategory('TODAS')} style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, background: selectedCategory === 'TODAS' ? colors.text : '#f1f5f9', color: selectedCategory === 'TODAS' ? 'white' : colors.textMuted, whiteSpace: 'nowrap' }}>TODAS</button>
                        {categories.map(cat => (
                          <button key={cat.id} onClick={() => setSelectedCategory(cat.name)} style={{ padding: '6px 12px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, background: selectedCategory === cat.name ? cat.color : '#f1f5f9', color: selectedCategory === cat.name ? 'white' : colors.textMuted, whiteSpace: 'nowrap' }}>{cat.name}</button>
                        ))}
                      </div>
                  )}
                </div>

                {/* LISTA PRODUTOS */}
                <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 15px 15px 15px', display: 'flex', flexDirection: 'column' }}>
                  {isCustomMode ? (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px', padding: '0 10px' }}>
                          <div><label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, color: colors.textMuted, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>Nome do Item</label><input autoFocus value={customName} onChange={e => setCustomName(e.target.value)} style={{ width: '100%', height: '50px', padding: '0 15px', borderRadius: '12px', border: `2px solid ${colors.border}`, fontSize: '1.2rem', textAlign: 'center' }} /></div>
                          <div><label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, color: colors.textMuted, fontSize: '0.75rem', textTransform: 'uppercase', textAlign: 'center' }}>Preço (R$)</label><input type="number" placeholder="0.00" value={customPrice} onChange={e => setCustomPrice(e.target.value)} style={{ width: '100%', height: '55px', padding: '0 15px', borderRadius: '12px', border: `2px solid ${colors.border}`, fontSize: '1.8rem', fontWeight: '900', textAlign: 'center', color: colors.primary }} /></div>
                      </div>
                  ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '10px' }}>
                        {filteredProducts.map(p => {
                            const isSelected = selectedProductId === p.id
                            return (
                            <div key={p.id} onClick={() => setSelectedProductId(p.id)} style={{ border: isSelected ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`, backgroundColor: isSelected ? '#eff6ff' : 'white', borderRadius: '12px', padding: '10px 15px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '55px' }}>
                                <div><div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.name}</div><span style={{ fontSize: '0.7rem', color: 'white', background: getCategoryColor(p.category), padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>{p.category.slice(0, 15)}</span></div>
                                <div style={{ fontWeight: 800, color: colors.primary, fontSize: '1.1rem', whiteSpace: 'nowrap' }}>R$ {p.price.toFixed(2)}</div>
                            </div>
                            )
                        })}
                        {filteredProducts.length === 0 && <div style={{ textAlign: 'center', padding: '20px', color: colors.textMuted, opacity: 0.7, fontSize: '0.9rem' }}>Nenhum produto encontrado.</div>}
                      </div>
                  )}
                </div>

                {/* RODAPÉ */}
                <div style={{ padding: '15px', background: 'white', borderTop: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 -4px 10px rgba(0,0,0,0.05)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', gap: '10px', height: '50px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f1f5f9', borderRadius: '12px', padding: '4px', flex: '0 0 110px' }}>
                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{...qtyBtnStyle}}>-</button>
                        <span style={{ fontWeight: 900, fontSize: '1.3rem', width: '30px', textAlign: 'center' }}>{quantity}</span>
                        <button onClick={() => setQuantity(quantity + 1)} style={{...qtyBtnStyle}}>+</button>
                      </div>
                      <button onClick={() => setIsCustomMode(!isCustomMode)} style={{ ...touchBtnBase, width: '55px', border: `2px solid ${isCustomMode ? orangeTheme : '#ccc'}`, background: isCustomMode ? '#fff7ed' : 'white', color: isCustomMode ? orangeTheme : colors.text }}>{isCustomMode ? <IconClose /> : <IconPen />}</button>
                      <button onClick={handleAddItem} disabled={!isCustomMode && !selectedProductId} style={{ ...touchBtnBase, flex: 1, backgroundColor: (!isCustomMode && !selectedProductId) ? '#e2e8f0' : colors.primary, color: (!isCustomMode && !selectedProductId) ? '#94a3b8' : 'white', fontSize: '1rem', textTransform: 'uppercase' }}>{isCustomMode ? 'Lançar' : 'Adicionar'}</button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px dashed #eee' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase' }}>RESTANTE</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: colors.primary, lineHeight: 1 }}>R$ {remainingBalance.toFixed(2)}</div>
                            {items.length > 0 && userRole === 'admin' && (<button onClick={handleClearOrder} style={{ border: 'none', background: '#fee2e2', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}><IconTrash /></button>)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={handlePrint} className="btn-grena-interactive" style={{ ...touchBtnBase, width: '55px' }} title="Imprimir Comanda"><IconPrint /></button>
                        <button onClick={() => setIsPaymentStep(true)} disabled={items.length === 0 && remainingBalance <= 0} style={{ ...touchBtnBase, padding: '0 20px', background: items.length > 0 || remainingBalance > 0 ? '#16a34a' : '#cbd5e1', color: 'white' }}>FECHAR ($)</button>
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