'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { colors, globalStyles } from '../styles/theme'
import { Header } from '../components/Header'
import { OrderDetailsModal } from '../components/OrderDetailsModal'

// --- ÍCONES SVG ---
const IconTrash = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
const IconCalendar = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
const IconSearch = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
const IconArrowDown = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>

// Tipo unificado para suportar Venda e Recebimento
type TimelineItem = {
  type: 'sale' | 'receipt'
  id: string
  label: string
  status: string
  total: number
  payment_method: string
  created_at: string
}

type DailyTotals = {
  geral: number
  dinheiro: number
  digital: number
  fiado: number
  recuperado: number // Novo campo
}

type PaymentFilterType = 'dinheiro' | 'digital' | 'fiado' | 'recebido' | null

export default function VendasPage() {
  const router = useRouter()
  
  const getLocalToday = () => {
    const now = new Date()
    const offset = now.getTimezoneOffset() * 60000
    const localDate = new Date(now.getTime() - offset)
    return localDate.toISOString().split('T')[0]
  }
  
  // Agora usamos uma lista unificada (TimelineItem) em vez de apenas ClosedOrder
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState(getLocalToday()) 
  const [selectedOrder, setSelectedOrder] = useState<{id: string, label: string, total: number} | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null) 
  const [myOrgId, setMyOrgId] = useState<string | null>(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilterType>(null)
  const [totals, setTotals] = useState<DailyTotals>({ geral: 0, dinheiro: 0, digital: 0, fiado: 0, recuperado: 0 })

  useEffect(() => {
    initFetch()
  }, [dateFilter])

  const initFetch = async () => {
    setLoading(true)
    try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }

        const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('id', session.user.id).single()

        if (profile?.org_id) {
            setUserRole(profile.role)
            setMyOrgId(profile.org_id)

            const startStr = `${dateFilter}T00:00:00`
            const endStr = `${dateFilter}T23:59:59`
            
            // 1. BUSCAR VENDAS (Tabela ORDERS)
            const { data: ordersData } = await supabase.from('orders').select('*')
                .eq('org_id', profile.org_id).neq('status', 'aberta')
                .gte('created_at', startStr).lte('created_at', endStr)

            // 2. BUSCAR RECEBIMENTOS DE DÍVIDA (Tabela DEBT_PAYMENTS)
            const { data: debtData } = await supabase.from('debt_payments').select('id, amount, created_at, notes, clients(name)')
                .eq('org_id', profile.org_id)
                .gte('created_at', startStr).lte('created_at', endStr)

            // --- PROCESSAMENTO E CÁLCULOS ---
            const calc = { geral: 0, dinheiro: 0, digital: 0, fiado: 0, recuperado: 0 }
            const list: TimelineItem[] = []

            // A. Processar Vendas Normais
            if (ordersData) {
                ordersData.forEach(o => {
                    const val = o.total
                    if (o.status === 'concluida') {
                        if (o.payment_method === 'fiado') {
                            calc.fiado += val
                        } else {
                            // Venda à vista (Dinheiro/Pix/Cartão)
                            calc.geral += val
                            if (o.payment_method === 'dinheiro') calc.dinheiro += val
                            else calc.digital += val
                        }
                    }
                    
                    list.push({
                        type: 'sale',
                        id: o.id,
                        label: o.label,
                        status: o.status,
                        total: val,
                        payment_method: o.payment_method,
                        created_at: o.created_at
                    })
                })
            }

            // B. Processar Recebimentos de Dívida (O PULO DO GATO)
            if (debtData) {
                debtData.forEach(d => {
                    const val = d.amount
                    const note = (d.notes || '').toLowerCase()
                    
                    // Soma no caixa geral
                    calc.geral += val
                    calc.recuperado += val

                    // Lê a nota para saber se foi dinheiro ou digital
                    if (note.includes('dinheiro')) {
                        calc.dinheiro += val
                    } else {
                        calc.digital += val // Pix, Cartão, etc
                    }

                    list.push({
                        type: 'receipt',
                        id: d.id,
                        label: `Receb. ${(d.clients as any)?.name || 'Cliente'}`,
                        status: 'recebido',
                        total: val,
                        payment_method: note.includes('dinheiro') ? 'dinheiro' : 'digital',
                        created_at: d.created_at
                    })
                })
            }

            setTotals(calc)
            // Ordenar: Mais recente primeiro
            setTimeline(list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
        }
    } catch (err) {
        console.error("Erro ao buscar dados:", err)
    } finally {
        setLoading(false)
    }
  }

  // Função necessária para o Modal funcionar
  const handlePayment = async (orderId: string, amount: number, method: string, clientId?: string | null) => {
    if (!myOrgId) return
    // Registra pagamento no caixa
    await supabase.from('payments').insert([{ org_id: myOrgId, order_id: orderId, amount: amount, method: method }])
    
    // Atualiza status do pedido
    const { data: order } = await supabase.from('orders').select('total').eq('id', orderId).single()
    const { data: payments } = await supabase.from('payments').select('amount').eq('order_id', orderId)
    const totalPaid = payments?.reduce((acc, curr) => acc + curr.amount, 0) || 0

    if (order && totalPaid >= order.total - 0.05) {
      await supabase.from('orders').update({ status: 'concluida', payment_method: method }).eq('id', orderId)
      setSelectedOrder(null) 
    }
    initFetch()
  }

  const handleDelete = async (e: React.MouseEvent, item: TimelineItem) => {
    e.stopPropagation()
    if (!confirm(`⚠️ Excluir este registro permanentemente?`)) return

    if (item.type === 'receipt') {
        // Excluir recebimento de dívida
        await supabase.from('debt_payments').delete().eq('id', item.id)
    } else {
        // Excluir venda normal
        await supabase.from('orders').delete().eq('id', item.id)
    }
    initFetch()
  }

  const filteredTimeline = timeline.filter(item => {
    const matchesSearch = item.label.toLowerCase().includes(searchTerm.toLowerCase())
    let matchesPayment = true
    
    if (paymentFilter === 'dinheiro') matchesPayment = item.payment_method === 'dinheiro'
    else if (paymentFilter === 'fiado') matchesPayment = item.payment_method === 'fiado'
    else if (paymentFilter === 'digital') matchesPayment = item.payment_method !== 'dinheiro' && item.payment_method !== 'fiado'
    else if (paymentFilter === 'recebido') matchesPayment = item.type === 'receipt'
    
    return matchesSearch && matchesPayment
  })

  // Estilo dos Cards (seguro)
  const getCardStyle = (type: PaymentFilterType | 'all' | 'recebido', defaultColor: string) => {
    // @ts-ignore
    const isActive = type === 'all' ? paymentFilter === null : paymentFilter === type
    return {
      flex: 1, minWidth: '140px', padding: '15px 20px', borderRadius: '12px',
      border: isActive ? `2px solid ${defaultColor}` : `1px solid ${colors.border}`, 
      backgroundColor: isActive ? '#fff' : 'white',
      display: 'flex', flexDirection: 'column' as 'column', justifyContent: 'center',
      boxShadow: isActive ? `0 4px 12px ${defaultColor}40` : '0 2px 4px rgba(0,0,0,0.03)',
      cursor: 'pointer',
      opacity: (paymentFilter && !isActive) ? 0.6 : 1, 
      transition: 'all 0.2s'
    }
  }

  return (
    <div style={{ ...globalStyles.container, justifyContent: 'flex-start', background: '#f8fafc' }}>
      
      <Header userRole={userRole} subtitle="HISTÓRICO DE VENDAS" />

      <main style={{ width: '100%', maxWidth: '900px', padding: '30px 20px', flex: 1 }}>
        
        {/* FILTROS */}
        <div style={{ marginBottom: '25px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '15px', background: 'white', padding: '15px 20px', borderRadius: '12px', border: `1px solid ${colors.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <span style={{ color: colors.textMuted }}><IconCalendar /></span>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: colors.textMuted, display: 'block', marginBottom: '2px', textTransform: 'uppercase' }}>Data</label>
              <input 
                type="date" 
                value={dateFilter} 
                onChange={(e) => setDateFilter(e.target.value)}
                style={{ border: 'none', fontWeight: 'bold', fontSize: '1.1rem', color: colors.text, outline: 'none', background: 'transparent', fontFamily: 'inherit', width: '100%' }}
              />
            </div>
          </div>

          <div style={{ flex: 1.5, minWidth: '250px', display: 'flex', alignItems: 'center', gap: '15px', background: 'white', padding: '15px 20px', borderRadius: '12px', border: `1px solid ${colors.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <span style={{ color: colors.textMuted }}><IconSearch /></span>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 800, color: colors.textMuted, display: 'block', marginBottom: '2px', textTransform: 'uppercase' }}>Buscar Venda</label>
              <input 
                type="text" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nome da mesa..."
                style={{ border: 'none', fontWeight: 'bold', fontSize: '1.1rem', color: colors.text, outline: 'none', background: 'transparent', fontFamily: 'inherit', width: '100%' }}
              />
            </div>
             {searchTerm && (<button onClick={() => setSearchTerm('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>✕</button>)}
          </div>
        </div>

        {/* CARDS */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '30px' }}>
          <div onClick={() => setPaymentFilter(null)} style={{ ...getCardStyle('all', colors.primary), backgroundColor: paymentFilter === null ? colors.primary : 'white', color: paymentFilter === null ? 'white' : colors.text }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.9 }}>TOTAL GERAL</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '5px' }}>R$ {totals.geral.toFixed(2)}</div>
          </div>
          <div onClick={() => setPaymentFilter(paymentFilter === 'dinheiro' ? null : 'dinheiro')} style={getCardStyle('dinheiro', '#16a34a')}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: colors.textMuted }}>💵 DINHEIRO</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: '5px' }}>R$ {totals.dinheiro.toFixed(2)}</div>
          </div>
          <div onClick={() => setPaymentFilter(paymentFilter === 'digital' ? null : 'digital')} style={getCardStyle('digital', '#2563eb')}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: colors.textMuted }}>💳 PIX / CARTÃO</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb', marginTop: '5px' }}>R$ {totals.digital.toFixed(2)}</div>
          </div>
          
          {/* CARD DE RECUPERADO (NOVO) */}
          <div onClick={() => setPaymentFilter(paymentFilter === 'recebido' ? null : 'recebido')} style={{ ...getCardStyle('recebido', '#7c3aed'), backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed' }}>📥 FIADO PAGO</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#7c3aed', marginTop: '5px' }}>R$ {totals.recuperado.toFixed(2)}</div>
          </div>

          <div onClick={() => setPaymentFilter(paymentFilter === 'fiado' ? null : 'fiado')} style={getCardStyle('fiado', '#f97316')}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: colors.textMuted }}>📝 FIADO</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f97316', marginTop: '5px' }}>R$ {totals.fiado.toFixed(2)}</div>
          </div>
        </div>

        {/* LISTA */}
        {(paymentFilter || searchTerm) && (
            <div style={{ marginBottom: '15px', fontSize: '0.9rem', color: colors.textMuted }}>
                Exibindo: <strong>{filteredTimeline.length}</strong> resultados 
                {paymentFilter && <span> • Filtro: <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{paymentFilter}</span></span>}
            </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: colors.textMuted }}>Carregando vendas...</div>
          ) : filteredTimeline.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: colors.textMuted, background: 'white', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                {searchTerm || paymentFilter ? 'Nenhuma venda encontrada com estes filtros.' : 'Nenhuma venda encontrada nesta data.'}
            </div>
          ) : (
            filteredTimeline.map(item => (
              <div 
                key={`${item.type}-${item.id}`} 
                onClick={() => item.type === 'sale' && setSelectedOrder({ id: item.id, label: item.label, total: item.total })}
                style={{ 
                  backgroundColor: item.type === 'receipt' ? '#f0fdf4' : 'white', 
                  padding: '18px 20px', borderRadius: '12px', 
                  cursor: item.type === 'sale' ? 'pointer' : 'default',
                  border: item.type === 'receipt' ? '1px solid #86efac' : `1px solid ${colors.border}`, 
                  borderLeft: item.type === 'receipt' ? '5px solid #22c55e' : (item.payment_method === 'fiado' ? '5px solid #f97316' : `1px solid ${colors.border}`),
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'transform 0.1s'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {item.type === 'receipt' && <IconArrowDown />}
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: item.type === 'receipt' ? '#166534' : colors.text }}>{item.label}</span>
                    <span style={{ 
                      fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 700,
                      backgroundColor: item.type === 'receipt' ? '#dcfce7' : (item.status === 'concluida' ? '#dcfce7' : '#fee2e2'),
                      color: item.type === 'receipt' ? '#166534' : (item.status === 'concluida' ? '#166534' : '#991b1b'),
                      textTransform: 'uppercase'
                    }}>
                      {item.type === 'receipt' ? 'RECEBIMENTO' : item.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: colors.textMuted, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🕒 {new Date(item.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                    <span>•</span>
                    <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{item.payment_method || 'S/ INFO'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: item.type === 'receipt' ? '#16a34a' : colors.primary }}>
                    {item.type === 'receipt' ? '+ ' : ''}R$ {item.total.toFixed(2)}
                  </div>
                  
                  {userRole === 'admin' && (
                    <button 
                      onClick={(e) => handleDelete(e, item)}
                      style={{ background: '#fee2e2', border: 'none', cursor: 'pointer', width: '36px', height: '36px', color: '#ef4444', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}
                      title="Excluir"
                    >
                      <IconTrash />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {selectedOrder && (
        <OrderDetailsModal 
          orderId={selectedOrder.id}
          label={selectedOrder.label}
          total={selectedOrder.total} 
          onPayment={handlePayment} 
          onClose={() => setSelectedOrder(null)}
          onUpdate={initFetch}
          userRole={userRole} 
        />
      )}
    </div>
  )
}