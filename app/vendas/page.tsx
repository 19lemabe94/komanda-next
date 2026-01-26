'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { colors, globalStyles } from '../styles/theme'
import { Header } from '../components/Header'
import { OrderDetailsModal } from '../components/OrderDetailsModal'

type ClosedOrder = {
  id: string
  label: string
  status: 'concluida' | 'cancelada'
  total: number
  payment_method: string
  created_at: string
}

type DailyTotals = {
  geral: number
  dinheiro: number
  digital: number
  fiado: number
}

// Tipo para o filtro de pagamento
type PaymentFilterType = 'dinheiro' | 'digital' | 'fiado' | null

export default function VendasPage() {
  const router = useRouter()
  
  // FUNÇÃO SEGURA PARA PEGAR DATA LOCAL (YYYY-MM-DD)
  // Resolve o erro "Invalid time value" no iPhone/Safari
  const getLocalToday = () => {
    const now = new Date()
    // Ajusta o fuso horário manualmente para garantir a data local correta
    const offset = now.getTimezoneOffset() * 60000
    const localDate = new Date(now.getTime() - offset)
    return localDate.toISOString().split('T')[0]
  }
  
  const [orders, setOrders] = useState<ClosedOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState(getLocalToday()) // Usa a função segura
  const [selectedOrder, setSelectedOrder] = useState<{id: string, label: string} | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null) 
  
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilterType>(null)
  const [totals, setTotals] = useState<DailyTotals>({ geral: 0, dinheiro: 0, digital: 0, fiado: 0 })

  useEffect(() => {
    initFetch()
  }, [dateFilter])

  const initFetch = async () => {
    setLoading(true)
    try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }

        const { data: profile } = await supabase
        .from('profiles')
        .select('org_id, role')
        .eq('id', session.user.id)
        .single()

        if (profile?.org_id) {
        setUserRole(profile.role)

        // Criação segura das datas de início e fim do dia
        // Adicionamos o 'T' e o horário explicitamente para formato ISO
        const startStr = `${dateFilter}T00:00:00`
        const endStr = `${dateFilter}T23:59:59`
        
        // Verifica se a data é válida antes de chamar o banco
        const startDate = new Date(startStr)
        const endDate = new Date(endStr)

        if (isNaN(startDate.getTime())) {
            console.error("Data inválida detectada")
            setLoading(false)
            return
        }

        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('org_id', profile.org_id)
            .neq('status', 'aberta')
            // Ajuste de Fuso: subtraímos 3 horas (ou o offset) se necessário, 
            // mas o método padrão ISO aqui deve funcionar bem se o banco estiver em UTC
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: false })

        if (!error && data) {
            setOrders(data)
            calculateTotals(data)
        } else {
            setOrders([])
            setTotals({ geral: 0, dinheiro: 0, digital: 0, fiado: 0 })
        }
        }
    } catch (err) {
        console.error("Erro ao buscar vendas:", err)
    } finally {
        setLoading(false)
    }
  }

  const calculateTotals = (data: ClosedOrder[]) => {
    const newTotals = data.reduce((acc, curr) => {
      if (curr.status !== 'concluida') return acc

      const val = curr.total
      acc.geral += val

      if (curr.payment_method === 'dinheiro') {
        acc.dinheiro += val
      } else if (curr.payment_method === 'fiado') {
        acc.fiado += val
      } else {
        acc.digital += val
      }
      return acc
    }, { geral: 0, dinheiro: 0, digital: 0, fiado: 0 })

    setTotals(newTotals)
  }

  const handleDelete = async (e: React.MouseEvent, id: string, label: string) => {
    e.stopPropagation()
    if (!confirm(`⚠️ Excluir venda da mesa "${label}"? Isso não pode ser desfeito.`)) return

    const { error } = await supabase.from('orders').delete().eq('id', id)

    if (error) {
      alert("Erro ao excluir: " + error.message)
    } else {
      const updatedList = orders.filter(o => o.id !== id)
      setOrders(updatedList)
      calculateTotals(updatedList)
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.label.toLowerCase().includes(searchTerm.toLowerCase())

    let matchesPayment = true
    if (paymentFilter === 'dinheiro') {
      matchesPayment = order.payment_method === 'dinheiro'
    } else if (paymentFilter === 'fiado') {
      matchesPayment = order.payment_method === 'fiado'
    } else if (paymentFilter === 'digital') {
      matchesPayment = order.payment_method !== 'dinheiro' && order.payment_method !== 'fiado'
    }

    return matchesSearch && matchesPayment
  })

  const getCardStyle = (type: PaymentFilterType | 'all', defaultColor: string) => {
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
            <span style={{ fontSize: '1.2rem' }}>📅</span>
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
            <span style={{ fontSize: '1.2rem' }}>🔍</span>
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
             {searchTerm && (
               <button onClick={() => setSearchTerm('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
             )}
          </div>
        </div>

        {/* CARDS */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '30px' }}>
          <div onClick={() => setPaymentFilter(null)} style={{ ...getCardStyle('all', colors.primary), backgroundColor: paymentFilter === null ? colors.primary : 'white', color: paymentFilter === null ? 'white' : colors.text }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.9 }}>TOTAL DO DIA</span>
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
          <div onClick={() => setPaymentFilter(paymentFilter === 'fiado' ? null : 'fiado')} style={getCardStyle('fiado', '#f97316')}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: colors.textMuted }}>📝 FIADO</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f97316', marginTop: '5px' }}>R$ {totals.fiado.toFixed(2)}</div>
          </div>
        </div>

        {/* LISTA */}
        {(paymentFilter || searchTerm) && (
            <div style={{ marginBottom: '15px', fontSize: '0.9rem', color: colors.textMuted }}>
                Exibindo: <strong>{filteredOrders.length}</strong> resultados 
                {paymentFilter && <span> • Filtro: <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{paymentFilter}</span></span>}
                {searchTerm && <span> • Busca: "<strong>{searchTerm}</strong>"</span>}
            </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: colors.textMuted }}>Carregando vendas...</div>
          ) : filteredOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: colors.textMuted, background: 'white', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
                {searchTerm || paymentFilter ? 'Nenhuma venda encontrada com estes filtros.' : 'Nenhuma venda encontrada nesta data.'}
            </div>
          ) : (
            filteredOrders.map(order => (
              <div 
                key={order.id} 
                onClick={() => setSelectedOrder({ id: order.id, label: order.label })}
                style={{ 
                  backgroundColor: 'white', padding: '18px 20px', borderRadius: '12px', cursor: 'pointer',
                  border: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'transform 0.1s'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: colors.text }}>{order.label}</span>
                    <span style={{ 
                      fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 700,
                      backgroundColor: order.status === 'concluida' ? '#dcfce7' : '#fee2e2',
                      color: order.status === 'concluida' ? '#166534' : '#991b1b',
                      textTransform: 'uppercase'
                    }}>
                      {order.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: colors.textMuted, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🕒 {new Date(order.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                    <span>•</span>
                    <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{order.payment_method || 'S/ INFO'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: colors.primary }}>
                    R$ {order.total.toFixed(2)}
                  </div>
                  
                  {userRole === 'admin' && (
                    <button 
                      onClick={(e) => handleDelete(e, order.id, order.label)}
                      style={{ background: '#fee2e2', border: 'none', cursor: 'pointer', width: '36px', height: '36px', color: '#ef4444', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}
                      title="Excluir Venda"
                    >
                      🗑️
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
          onClose={() => setSelectedOrder(null)}
          onUpdate={initFetch}
          userRole={userRole} 
        />
      )}
    </div>
  )
}