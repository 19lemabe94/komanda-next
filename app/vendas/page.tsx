'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { colors, globalStyles } from '../styles/theme'
// Importamos o Header centralizado
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

// Tipo para os totais do dia
type DailyTotals = {
  geral: number
  dinheiro: number
  digital: number // Pix + Cartões
  fiado: number
}

export default function VendasPage() {
  const router = useRouter()
  // Data inicial: Hoje (Formato ISO para input date)
  const today = new Date().toLocaleDateString('sv-SE')
  
  const [orders, setOrders] = useState<ClosedOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState(today)
  const [selectedOrder, setSelectedOrder] = useState<{id: string, label: string} | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null) // Para o Header
  
  // Estado para os totais calculados
  const [totals, setTotals] = useState<DailyTotals>({ geral: 0, dinheiro: 0, digital: 0, fiado: 0 })

  useEffect(() => {
    initFetch()
  }, [dateFilter])

  const initFetch = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    // Busca org_id E role para o menu funcionar corretamente
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', session.user.id)
      .single()

    if (profile?.org_id) {
      setUserRole(profile.role) // Define o papel do usuário

      // Ajuste de fuso horário simples para garantir o dia inteiro UTC
      const startOfDay = `${dateFilter}T00:00:00.000Z`
      const endOfDay = `${dateFilter}T23:59:59.999Z`

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('org_id', profile.org_id)
        .neq('status', 'aberta') // Trazemos concluídas e canceladas
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setOrders(data)
        calculateTotals(data)
      } else {
        setOrders([])
        setTotals({ geral: 0, dinheiro: 0, digital: 0, fiado: 0 })
      }
    }
    setLoading(false)
  }

  const calculateTotals = (data: ClosedOrder[]) => {
    const newTotals = data.reduce((acc, curr) => {
      // Ignora canceladas nos totais
      if (curr.status !== 'concluida') return acc

      const val = curr.total
      acc.geral += val

      if (curr.payment_method === 'dinheiro') {
        acc.dinheiro += val
      } else if (curr.payment_method === 'fiado') {
        acc.fiado += val
      } else {
        // Pix, Debito, Credito
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

  const kpiCardStyle = {
    flex: 1, minWidth: '140px', padding: '15px 20px', borderRadius: '12px',
    border: `1px solid ${colors.border}`, backgroundColor: 'white',
    display: 'flex', flexDirection: 'column' as 'column', justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
  }

  return (
    <div style={{ ...globalStyles.container, justifyContent: 'flex-start', background: '#f8fafc' }}>
      
      {/* HEADER CENTRALIZADO E RESPONSIVO */}
      <Header userRole={userRole} subtitle="HISTÓRICO DE VENDAS" />

      <main style={{ width: '100%', maxWidth: '900px', padding: '30px 20px', flex: 1 }}>
        
        {/* BARRA DE FILTRO DE DATA */}
        <div style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '15px', background: 'white', padding: '15px 20px', borderRadius: '12px', border: `1px solid ${colors.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '1.2rem' }}>📅</span>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: colors.textMuted, display: 'block', marginBottom: '2px', textTransform: 'uppercase' }}>Filtrar por Data</label>
            <input 
              type="date" 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value)}
              style={{ border: 'none', fontWeight: 'bold', fontSize: '1.1rem', color: colors.text, outline: 'none', background: 'transparent', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        {/* CARDS DE RESUMO DO DIA (Modais de totais) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '30px' }}>
          {/* Total Geral */}
          <div style={{ ...kpiCardStyle, backgroundColor: colors.primary, color: 'white', border: 'none' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.9 }}>TOTAL DO DIA</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '5px' }}>R$ {totals.geral.toFixed(2)}</div>
          </div>

          {/* Dinheiro */}
          <div style={kpiCardStyle}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: colors.textMuted }}>💵 DINHEIRO</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: '5px' }}>R$ {totals.dinheiro.toFixed(2)}</div>
          </div>

          {/* Digital (Pix/Cartão) */}
          <div style={kpiCardStyle}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: colors.textMuted }}>💳 PIX / CARTÃO</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb', marginTop: '5px' }}>R$ {totals.digital.toFixed(2)}</div>
          </div>

           {/* Fiado */}
           <div style={kpiCardStyle}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: colors.textMuted }}>📝 FIADO</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f97316', marginTop: '5px' }}>R$ {totals.fiado.toFixed(2)}</div>
          </div>
        </div>

        {/* LISTA DE VENDAS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: colors.textMuted }}>Carregando vendas...</div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: colors.textMuted, background: 'white', borderRadius: '12px', border: `1px solid ${colors.border}` }}>Nenhuma venda encontrada nesta data.</div>
          ) : (
            orders.map(order => (
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
                  
                  <button 
                    onClick={(e) => handleDelete(e, order.id, order.label)}
                    style={{ 
                      background: '#fee2e2', border: 'none', cursor: 'pointer', 
                      width: '36px', height: '36px', color: '#ef4444',
                      borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1rem'
                    }}
                    title="Excluir Venda"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* MODAL DE DETALHES */}
      {selectedOrder && (
        <OrderDetailsModal 
          orderId={selectedOrder.id}
          label={selectedOrder.label}
          onClose={() => setSelectedOrder(null)}
          onUpdate={initFetch} // Recarrega a lista se algo mudar
        />
      )}
    </div>
  )
}