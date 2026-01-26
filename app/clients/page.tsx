'use client'
import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { colors, globalStyles } from '../styles/theme'
import { Header } from '../components/Header'

// --- ÍCONES SVG ---
const IconEdit = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

const IconPrint = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"></polyline>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
    <rect x="6" y="14" width="12" height="8"></rect>
  </svg>
)

const IconTrash = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
)

// --- TIPOS ---
type Client = {
  id: string
  name: string
  phone: string
  org_id: string
  total_fiado: number   
  total_paid: number    
  balance: number       
}

type HistoryItem = {
  type: 'order' | 'payment'
  id: string
  date: string
  amount: number
  description: string
  details?: any[] 
}

export default function ClientsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [totalReceivables, setTotalReceivables] = useState(0)
  const [myOrgId, setMyOrgId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  const [showClientModal, setShowClientModal] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [showPayModal, setShowPayModal] = useState<Client | null>(null)
  const [showStatementModal, setShowStatementModal] = useState<Client | null>(null)

  const [statementHistory, setStatementHistory] = useState<HistoryItem[]>([])
  const [statementLoading, setStatementLoading] = useState(false)

  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [payAmount, setPayAmount] = useState('')

  // Cores e Estilos
  const grenaColor = '#800020' 
  const orangeTheme = '#f97316'
  
  const touchBtnStyle = {
    padding: '12px 16px',
    borderRadius: '10px',
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: 'pointer',
    border: 'none',
    minHeight: '48px', 
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.1s'
  }

  useEffect(() => { initFetch() }, [])

  const initFetch = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('id', session.user.id).single()
    if (profile?.org_id) {
      setMyOrgId(profile.org_id)
      setUserRole(profile.role)
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
      const bal = parseFloat((debt - paid).toFixed(2))
      return { ...c, total_fiado: debt, total_paid: paid, balance: bal }
    })

    const totalPending = processed.reduce((acc, curr) => acc + (curr.balance > 0 ? curr.balance : 0), 0)
    setTotalReceivables(totalPending)
    setClients(processed.sort((a, b) => b.balance - a.balance))
  }

  const openClientModal = (client?: Client) => {
    if (client) {
        setEditingClient(client)
        setFormName(client.name)
        setFormPhone(client.phone || '')
    } else {
        setEditingClient(null)
        setFormName('')
        setFormPhone('')
    }
    setShowClientModal(true)
  }

  const handleSaveClient = async (e: FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !myOrgId) return
    if (editingClient) {
        await supabase.from('clients').update({ name: formName.trim(), phone: formPhone }).eq('id', editingClient.id)
    } else {
        await supabase.from('clients').insert([{ name: formName.trim(), phone: formPhone, org_id: myOrgId }])
    }
    setShowClientModal(false)
    fetchClients(myOrgId)
  }

  const handlePayment = async (e: FormEvent) => {
    e.preventDefault()
    if (!showPayModal || !payAmount || !myOrgId) return
    const amount = parseFloat(payAmount.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) return alert('Valor inválido')
    const { error } = await supabase.from('debt_payments').insert([{ client_id: showPayModal.id, amount: amount, org_id: myOrgId }])
    if (!error) { setShowPayModal(null); setPayAmount(''); fetchClients(myOrgId) }
  }

  const handleSettleDebt = async (client: Client) => {
    if (!confirm(`CONFIRMAR PAGAMENTO TOTAL?\n\nCliente: ${client.name}\nValor: R$ ${client.balance.toFixed(2)}`)) return
    if (!myOrgId) return
    const { error } = await supabase.from('debt_payments').insert([{ client_id: client.id, amount: client.balance, org_id: myOrgId, notes: 'Pagamento Total (Quitação - Zerar)' }])
    if (!error) { if (showStatementModal) handleOpenStatement(client); await fetchClients(myOrgId) }
    else { alert('Erro ao zerar conta.') }
  }

  const handleDeletePayment = async (paymentId: string, client: Client) => {
    if(!confirm('⚠️ EXCLUIR PAGAMENTO?\n\nIsso fará o valor da dívida voltar para a conta.')) return;
    const { error } = await supabase.from('debt_payments').delete().eq('id', paymentId);
    if (!error) { await fetchClients(myOrgId!); if (showStatementModal) handleOpenStatement(client) }
    else { alert('Erro ao excluir pagamento.') }
  }

  const handleOpenStatement = async (client: Client) => {
    setShowStatementModal(client)
    setStatementLoading(true)
    const { data: orders } = await supabase.from('orders').select('id, created_at, total, order_items(quantity, product_name_snapshot)').eq('client_id', client.id).eq('status', 'concluida').eq('payment_method', 'fiado').order('created_at', { ascending: false })
    const { data: payments } = await supabase.from('debt_payments').select('id, created_at, amount, notes').eq('client_id', client.id).order('created_at', { ascending: false })
    const history: HistoryItem[] = []
    orders?.forEach((o: any) => {
        const desc = o.order_items.map((i: any) => `${i.quantity}x ${i.product_name_snapshot}`).join(', ')
        history.push({ type: 'order', id: o.id, date: o.created_at, amount: o.total, description: desc, details: o.order_items })
    })
    payments?.forEach((p: any) => {
        history.push({ type: 'payment', id: p.id, date: p.created_at, amount: p.amount, description: p.notes || 'Pagamento / Abatimento' })
    })
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    setStatementHistory(history)
    setStatementLoading(false)
  }

  const handlePrintStatement = () => {
    if (!showStatementModal) return
    const content = document.getElementById('printable-area')?.innerHTML
    const printWindow = window.open('', '', 'height=600,width=800')
    if (printWindow && content) {
        printWindow.document.write('<html><head><title>Extrato</title><style>body{font-family:monospace; padding: 20px;} .row{display:flex;justify-content:space-between;border-bottom:1px dashed #000;padding:5px 0;} .bold{font-weight:bold;} .hide-print{display:none}</style></head><body>')
        printWindow.document.write(content)
        printWindow.document.write('</body></html>')
        printWindow.document.close()
        printWindow.print()
    }
  }

  return (
    <div style={{ ...globalStyles.container, justifyContent: 'flex-start', background: '#f8fafc' }}>
      <Header userRole={userRole} subtitle="CONTROLE DE FIADO" />
      
      {/* CSS PARA INTERAÇÃO DOS BOTÕES GRENÁ */}
      <style jsx global>{`
        .btn-grena-interactive {
          background-color: white;
          color: ${grenaColor};
          border: 1px solid ${grenaColor};
          transition: all 0.1s ease-in-out;
        }
        .btn-grena-interactive:active {
          background-color: ${grenaColor};
          color: white;
          transform: scale(0.95);
        }
        .btn-grena-interactive:hover {
          background-color: #fff0f5; /* Leve rosinha no hover desktop */
        }
      `}</style>

      <main style={{ width: '100%', maxWidth: '900px', padding: '20px', flex: 1 }}>
        
        <div style={{ backgroundColor: '#fff7ed', border: `2px solid ${orangeTheme}`, borderRadius: '16px', padding: '20px', marginBottom: '25px', textAlign: 'center', boxShadow: '0 4px 10px rgba(249, 115, 22, 0.15)' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '1px' }}>TOTAL NA RUA (A RECEBER)</span>
            <div style={{ fontSize: '2.8rem', fontWeight: 900, color: '#ea580c', lineHeight: 1, marginTop: '8px' }}>R$ {totalReceivables.toFixed(2)}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', margin: 0, color: colors.text }}>Carteira de Clientes</h2>
            <span style={{ fontSize: '0.8rem', color: colors.textMuted }}>{clients.length} cadastrados</span>
          </div>
          <button onClick={() => openClientModal()} style={{ ...touchBtnStyle, backgroundColor: colors.primary, color: 'white' }}>+ Novo Cliente</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {loading ? <p style={{textAlign:'center', color: '#999'}}>Carregando...</p> : clients.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999', background: 'white', borderRadius: '12px', border: `1px solid ${colors.border}` }}>Nenhum cliente cadastrado.</div>
          ) : (
            clients.map(client => (
              <div key={client.id} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: `1px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div>
                            <span style={{ fontWeight: 800, fontSize: '1.2rem', color: colors.text, display: 'block' }}>{client.name}</span>
                            <span style={{ fontSize: '0.9rem', color: colors.textMuted }}>{client.phone || 'Sem telefone'}</span>
                        </div>
                        {/* BOTÃO EDITAR GRENÁ */}
                        <button 
                            className="btn-grena-interactive"
                            onClick={() => openClientModal(client)} 
                            style={{ borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <IconEdit />
                        </button>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: colors.textMuted, textTransform: 'uppercase', fontWeight: 700 }}>{client.balance < -0.01 ? 'CRÉDITO' : 'SALDO DEVEDOR'}</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: client.balance > 0.01 ? '#ef4444' : (client.balance < -0.01 ? '#22c55e' : colors.textMuted) }}>{client.balance < -0.01 ? '+ ' : ''} R$ {Math.abs(client.balance).toFixed(2)}</div>
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={() => handleOpenStatement(client)} style={{ ...touchBtnStyle, flex: 1, background: 'white', border: `2px solid ${colors.border}`, color: colors.text }}>📄 Extrato</button>
                    {client.balance > 0.01 && (
                        <>
                            <button onClick={() => setShowPayModal(client)} style={{ ...touchBtnStyle, flex: 1, background: '#dcfce7', color: '#166534' }}>💵 Abater</button>
                            <button onClick={() => handleSettleDebt(client)} style={{ ...touchBtnStyle, flex: 1, background: grenaColor, color: 'white' }}>🚀 QUITAR</button>
                        </>
                    )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* MODAL 1: CRIAR/EDITAR */}
      {showClientModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(3px)' }}>
          <div style={{ ...globalStyles.card, width: '90%', maxWidth: '380px', padding: '30px' }}>
            <h3 style={{ marginTop: 0, color: colors.text, fontSize: '1.4rem' }}>{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h3>
            <form onSubmit={handleSaveClient}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: colors.textMuted, fontWeight: 700 }}>Nome Completo</label>
              <input required value={formName} onChange={e => setFormName(e.target.value)} style={{...globalStyles.input, marginBottom: '20px', padding: '15px'}} placeholder="Ex: João da Silva" />
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: colors.textMuted, fontWeight: 700 }}>Telefone / WhatsApp</label>
              <input value={formPhone} onChange={e => setFormPhone(e.target.value)} style={{...globalStyles.input, marginBottom: '25px', padding: '15px'}} placeholder="(21) 99999-9999" />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setShowClientModal(false)} style={{ ...touchBtnStyle, flex: 1, border: '2px solid #ccc', background: 'transparent' }}>Cancelar</button>
                <button type="submit" style={{ ...touchBtnStyle, ...globalStyles.buttonPrimary, flex: 1, marginTop: 0 }}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PAGAMENTO */}
      {showPayModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(3px)' }}>
          <div style={{ ...globalStyles.card, width: '90%', maxWidth: '380px', padding: '30px' }}>
            <h3 style={{ marginTop: 0, color: '#166534', fontSize: '1.4rem' }}>Abater Dívida</h3>
            <p style={{ color: colors.textMuted, fontSize: '1rem', marginBottom: '5px' }}>Cliente: <strong>{showPayModal.name}</strong></p>
            <p style={{ color: colors.textMuted, fontSize: '1rem', marginBottom: '25px' }}>Deve: <strong style={{ color: '#ef4444' }}>R$ {showPayModal.balance.toFixed(2)}</strong></p>
            <form onSubmit={handlePayment}>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '8px', color: '#166534', fontWeight: 700 }}>Valor a Pagar (R$)</label>
              <input autoFocus type="number" step="0.01" required value={payAmount} onChange={e => setPayAmount(e.target.value)} style={{...globalStyles.input, marginBottom: '25px', fontSize: '2rem', fontWeight: '900', color: '#166534', textAlign: 'center', padding: '15px', height: '70px'}} placeholder="0.00" />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => { setShowPayModal(null); setPayAmount('') }} style={{ ...touchBtnStyle, flex: 1, border: '2px solid #ccc', background: 'transparent' }}>Cancelar</button>
                <button type="submit" style={{ ...touchBtnStyle, backgroundColor: '#22c55e', color: 'white', flex: 1, marginTop: 0 }}>Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EXTRATO */}
      {showStatementModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '10px', backdropFilter: 'blur(3px)' }}>
          <div style={{ backgroundColor: '#fff', width: '100%', maxWidth: '550px', maxHeight: '95vh', borderRadius: '20px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
            
            <div style={{ padding: '20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: colors.primary }}>Extrato: {showStatementModal.name}</h3>
                <button onClick={() => setShowStatementModal(null)} style={{ border: 'none', background: '#e2e8f0', width: '40px', height: '40px', borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>

            <div id="printable-area" style={{ flex: 1, overflowY: 'auto', padding: '20px', background: 'white' }}>
                <div style={{ marginBottom: '25px', padding: '20px', border: '2px dashed #cbd5e1', borderRadius: '12px', background: '#fffbeb' }}>
                    <div className="row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem' }}><span>Total Comprado:</span> <strong>R$ {showStatementModal.total_fiado.toFixed(2)}</strong></div>
                    <div className="row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', color: '#166534', fontSize: '0.95rem' }}><span>Total Pago:</span> <strong>- R$ {showStatementModal.total_paid.toFixed(2)}</strong></div>
                    <div className="row" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #ccc', paddingTop: '10px', fontSize: '1.3rem', fontWeight: '900' }}>
                        <span>{showStatementModal.balance < -0.01 ? 'CRÉDITO:' : 'A PAGAR:'}</span> 
                        <span style={{ color: showStatementModal.balance > 0.01 ? '#ef4444' : (showStatementModal.balance < -0.01 ? '#22c55e' : colors.text) }}>{showStatementModal.balance < -0.01 ? '+ ' : ''} R$ {Math.abs(showStatementModal.balance).toFixed(2)}</span>
                    </div>
                </div>

                <h4 style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', marginBottom: '15px', color: colors.textMuted, textTransform: 'uppercase' }}>Histórico Completo</h4>
                
                {statementLoading ? <p style={{textAlign:'center', padding: '20px'}}>Carregando...</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {statementHistory.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', paddingBottom: '15px', borderBottom: '1px solid #f1f5f9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', alignItems: 'center' }}>
                                    <span>{new Date(item.date).toLocaleDateString('pt-BR')} <small style={{ fontWeight: 400, color: '#999', fontSize: '0.8rem' }}>{new Date(item.date).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</small></span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ color: item.type === 'order' ? '#ef4444' : '#166534' }}>{item.type === 'order' ? '+' : '-'} R$ {item.amount.toFixed(2)}</span>
                                        {item.type === 'payment' && (
                                            <button className="hide-print" onClick={() => handleDeletePayment(item.id, showStatementModal)} style={{ border: 'none', background: '#fee2e2', color: '#ef4444', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Excluir Pagamento">
                                                <IconTrash />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.9rem', color: colors.textMuted, marginTop: '4px', fontWeight: 600 }}>{item.type === 'order' ? '🛒 Compra' : '💰 Pagamento'}</div>
                                {item.type === 'order' && (<div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '6px', fontStyle: 'italic', paddingLeft: '12px', borderLeft: '3px solid #e2e8f0', lineHeight: '1.4' }}>{item.description}</div>)}
                                {item.type === 'payment' && item.description && (<div style={{ fontSize: '0.85rem', color: '#166534', marginTop: '6px', paddingLeft: '12px', borderLeft: '3px solid #dcfce7' }}>{item.description}</div>)}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ padding: '20px', borderTop: `1px solid ${colors.border}`, background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                   {/* BOTÃO IMPRIMIR GRENÁ */}
                   <button 
                      onClick={handlePrintStatement} 
                      className="btn-grena-interactive"
                      style={{ ...touchBtnStyle, flex: 1, display: 'flex', gap: '10px' }}
                   >
                      <IconPrint /> Imprimir
                   </button>
                   <button onClick={() => setShowStatementModal(null)} style={{ ...touchBtnStyle, flex: 1, background: '#e2e8f0', color: colors.text }}>Fechar</button>
                </div>
                {showStatementModal.balance > 0.01 && (
                    <button onClick={() => handleSettleDebt(showStatementModal)} style={{ ...touchBtnStyle, width: '100%', background: grenaColor, color: 'white', marginTop: '5px' }}>🚀 ZERAR TUDO (QUITAR)</button>
                )}
            </div>

          </div>
        </div>
      )}
    </div>
  )
}