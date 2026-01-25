'use client'
import { useEffect, useState, FormEvent } from 'react'
import { supabase } from './lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { colors, globalStyles } from './styles/theme'
import { BrandLogo } from './components/BrandLogo'
import { OrderDetailsModal } from './components/OrderDetailsModal'

type Order = {
  id: string
  label: string
  status: 'aberta' | 'pagamento' | 'concluida' | 'cancelada'
  total: number
  org_id: string
}

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [myOrgId, setMyOrgId] = useState<string | null>(null)
  
  // Modais
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  
  // Estado Nova Mesa
  const [newLabel, setNewLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    checkSessionAndFetch()
  }, [])

  const checkSessionAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    
    // Busca perfil completo para garantir isolamento de Org
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, org_id')
      .eq('id', session.user.id)
      .single()
    
    if (profile) {
      setUserRole(profile.role)
      setMyOrgId(profile.org_id)

      // Redirecionamento de segurança caso a Org não exista
      if (!profile.org_id) {
        router.push('/setup')
        return
      }

      // Busca ordens filtrando pela Org do usuário
      await fetchOrders(profile.org_id)
    }

    setLoading(false)
  }

  const fetchOrders = async (orgId?: string) => {
    const targetOrgId = orgId || myOrgId
    if (!targetOrgId) return

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('org_id', targetOrgId) // Filtro crucial de isolamento
      .in('status', ['aberta', 'pagamento'])
      .order('created_at', { ascending: true })
    
    if (error) console.error('Erro ao buscar comandas:', error)
    else setOrders(data || [])
  }

  const handleDeleteOrder = async (e: React.MouseEvent, id: string, label: string, total: number) => {
    e.stopPropagation() 
    if (total > 0) {
        const confirm = window.confirm(`Mesa "${label}" tem consumo de R$ ${total.toFixed(2)}. Excluir mesmo assim?`)
        if (!confirm) return
    }
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (!error) setOrders(current => current.filter(order => order.id !== id))
  }

  const handleCreateOrder = async (e: FormEvent) => {
    e.preventDefault()
    if (!newLabel.trim() || !myOrgId) return
    setCreating(true)

    const labelFinal = newLabel.trim().toLowerCase()
    const exists = orders.find(o => o.label.toLowerCase() === labelFinal)
    
    if (exists) {
      setFeedback(`A mesa "${labelFinal}" já está aberta!`)
      setCreating(false)
      return
    }

    // Insere com o org_id do dono logado
    const { error } = await supabase.from('orders').insert([{ 
      label: labelFinal, 
      status: 'aberta',
      org_id: myOrgId 
    }])

    if (!error) {
      setIsCreateModalOpen(false)
      setNewLabel('')
      fetchOrders()
    } else {
      setFeedback('Erro ao abrir mesa.')
    }
    
    setCreating(false)
  }

  if (loading) return null

  const navButtonStyle = {
    background: 'white', border: `1px solid ${colors.border}`, borderRadius: '6px',
    padding: '8px 16px', color: colors.text, fontSize: '0.85rem', fontWeight: 600,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
  }

  return (
    <div style={{ ...globalStyles.container, justifyContent: 'flex-start', background: '#f8fafc' }}>
      
      {/* NAVBAR PADRONIZADA */}
      <header style={{
        width: '100%', backgroundColor: 'white', borderBottom: `1px solid ${colors.border}`,
        padding: '0 20px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <BrandLogo size={36} color={colors.primary} />
          <div style={{ lineHeight: 1 }}>
            <span style={{ fontWeight: 800, color: colors.primary, display: 'block' }}>KOMANDA</span>
            <span style={{ fontSize: '0.65rem', color: colors.textMuted, textTransform: 'uppercase' }}>Dashboard</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {userRole === 'admin' && (
            <>
              <button onClick={() => { router.push('/reports'); router.refresh(); }} style={navButtonStyle}>📈 Relatórios</button>
              <button onClick={() => { router.push('/products'); router.refresh(); }} style={navButtonStyle}>🍔 Menu</button>
              <button onClick={() => { router.push('/squad'); router.refresh(); }} style={navButtonStyle}>👥 Squad</button>
            </>
          )}

          <button 
            onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            style={{ backgroundColor: colors.errorBg, color: colors.errorText, border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
          >
            Sair
          </button>
        </div>
      </header>

      <main style={{ width: '100%', maxWidth: '1200px', padding: '30px 20px', flex: 1 }}>
        <div style={{ marginBottom: '25px' }}>
            <h2 style={{ fontSize: '1.5rem', color: colors.text, margin: 0 }}>Vendas em Aberto</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
          <div onClick={() => { setFeedback(''); setIsCreateModalOpen(true); }} style={{ height: '140px', border: `2px dashed ${colors.border}`, borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: colors.textMuted }}>
            <span style={{ fontSize: '3rem', lineHeight: 1, fontWeight: 300 }}>+</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Nova Mesa</span>
          </div>

          {orders.map((order) => (
            <div 
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                style={{
                  backgroundColor: order.status === 'pagamento' ? '#fffbeb' : 'white',
                  border: `2px solid ${order.status === 'pagamento' ? '#d97706' : colors.border}`,
                  borderRadius: '12px', padding: '15px', cursor: 'pointer', height: '140px',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: colors.text, textTransform: 'capitalize' }}>{order.label}</span>
                  <div onClick={(e) => handleDeleteOrder(e, order.id, order.label, order.total)} style={{ color: '#ef4444', opacity: 0.6 }}>
                    🗑️
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                   <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: colors.primary }}>
                     R$ {order.total.toFixed(2)}
                   </span>
                </div>

                <div style={{ borderTop: `1px solid ${colors.border}40`, paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase' }}>{order.status}</span>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                </div>
            </div>
          ))}
        </div>
      </main>

      {selectedOrder && (
        <OrderDetailsModal 
          orderId={selectedOrder.id}
          label={selectedOrder.label}
          onClose={() => setSelectedOrder(null)}
          onUpdate={fetchOrders}
        />
      )}

      {isCreateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ ...globalStyles.card, width: '90%', maxWidth: '350px', padding: '30px' }}>
            <h3 style={{ margin: '0 0 20px', color: colors.text, textAlign: 'center' }}>Abrir Mesa</h3>
            <form onSubmit={handleCreateOrder}>
              <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Ex: 05, Balcão..." style={{ ...globalStyles.input, fontSize: '1.2rem', textAlign: 'center' }} />
              {feedback && <p style={{ color: colors.errorText, fontSize: '0.85rem', textAlign: 'center', marginTop: '10px' }}>{feedback}</p>}
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setIsCreateModalOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc', background: 'none' }}>Sair</button>
                <button type="submit" disabled={creating} style={{ ...globalStyles.buttonPrimary, flex: 1, marginTop: 0 }}>ABRIR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}