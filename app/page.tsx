'use client'
import { useEffect, useState, FormEvent } from 'react'
import { supabase } from './lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { colors, globalStyles } from './styles/theme'
// IMPORTAMOS O HEADER CENTRALIZADO
import { Header } from './components/Header'
import { OrderDetailsModal } from './components/OrderDetailsModal'

// ... (Mantenha os types Order aqui ou num arquivo types.ts) ...
type Order = {
  id: string; label: string; status: 'aberta' | 'pagamento' | 'concluida' | 'cancelada'; total: number; org_id: string;
}

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  const [userRole, setUserRole] = useState<string | null>(null)
  const [myOrgId, setMyOrgId] = useState<string | null>(null)
  
  // Estados de Interface
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => { checkSessionAndFetch() }, [])

  const checkSessionAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    
    const { data: profile } = await supabase.from('profiles').select('role, org_id').eq('id', session.user.id).single()
    
    if (profile) {
      setUserRole(profile.role)
      setMyOrgId(profile.org_id)
      if (!profile.org_id) { router.push('/setup'); return }
      await fetchOrders(profile.org_id)
    }
    setLoading(false)
  }

  // ... (Mantenha fetchOrders, handleDeleteOrder e handleCreateOrder iguais) ...
  const fetchOrders = async (orgId?: string) => {
    const targetOrgId = orgId || myOrgId
    if (!targetOrgId) return
    const { data, error } = await supabase.from('orders').select('*').eq('org_id', targetOrgId).in('status', ['aberta', 'pagamento']).order('created_at', { ascending: true })
    if (!error) setOrders(data || [])
  }

  const handleDeleteOrder = async (e: React.MouseEvent, id: string, label: string, total: number) => {
    e.stopPropagation() 
    if (total > 0) { if (!window.confirm(`Mesa "${label}" tem consumo de R$ ${total.toFixed(2)}. Excluir mesmo assim?`)) return }
    const { error } = await supabase.from('orders').delete().eq('id', id)
    if (!error) setOrders(current => current.filter(order => order.id !== id))
  }

  const handleCreateOrder = async (e: FormEvent) => {
    e.preventDefault()
    if (!newLabel.trim() || !myOrgId) return
    setCreating(true)
    const labelFinal = newLabel.trim().toLowerCase()
    const exists = orders.find(o => o.label.toLowerCase() === labelFinal)
    if (exists) { setFeedback(`Mesa "${labelFinal}" já existe!`); setCreating(false); return }
    const { error } = await supabase.from('orders').insert([{ label: labelFinal, status: 'aberta', org_id: myOrgId }])
    if (!error) { setIsCreateModalOpen(false); setNewLabel(''); fetchOrders(myOrgId); }
    setCreating(false)
  }

  if (loading) return null

  return (
    <div style={{ ...globalStyles.container, justifyContent: 'flex-start', background: '#f8fafc' }}>
      
      {/* HEADER CENTRALIZADO: Só muda o subtitle se quiser */}
      <Header userRole={userRole} subtitle="OPERAÇÃO" />

      <main style={{ width: '100%', maxWidth: '1200px', padding: '20px', flex: 1 }}>
        <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.4rem', color: colors.text, margin: 0, fontWeight: 800 }}>Vendas em Aberto</h2>
            <span style={{ fontSize: '0.85rem', color: colors.textMuted, fontWeight: 600 }}>{new Date().toLocaleDateString('pt-BR')}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
          {/* Card Nova Mesa */}
          <div onClick={() => { setFeedback(''); setIsCreateModalOpen(true); }} style={{ height: '130px', border: `2px dashed ${colors.border}`, borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: colors.textMuted, background: 'white', transition: 'all 0.2s' }}>
            <span style={{ fontSize: '2.5rem', lineHeight: 1, fontWeight: 300 }}>+</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Nova Mesa</span>
          </div>

          {/* Cards de Mesas */}
          {orders.map((order) => (
            <div key={order.id} onClick={() => setSelectedOrder(order)}
                style={{
                  backgroundColor: order.status === 'pagamento' ? '#fffbeb' : 'white',
                  border: `2px solid ${order.status === 'pagamento' ? '#f59e0b' : colors.border}`,
                  borderRadius: '16px', padding: '15px', cursor: 'pointer', height: '130px',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative', transition: 'transform 0.1s'
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: colors.text, textTransform: 'capitalize' }}>{order.label}</span>
                  <div onClick={(e) => handleDeleteOrder(e, order.id, order.label, order.total)} style={{ color: '#ef4444', opacity: 0.5, fontSize: '1.1rem', padding: '5px' }}>🗑️</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                   <span style={{ fontSize: '1.3rem', fontWeight: 900, color: colors.primary }}>R$ {order.total.toFixed(2)}</span>
                </div>
                <div style={{ borderTop: `1px solid ${colors.border}50`, paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{order.status}</span>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: order.status === 'pagamento' ? '#f59e0b' : '#22c55e', boxShadow: order.status === 'pagamento' ? '0 0 0 2px #fcd34d' : '0 0 0 2px #86efac' }} />
                </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modais (reutilizados) */}
      {selectedOrder && <OrderDetailsModal orderId={selectedOrder.id} label={selectedOrder.label} onClose={() => setSelectedOrder(null)} onUpdate={() => fetchOrders(myOrgId!)} />}
      
      {isCreateModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div style={{ ...globalStyles.card, width: '85%', maxWidth: '320px', padding: '30px', borderRadius: '20px' }}>
            <h3 style={{ margin: '0 0 25px', color: colors.primary, textAlign: 'center', fontWeight: 800, fontSize: '1.5rem' }}>Abrir Mesa</h3>
            <form onSubmit={handleCreateOrder}>
              <input autoFocus value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Ex: Mesa 10..." style={{ ...globalStyles.input, fontSize: '1.2rem', textAlign: 'center', padding: '15px', borderRadius: '12px', border: `2px solid ${colors.border}`, fontWeight: 700 }} />
              {feedback && <p style={{ color: colors.errorText, fontSize: '0.85rem', textAlign: 'center', marginTop: '15px', fontWeight: 600 }}>{feedback}</p>}
              <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
                <button type="button" onClick={() => setIsCreateModalOpen(false)} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: `2px solid ${colors.border}`, background: 'white', fontWeight: 700, color: colors.textMuted }}>Cancelar</button>
                <button type="submit" disabled={creating} style={{ ...globalStyles.buttonPrimary, flex: 1, marginTop: 0, padding: '15px', borderRadius: '12px', fontSize: '1rem' }}>ABRIR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}