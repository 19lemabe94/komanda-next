// Arquivo: app/dashboard/page.tsx
'use client'
import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient' // Ajuste o caminho dos imports se necessário (../ volta uma pasta)
import { useRouter } from 'next/navigation'
import { colors, globalStyles } from '../styles/theme'
import { Header } from '../components/Header'
import { OrderDetailsModal } from '../components/OrderDetailsModal'
import { VERSICULOS } from '../data/versiculos'

// --- ÍCONE SVG DA LIXEIRA ---
const IconTrash = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
)

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

  // Estados de Tempo e Versículo
  const [currentTime, setCurrentTime] = useState('')
  const [dailyVerse, setDailyVerse] = useState(VERSICULOS[0])

  useEffect(() => { 
    checkSessionAndFetch()
    
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    }, 1000)

    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24)
    setDailyVerse(VERSICULOS[dayOfYear % VERSICULOS.length])

    return () => clearInterval(timer)
  }, [])

  const checkSessionAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return } // Se não tiver sessão, manda pra Home (Login)
    
    const { data: profile } = await supabase.from('profiles').select('role, org_id').eq('id', session.user.id).single()
    
    if (profile) {
      setUserRole(profile.role)
      setMyOrgId(profile.org_id)
      if (!profile.org_id) { router.push('/setup'); return }
      await fetchOrders(profile.org_id)
    }
    setLoading(false)
  }

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
    setFeedback('')

    const labelFinal = newLabel.trim().toLowerCase()

    const exists = orders.find(o => o.label.toLowerCase() === labelFinal)
    if (exists) {
      setFeedback(`Mesa "${labelFinal}" já está aberta!`)
      setCreating(false)
      return
    }

    const { error } = await supabase.from('orders').insert([{ label: labelFinal, status: 'aberta', org_id: myOrgId }])

    if (error) {
      if (error.code === '23505') {
        setFeedback(`Nome "${labelFinal}" indisponível (já usada no histórico).`)
      } else {
        setFeedback('Erro ao criar mesa.')
      }
      setCreating(false)
      return
    }

    const { data: newOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('org_id', myOrgId)
      .eq('label', labelFinal)
      .eq('status', 'aberta')
      .single()

    setIsCreateModalOpen(false)
    setNewLabel('')
    setCreating(false)
    fetchOrders(myOrgId)

    if (newOrder) {
      setSelectedOrder(newOrder)
    }
  }

  if (loading) return null

  const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div style={{ ...globalStyles.container, justifyContent: 'flex-start', background: '#f8fafc' }}>
      
      <Header userRole={userRole} subtitle="OPERAÇÃO" />

      <main style={{ width: '100%', maxWidth: '1200px', padding: '20px', flex: 1 }}>
        
        {/* --- HEADER DO DASHBOARD --- */}
        <div style={{ 
          marginBottom: '25px', padding: '25px 20px', backgroundColor: 'white', borderRadius: '16px', 
          border: `1px solid ${colors.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
        }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: colors.primary, lineHeight: 1 }}>
              {currentTime || '--:--'}
            </div>
            
            <div style={{ fontSize: '0.9rem', color: colors.textMuted, textTransform: 'capitalize', marginBottom: '20px' }}>
              {dateStr}
            </div>

            <div style={{ backgroundColor: '#f8fafc', color: '#475569', padding: '12px 20px', borderRadius: '12px', border: `1px solid ${colors.border}`, maxWidth: '500px', width: '100%' }}>
              <p style={{ margin: 0, fontStyle: 'italic', fontWeight: 600, fontSize: '0.9rem', lineHeight: '1.4' }}>“{dailyVerse.text}”</p>
              <span style={{ display: 'block', fontSize: '0.7rem', marginTop: '6px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8' }}>{dailyVerse.ref}</span>
            </div>
        </div>

        {/* TÍTULO DA SEÇÃO */}
        <div style={{ marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', color: colors.text, margin: 0, fontWeight: 800 }}>Mesas Abertas</h2>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: colors.primary, backgroundColor: '#e0f2fe', padding: '4px 10px', borderRadius: '12px' }}>
               {orders.length} ativas
            </span>
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
                 <button
                   onClick={(e) => handleDeleteOrder(e, order.id, order.label, order.total)}
                   style={{ background: '#fee2e2', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', cursor: 'pointer' }}
                 >
                   <IconTrash />
                 </button>
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

      {/* Modais */}
      {selectedOrder && (
        <OrderDetailsModal 
          orderId={selectedOrder.id} 
          label={selectedOrder.label} 
          onClose={() => setSelectedOrder(null)} 
          onUpdate={() => fetchOrders(myOrgId!)} 
          userRole={userRole} 
        />
      )}
      
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