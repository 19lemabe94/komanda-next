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

export default function VendasPage() {
  const router = useRouter()
  const today = new Date().toLocaleDateString('sv-SE')
  
  const [orders, setOrders] = useState<ClosedOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState(today)
  const [selectedOrder, setSelectedOrder] = useState<{id: string, label: string} | null>(null)

  useEffect(() => {
    initFetch()
  }, [dateFilter])

  const initFetch = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', session.user.id)
      .single()

    if (profile?.org_id) {
      const startOfDay = `${dateFilter}T00:00:00.000Z`
      const endOfDay = `${dateFilter}T23:59:59.999Z`

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('org_id', profile.org_id)
        .neq('status', 'aberta')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .order('created_at', { ascending: false })

      if (!error) setOrders(data || [])
    }
    setLoading(false)
  }

  // FUNÇÃO PARA EXCLUIR VENDA
  const handleDelete = async (e: React.MouseEvent, id: string, label: string) => {
    e.stopPropagation() // Impede de abrir o modal ao clicar no botão de excluir
    
    if (!confirm(`⚠️ Atenção: Deseja realmente excluir permanentemente a venda da mesa "${label}"? Esta ação não pode ser desfeita.`)) {
      return
    }

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id)

    if (error) {
      alert("Erro ao excluir: " + error.message)
    } else {
      // Remove da lista localmente para dar feedback instantâneo
      setOrders(prev => prev.filter(o => o.id !== id))
    }
  }

  const totalGeral = orders.reduce((acc, curr) => acc + (curr.status === 'concluida' ? curr.total : 0), 0)

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
            <span style={{ fontSize: '0.65rem', color: colors.textMuted, textTransform: 'uppercase' }}>Histórico de Vendas</span>
          </div>
        </div>
        <button onClick={() => router.push('/')} style={navBtn}>🏠 Início</button>
      </header>

      <main style={{ width: '100%', maxWidth: '800px', padding: '30px 20px' }}>
        
        <div style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          marginBottom: '25px', backgroundColor: 'white', padding: '20px', 
          borderRadius: '12px', border: `1px solid ${colors.border}`,
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
        }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: colors.textMuted, display: 'block', marginBottom: '5px' }}>DATA</label>
            <input 
              type="date" 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', border: `1px solid ${colors.border}`, fontWeight: 'bold' }}
            />
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: colors.textMuted }}>TOTAL DO DIA</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: colors.primary }}>R$ {totalGeral.toFixed(2)}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: colors.textMuted }}>Sincronizando...</p>
          ) : (
            orders.map(order => (
              <div 
                key={order.id} 
                onClick={() => setSelectedOrder({ id: order.id, label: order.label })}
                style={{ 
                  backgroundColor: 'white', padding: '15px 20px', borderRadius: '12px', cursor: 'pointer',
                  border: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: colors.text }}>
                    Mesa {order.label}
                    <span style={{ 
                      marginLeft: '10px', fontSize: '0.65rem', padding: '3px 8px', borderRadius: '4px',
                      backgroundColor: order.status === 'concluida' ? '#dcfce7' : '#fffbeb',
                      color: order.status === 'concluida' ? '#166534' : '#b45309'
                    }}>
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: colors.textMuted, marginTop: '4px' }}>
                    {new Date(order.created_at).toLocaleTimeString('pt-BR')} • {order.payment_method?.toUpperCase() || 'S/ INFO'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: colors.primary }}>
                    R$ {order.total.toFixed(2)}
                  </div>
                  
                  {/* BOTÃO DE EXCLUIR */}
                  <button 
                    onClick={(e) => handleDelete(e, order.id, order.label)}
                    style={{ 
                      background: 'none', border: 'none', cursor: 'pointer', 
                      fontSize: '1.2rem', padding: '8px', color: '#ef4444',
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.2s'
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

      {selectedOrder && (
        <OrderDetailsModal 
          orderId={selectedOrder.id}
          label={selectedOrder.label}
          onClose={() => setSelectedOrder(null)}
          onUpdate={initFetch}
        />
      )}
    </div>
  )
}