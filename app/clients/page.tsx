'use client'
import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { colors, globalStyles } from '../styles/theme'
import { Header } from '../components/Header'

// --- ÍCONES ---
const IconEdit = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
const IconPrint = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
const IconTrash = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
const IconWhatsapp = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>

// --- TIPOS ---
type Client = {
  id: string, name: string, phone: string, org_id: string
  total_fiado: number, total_paid: number, balance: number       
}

type HistoryItem = {
  type: 'order' | 'payment', id: string, date: string, amount: number, description: string, details?: any[] 
}

export default function ClientsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [totalReceivables, setTotalReceivables] = useState(0)
  const [myOrgId, setMyOrgId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState('Meu Restaurante') // Nome para o cabeçalho do Extrato

  const [showClientModal, setShowClientModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [showPayModal, setShowPayModal] = useState<Client | null>(null)
  const [showStatementModal, setShowStatementModal] = useState<Client | null>(null)

  const [statementHistory, setStatementHistory] = useState<HistoryItem[]>([])
  const [statementLoading, setStatementLoading] = useState(false)

  // Estados dos Formulários
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('pix')

  const grenaColor = '#800020' 
  const orangeTheme = '#f97316'
  
  const touchBtnStyle = {
    padding: '12px 10px', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem',
    cursor: 'pointer', border: 'none', minHeight: '48px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: '6px', transition: 'all 0.1s'
  }

  const methodBtnStyle = (isActive: boolean, color: string) => ({
    flex: 1, padding: '10px', borderRadius: '8px',
    border: isActive ? `2px solid ${color}` : '1px solid #e2e8f0',
    backgroundColor: isActive ? color : 'white',
    color: isActive ? 'white' : '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s'
  })

  useEffect(() => { initFetch() }, [])

  const initFetch = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('id', session.user.id).single()
    if (profile?.org_id) {
      setMyOrgId(profile.org_id)
      setUserRole(profile.role)
      
      const { data: config } = await supabase.from('menu_config').select('restaurant_name').eq('org_id', profile.org_id).single()
      if (config?.restaurant_name) setRestaurantName(config.restaurant_name)

      await fetchClients(profile.org_id)
    }
    setLoading(false)
  }

  const fetchClients = async (orgId: string) => {
    const { data: clientsData } = await supabase.from('clients').select('*').eq('org_id', orgId).order('name')
    if (!clientsData) return
    const { data: ordersData } = await supabase.from('orders').select('client_id, total').eq('org_id', orgId).eq('payment_method', 'fiado').eq('status', 'concluida').not('client_id', 'is', null)
    const { data: paymentsData } = await supabase.from('debt_payments').select('client_id, amount').eq('org_id', orgId)

    const processed = clientsData.map(c => {
      const debt = ordersData?.filter(o => o.client_id === c.id).reduce((sum, o) => sum + o.total, 0) || 0
      const paid = paymentsData?.filter(p => p.client_id === c.id).reduce((sum, p) => sum + p.amount, 0) || 0
      return { ...c, total_fiado: debt, total_paid: paid, balance: parseFloat((debt - paid).toFixed(2)) }
    })
    setTotalReceivables(processed.reduce((acc, curr) => acc + (curr.balance > 0 ? curr.balance : 0), 0))
    setClients(processed.sort((a, b) => b.balance - a.balance))
  }

  const openClientModal = (client?: Client) => {
    setEditingClient(client || null); setFormName(client?.name || ''); setFormPhone(client?.phone || ''); setShowClientModal(true)
  }

  const handleSaveClient = async (e: FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !myOrgId) return
    if (editingClient) await supabase.from('clients').update({ name: formName.trim(), phone: formPhone }).eq('id', editingClient.id)
    else await supabase.from('clients').insert([{ name: formName.trim(), phone: formPhone, org_id: myOrgId }])
    setShowClientModal(false); fetchClients(myOrgId)
  }

  const handleDeleteClientWithHistory = async (client: Client) => {
    if (!confirm(`⚠️ ATENÇÃO!\n\nIsso vai apagar TODO o histórico de "${client.name}" (compras e pagamentos) e depois excluir o cliente.\n\nEsta ação é IRREVERSÍVEL. Confirma?`)) return

    await supabase.from('debt_payments').delete().eq('client_id', client.id)

    const { data: clientOrders } = await supabase.from('orders').select('id').eq('client_id', client.id)

    if (clientOrders && clientOrders.length > 0) {
      const orderIds = clientOrders.map(o => o.id)
      await supabase.from('order_items').delete().in('order_id', orderIds)
      await supabase.from('orders').delete().in('id', orderIds)
    }

    const { error } = await supabase.from('clients').delete().eq('id', client.id)

    if (error) alert('Erro ao excluir: ' + error.message)
    else { setShowStatementModal(null); fetchClients(myOrgId!) }
  }

  const handleShareWhatsapp = async (client: Client) => {
    const phone = client.phone?.replace(/\D/g, '')
    if (!phone || phone.length < 8) return alert('Telefone inválido para WhatsApp.')

    const { data: orders } = await supabase.from('orders')
        .select('created_at, total, order_items(quantity, product_name_snapshot)')
        .eq('client_id', client.id).eq('status', 'concluida').eq('payment_method', 'fiado')
        .order('created_at', { ascending: true })

    let msg = `Olá *${client.name}*! 👋\nSeguem os detalhes da sua conta:\n`
    orders?.forEach(o => {
        const date = new Date(o.created_at).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})
        const items = o.order_items.map((i: any) => `${i.quantity}x ${i.product_name_snapshot}`).join(', ')
        msg += `\n📅 *${date}* \n${items}\n💲 R$ ${o.total.toFixed(2)}\n`
    })
    msg += `\n*TOTAL A PAGAR: R$ ${client.balance.toFixed(2)}* 💰`
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  // --- PAGAMENTOS ---
  const openPayModal = (client: Client) => {
      setShowPayModal(client)
      setPayAmount(client.balance.toFixed(2)) 
      setPayMethod('pix')
  }

  const handleConfirmPayment = async (e: FormEvent) => {
    e.preventDefault()
    if (!showPayModal || !payAmount || !myOrgId) return
    const amount = parseFloat(payAmount.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) return alert('Valor inválido')
    
    const noteText = `Pagamento via ${payMethod.toUpperCase()}`

    const { error } = await supabase.from('debt_payments').insert([{ 
        client_id: showPayModal.id, amount: amount, org_id: myOrgId, notes: noteText 
    }])

    if (!error) { 
        setShowPayModal(null); setPayAmount(''); 
        if (showStatementModal) handleOpenStatement(showPayModal)
        setTimeout(() => fetchClients(myOrgId!), 100) 
    } else { alert('Erro: ' + error.message) }
  }

  const handleOpenStatement = async (client: Client) => {
      setShowStatementModal(client); setStatementLoading(true)
      // Atualizado: Agora busca o preço unitário (product_price_snapshot) também
      const { data: orders } = await supabase.from('orders').select('id, created_at, total, order_items(quantity, product_name_snapshot, product_price_snapshot)').eq('client_id', client.id).eq('status', 'concluida').eq('payment_method', 'fiado').order('created_at', { ascending: false })
      const { data: payments } = await supabase.from('debt_payments').select('id, created_at, amount, notes').eq('client_id', client.id).order('created_at', { ascending: false })
      
      const history: HistoryItem[] = []
      orders?.forEach((o: any) => history.push({ type: 'order', id: o.id, date: o.created_at, amount: o.total, description: o.order_items.map((i:any)=>`${i.quantity}x ${i.product_name_snapshot}`).join(', '), details: o.order_items }))
      payments?.forEach((p: any) => history.push({ type: 'payment', id: p.id, date: p.created_at, amount: p.amount, description: p.notes || 'Pagamento' }))
      setStatementHistory(history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
      setStatementLoading(false)
    }

// --- IMPRESSÃO 58MM DO EXTRATO ---
  const handlePrintStatement = () => {
    if (!showStatementModal) return;

    // Reduzido para 30 colunas para não cortar nas beiradas da impressora
    const COLS = 30;

    const formatLine = (left: string, right: string) => {
      const spaces = COLS - left.length - right.length;
      return left + " ".repeat(spaces > 0 ? spaces : 1) + right;
    };
    const centerText = (text: string) => {
      if (text.length >= COLS) return text.substring(0, COLS);
      const padding = Math.floor((COLS - text.length) / 2);
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

    const separator = "-".repeat(COLS);

    let receipt = "";
    receipt += centerText(restaurantName.toUpperCase()) + "\n";
    receipt += centerText("EXTRATO DE CONSUMO") + "\n";
    receipt += separator + "\n";

    receipt += `CLIENTE: ${showStatementModal.name}\n`;
    receipt += `DATA EMISSAO: ${new Date().toLocaleDateString('pt-BR')}\n`;
    receipt += separator + "\n";
    receipt += centerText("HISTORICO RECENTE") + "\n\n";

    statementHistory.forEach(h => {
      const isOrder = h.type === 'order';
      const dateStr = new Date(h.date).toLocaleDateString('pt-BR');
      const typeStr = isOrder ? "COMPRA" : "PAGTO";
      
      receipt += formatLine(dateStr, typeStr) + "\n";

      if (isOrder && h.details && h.details.length > 0) {
          h.details.forEach((item: any) => {
              const nameLines = wrapText(`- ${item.product_name_snapshot.toUpperCase()}`, COLS);
              nameLines.forEach(line => receipt += line + "\n");
              
              const price = item.product_price_snapshot || 0;
              if (price > 0) {
                  const unitDetails = `  ${item.quantity}x R$ ${price.toFixed(2)}`;
                  const totalDetails = `R$ ${(price * item.quantity).toFixed(2)}`;
                  receipt += formatLine(unitDetails, totalDetails) + "\n";
              }
          });
      } else {
          const descLines = wrapText(h.description || (isOrder ? "Consumo" : "Abatimento"), COLS);
          descLines.forEach(line => receipt += line + "\n");
      }

      const amountStr = (isOrder ? "+" : "-") + ` R$ ${h.amount.toFixed(2)}`;
      // Abreviei TOTAL DO PEDIDO para TOTAL PEDIDO para caber melhor nos 30 caracteres
      receipt += formatLine(isOrder ? "TOTAL PEDIDO:" : "", amountStr) + "\n\n";
    });

    receipt += separator + "\n";
    
    const statusText = showStatementModal.balance > 0.01 ? "EM ABERTO" : "QUITADO";
    receipt += formatLine("SALDO ATUAL:", `R$ ${Math.abs(showStatementModal.balance).toFixed(2)}`) + "\n";
    receipt += centerText(`SITUACAO: ${statusText}`) + "\n";
    receipt += separator + "\n";
    receipt += centerText("Obrigado pela preferencia!") + "\n\n\n\n";

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Imprimir Extrato</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
              @page { margin: 0; size: 58mm auto; }
              body { 
                font-family: 'Courier New', Courier, 'Roboto Mono', 'Liberation Mono', monospace; 
                width: 58mm; 
                margin: 0; 
                padding: 0 4mm; /* Adicionado um respiro seguro nas laterais */
                font-size: 11px; /* Fonte ligeiramente reduzida */
                color: #000;
                box-sizing: border-box;
              }
              pre { white-space: pre-wrap; word-break: break-word; margin: 0; font-weight: bold; }
            </style>
          </head>
          <body>
            <pre>${receipt}</pre>
            <script>
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

  return (
    <div style={{ ...globalStyles.container, justifyContent: 'flex-start', background: '#f8fafc' }}>
      <Header userRole={userRole} subtitle="CONTROLE DE FIADO" />
      <style jsx global>{` .btn-grena-interactive { background: white; color: ${grenaColor}; border: 1px solid ${grenaColor}; transition: 0.1s; } .btn-grena-interactive:active { background: ${grenaColor}; color: white; transform: scale(0.95); } `}</style>

      <main style={{ width: '100%', maxWidth: '900px', padding: '20px', flex: 1 }}>
        <div style={{ backgroundColor: '#fff7ed', border: `2px solid ${orangeTheme}`, borderRadius: '16px', padding: '20px', marginBottom: '25px', textAlign: 'center', boxShadow: '0 4px 10px rgba(249, 115, 22, 0.15)' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#c2410c', letterSpacing: '1px' }}>TOTAL A RECEBER</span>
            <div style={{ fontSize: '2.8rem', fontWeight: 900, color: '#ea580c', lineHeight: 1, marginTop: '8px' }}>R$ {totalReceivables.toFixed(2)}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div><h2 style={{ fontSize: '1.2rem', margin: 0, color: colors.text }}>Carteira de Clientes</h2><span style={{ fontSize: '0.8rem', color: colors.textMuted }}>{clients.length} cadastrados</span></div>
          <button onClick={() => openClientModal()} style={{ ...touchBtnStyle, backgroundColor: colors.primary, color: 'white' }}>+ Novo Cliente</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {loading ? <p style={{textAlign:'center', color: '#999'}}>Carregando...</p> : clients.length === 0 ? <div style={{ padding: '40px', textAlign: 'center', color: '#999', background: 'white', borderRadius: '12px' }}>Nenhum cliente.</div> : (
            clients.map(client => (
              <div key={client.id} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div><span style={{ fontWeight: 800, fontSize: '1.2rem', color: colors.text, display: 'block' }}>{client.name}</span><span style={{ fontSize: '0.9rem', color: colors.textMuted }}>{client.phone || 'Sem telefone'}</span></div>
                        <button className="btn-grena-interactive" onClick={() => openClientModal(client)} style={{ borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Editar"><IconEdit /></button>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: colors.textMuted, fontWeight: 700 }}>{client.balance < -0.01 ? 'CRÉDITO' : 'DEVE'}</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: client.balance > 0.01 ? '#ef4444' : (client.balance < -0.01 ? '#22c55e' : colors.textMuted) }}>{client.balance < -0.01 ? '+ ' : ''} R$ {Math.abs(client.balance).toFixed(2)}</div>
                    </div>
                </div>
                
                {/* --- BOTÕES UNIFICADOS --- */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={() => handleOpenStatement(client)} style={{ ...touchBtnStyle, flex: 1, background: 'white', border: `2px solid ${colors.border}`, color: colors.text }}>📄 Extrato</button>
                    {client.balance > 0.01 && (
                        <>
                            <button onClick={() => handleShareWhatsapp(client)} style={{ ...touchBtnStyle, flex: 1, background: '#dcfce7', color: '#166534', border: '1px solid #22c55e' }}><IconWhatsapp /> Zap</button>
                            {/* BOTÃO UNIFICADO PAGAR (Quitar/Abater) */}
                            <button onClick={() => openPayModal(client)} style={{ ...touchBtnStyle, flex: 1.5, background: '#16a34a', color: 'white' }}>💵 PAGAR</button>
                        </>
                    )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* MODAL CRIAR/EDITAR */}
      {showClientModal && (<div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}><div style={{ ...globalStyles.card, padding: '30px', width: '90%', maxWidth: '380px' }}><h3 style={{marginTop:0}}>Cliente</h3><form onSubmit={handleSaveClient}><input required value={formName} onChange={e=>setFormName(e.target.value)} placeholder="Nome" style={{...globalStyles.input, width:'100%', marginBottom:'15px', padding:'15px'}}/><input value={formPhone} onChange={e=>setFormPhone(e.target.value)} placeholder="Telefone" style={{...globalStyles.input, width:'100%', marginBottom:'20px', padding:'15px'}}/><div style={{display:'flex', gap:'10px'}}><button type="button" onClick={()=>setShowClientModal(false)} style={{...touchBtnStyle, flex:1, background:'#eee'}}>Cancelar</button><button type="submit" style={{...touchBtnStyle, ...globalStyles.buttonPrimary, flex:1}}>Salvar</button></div></form></div></div>)}

      {/* MODAL PAGAMENTO */}
      {showPayModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ ...globalStyles.card, padding: '30px', width: '90%', maxWidth: '380px' }}>
            <h3 style={{ marginTop: 0, color: '#166534' }}>Receber Pagamento</h3>
            <p style={{marginBottom:'20px'}}>Cliente: <strong>{showPayModal.name}</strong></p>
            <form onSubmit={handleConfirmPayment}>
              {/* Valor pré-preenchido para facilitar quitação, mas editável */}
              <input autoFocus type="number" step="0.01" required value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{...globalStyles.input, width:'100%', marginBottom:'20px', fontSize:'2rem', textAlign:'center', color:'#166534'}} placeholder="0.00" />
              <div style={{ display: 'flex', gap: '8px', marginBottom: '25px', flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setPayMethod('pix')} style={methodBtnStyle(payMethod === 'pix', '#06b6d4')}>💠 Pix</button>
                  <button type="button" onClick={() => setPayMethod('dinheiro')} style={methodBtnStyle(payMethod === 'dinheiro', '#22c55e')}>💵 Din</button>
                  <button type="button" onClick={() => setPayMethod('cartao_debito')} style={methodBtnStyle(payMethod === 'cartao_debito', '#3b82f6')}>💳 Déb</button>
                  <button type="button" onClick={() => setPayMethod('cartao_credito')} style={methodBtnStyle(payMethod === 'cartao_credito', '#1d4ed8')}>💳 Cré</button>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}><button type="button" onClick={() => setShowPayModal(null)} style={{ ...touchBtnStyle, flex: 1, background: '#eee' }}>Cancelar</button><button type="submit" style={{ ...touchBtnStyle, backgroundColor: '#22c55e', color: 'white', flex: 1 }}>CONFIRMAR</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EXTRATO */}
      {showStatementModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '10px' }}>
          <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '550px', maxHeight: '90vh', borderRadius: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}><h3>Extrato</h3><button onClick={()=>setShowStatementModal(null)} style={{border:'none', background:'none', fontSize:'1.5rem'}}>✕</button></div>
            <div id="printable-area" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                <div style={{marginBottom:'20px', padding:'15px', background:'#fffbeb', borderRadius:'10px', border:'1px dashed #ccc'}}>
                    <div style={{display:'flex', justifyContent:'space-between'}}><span>Saldo:</span> <strong style={{color: showStatementModal.balance > 0 ? 'red' : 'green'}}>R$ {showStatementModal.balance.toFixed(2)}</strong></div>
                </div>
                {statementLoading ? <p>Carregando...</p> : statementHistory.map((h,i)=>(
                    <div key={i} style={{padding:'10px 0', borderBottom:'1px solid #eee'}}>
                        <div style={{display:'flex', justifyContent:'space-between'}}><span>{new Date(h.date).toLocaleDateString()}</span><span>{h.type==='order'?'+':'-'} R$ {h.amount.toFixed(2)}</span></div>
                        <small style={{color:'#666'}}>{h.description}</small>
                    </div>
                ))}
            </div>
            {/* RODAPÉ DO MODAL EXTRATO */}
            <div style={{padding:'15px', borderTop:'1px solid #eee', display:'flex', gap:'10px', flexWrap:'wrap'}}>
              <button onClick={handlePrintStatement} style={{...touchBtnStyle, flex:1, background:'#fff', border:'1px solid #ccc', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px'}}>
                <IconPrint /> Imprimir
              </button>
              <button onClick={()=>setShowStatementModal(null)} style={{...touchBtnStyle, flex:1, background:'#eee'}}>Fechar</button>
              {showStatementModal.balance > 0.01 && (
                <button onClick={() => { setShowStatementModal(null); openPayModal(showStatementModal) }} style={{ ...touchBtnStyle, flex: 1, background: grenaColor, color: 'white' }}>QUITAR</button>
              )}
              {/* BOTÃO NOVO - Excluir com histórico */}
              <button
                onClick={() => handleDeleteClientWithHistory(showStatementModal)}
                style={{ ...touchBtnStyle, width: '100%', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
              >
                🗑️ Excluir Cliente e Todo o Histórico
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}








