'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { colors, globalStyles } from '../styles/theme'
import { BrandLogo } from '../components/BrandLogo'
import { OrderDetailsModal } from '../components/OrderDetailsModal'

type ClosedOrder = {
  id: string
  label: string
  status: 'concluida' | 'cancelada'
  total: number
  payment_method: string
  created_at: string
}

export default function VendasHistoryPage() {
  const router = useRouter()
  
  // Define "hoje" usando a data local (YYYY-MM-DD)
  const today = new Date().toLocaleDateString('sv-SE')
  
  const [orders, setOrders] = useState<ClosedOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState(today)
  const [myOrgId, setMyOrgId] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<{id: string, label: string} | null>(null)

  useEffect(() => {
    initVendas()
  }, [dateFilter])

  const initVendas = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', session.user.id)
      .single()

    if (profile?.org_id) {
      setMyOrgId(profile.org_id)
      
      /**
       * AJUSTE DE FUSO HORÁRIO (UTC-3):
       * Como o banco armazena em UTC, o dia 24 no Brasil (UTC-3) 
       * começa às 03:00:00 do dia 24 em UTC e termina às 02:59:59 do dia 25 em UTC.
       */
      const startOfDay = `${dateFilter}T03:00:00.000Z`
      
      // Calcula o dia seguinte para fechar o intervalo de 24h
      const nextDayDate = new Date(dateFilter)
      nextDayDate.setDate(nextDayDate.getDate() + 1)
      const nextDayStr = nextDayDate.toLocaleDateString('sv-SE')
      const endOfDay = `${nextDayStr}T02:59:59.999Z`
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('org_id', profile.org_id)
        .neq('status', 'aberta')
        .gte('created_at', startOfDay) // Início do dia compensado
        .lte('created_at', endOfDay)   // Fim do dia compensado
        .order('created_at', { ascending: false })

      if (error) {
        console.error("Erro na busca:", error.message)
      } else {
        setOrders(data || [])
      }
    }
    setLoading(false)
  }

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`⚠️ Excluir venda da mesa "${label}"?`)) return
    
    const { error } = await supabase.from('orders').delete().eq('id', id)
    
    if (!error) {
      setOrders(prev => prev.filter(o => o.id !== id))
    } else {
      alert("Erro ao excluir: " + error.message)
    }
  }

  const navBtn = {
    background: 'white', border: `1px solid ${colors.border}`, borderRadius: '6px',
    padding: '8px 16px', color: colors.text, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
  }

  return (
    <div style={{ ...globalStyles.container, justifyContent: 'flex-start', background: '#f8fafc' }}>
      
      <header style={{ 
        width: '100%', backgroundColor: 'white', borderBottom: `1px solid ${colors.border}`, 
        padding: '0 20px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <BrandLogo size={36} color={colors.primary} />
          <div style={{ lineHeight: 1 }}>
            <span style={{ fontWeight: 800, color: colors.primary, display: 'block' }}>KOMANDA</span>
            <span style={{ fontSize: '0.65rem', color: colors.textMuted, textTransform: 'uppercase' }}>Histórico</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => router.push('/')} style={navBtn}>🏠 Início</button>
          <button onClick={() => router.push('/reports')} style={navBtn}>📈 Relatórios</button>
          <button 
            onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            style={{ ...navBtn, backgroundColor: colors.errorBg, color: colors.errorText, border: 'none' }}
          >
            Sair
          </button>
        </div>
      </header>

      <main style={{ width: '100%', maxWidth: '900px', padding: '30px 20px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', color: colors.text, margin: 0 }}>Gestão de Vendas</h2>
            <p style={{ fontSize: '0.8rem', color: colors.textMuted }}>Exibindo registros conforme horário local de Brasília.</p>
          </div>
          <input 
            type="date" 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ padding: '10px', borderRadius: '8px', border: `1px solid ${colors.border}`, fontWeight: 'bold', outline: 'none' }}
          />
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: colors.textMuted }}>Sincronizando registros...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {orders.map(order => (
              <div key={order.id} style={{ 
                backgroundColor: 'white', padding: '15px 20px', borderRadius: '12px', 
                border: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}>
                <div onClick={() => setSelectedOrder({id: order.id, label: order.label})} style={{ cursor: 'pointer', flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: colors.text }}>
                    Mesa {order.label} 
                    <span style={{ marginLeft: '10px', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: order.status === 'concluida' ? '#dcfce7' : '#fee2e2', color: order.status === 'concluida' ? '#166534' : '#991b1b' }}>
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: colors.textMuted }}>
                    Pago via: <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{order.payment_method || '---'}</span> • {new Date(order.created_at).toLocaleTimeString('pt-BR')}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, color: colors.primary }}>R$ {order.total.toFixed(2)}</span>
                  <button 
                    onClick={() => handleDelete(order.id, order.label)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
            {orders.length === 0 && <p style={{ textAlign: 'center', color: colors.textMuted, marginTop: '40px' }}>Nenhuma venda registrada nesta data.</p>}
          </div>
        )}
      </main>

      {selectedOrder && (
        <OrderDetailsModal 
          orderId={selectedOrder.id}
          label={selectedOrder.label}
          onClose={() => setSelectedOrder(null)}
          onUpdate={initVendas}
        />
      )}
    </div>
  )
}