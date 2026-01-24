'use client'
import { useEffect, useState, FormEvent } from 'react'
import { supabase } from './lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { colors, globalStyles } from './styles/theme'
import { BrandLogo } from './components/BrandLogo'
import { OrderDetailsModal } from './components/OrderDetailsModal'

// Tipo alinhado com o banco de dados
type Order = {
  id: string
  label: string
  status: 'aberta' | 'pagamento' | 'concluida' | 'cancelada'
  total: number
}

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])
  
  // Controle do Modal de Detalhes (Pai e Filho)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  // Controle do Modal de Nova Mesa
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [feedback, setFeedback] = useState('')

  // Dados do Usuário
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    checkSessionAndFetch()
  }, [])

  const checkSessionAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }
    
    // Busca cargo do usuário (admin ou funcionario)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
    if (profile) setUserRole(profile.role)

    await fetchOrders()
    setLoading(false)
  }

  const fetchOrders = async () => {
    // Busca apenas as ativas (aberta ou pagamento)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .in('status', ['aberta', 'pagamento'])
      .order('created_at', { ascending: true })
    
    if (error) console.error('Erro ao buscar comandas:', error)
    else setOrders(data || [])
  }

  // --- ABRIR DETALHES DA MESA ---
  const handleOpenOrder = (order: Order) => {
    setSelectedOrder(order)
  }

  // --- LÓGICA DE EXCLUSÃO (HARD DELETE) ---
  const handleDeleteOrder = async (e: React.MouseEvent, id: string, label: string, total: number) => {
    e.stopPropagation() // Impede que abra o modal de detalhes ao clicar na lixeira

    // REGRA: Só pede confirmação se tiver consumo (> 0)
    if (total > 0) {
        const confirm = window.confirm(`ATENÇÃO: A mesa "${label}" tem R$ ${total.toFixed(2)} em consumo.\nDeseja realmente excluir e perder estes dados?`)
        if (!confirm) return
    }

    // Apaga do banco de dados
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Erro ao excluir: ' + error.message)
    } else {
      // Remove da tela instantaneamente
      setOrders(current => current.filter(order => order.id !== id))
    }
  }

  // --- NOVA MESA ---
  const openNewOrderModal = () => {
    setFeedback('')
    // Lógica inteligente para sugerir o próximo número
    const numbers = orders.map(o => parseInt(o.label)).filter(n => !isNaN(n))
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1
    setNewLabel(nextNum.toString())
    setIsCreateModalOpen(true)
    setTimeout(() => document.getElementById('newOrderInput')?.focus(), 100)
  }

  const handleCreateOrder = async (e: FormEvent) => {
    e.preventDefault()
    if (!newLabel.trim()) return

    setCreating(true)
    const labelFinal = newLabel.trim().toLowerCase()

    // Verifica duplicidade localmente (UX rápida)
    const exists = orders.find(o => o.label.toLowerCase() === labelFinal)
    if (exists) {
      setFeedback(`A mesa "${labelFinal}" já está aberta!`)
      setCreating(false)
      return
    }

    const { error } = await supabase
      .from('orders')
      .insert([{ 
        label: labelFinal, 
        status: 'aberta',
        usuario_abertura: (await supabase.auth.getUser()).data.user?.id
      }])

    if (error) {
      setFeedback('Erro ao criar: ' + error.message)
    } else {
      setIsCreateModalOpen(false)
      fetchOrders()
    }
    setCreating(false)
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pagamento': return { bg: '#fffbeb', border: '#d97706', text: '#b45309' }
      default: return { bg: 'white', border: colors.border, text: colors.primary }
    }
  }

  if (loading) return null

  return (
    <div style={{ ...globalStyles.container, justifyContent: 'flex-start', background: '#f8fafc' }}>
      
      {/* NAVBAR */}
      <header style={{
        width: '100%', backgroundColor: 'white', borderBottom: `1px solid ${colors.border}`,
        padding: '0 20px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        {/* Logo e Título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <BrandLogo size={36} color={colors.primary} />
          <div style={{ lineHeight: 1 }}>
            <span style={{ fontWeight: 800, color: colors.primary, display: 'block' }}>KOMANDA</span>
            <span style={{ fontSize: '0.65rem', color: colors.textMuted, textTransform: 'uppercase' }}>Dashboard</span>
          </div>
        </div>

        {/* Botões de Navegação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {/* Botão RELATÓRIOS */}
          <button 
            onClick={() => router.push('/reports')}
            style={{
              background: 'white', border: `1px solid ${colors.border}`, borderRadius: '6px',
              padding: '8px 16px', color: colors.text, fontSize: '0.85rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            📈 Relatórios
          </button>

          {/* Botão CARDÁPIO */}
          <button 
            onClick={() => router.push('/products')}
            style={{
              background: 'white', border: `1px solid ${colors.border}`, borderRadius: '6px',
              padding: '8px 16px', color: colors.text, fontSize: '0.85rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            🍔 Cardápio
          </button>

          {/* Botão EQUIPE (Apenas Admin) */}
          {userRole === 'admin' && (
            <button 
              onClick={() => router.push('/squad')}
              style={{
                background: 'white', border: `1px solid ${colors.border}`, borderRadius: '6px',
                padding: '8px 16px', color: colors.text, fontSize: '0.85rem', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              👥 Equipe
            </button>
          )}

          {/* Botão SAIR */}
          <button 
            onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            style={{
              backgroundColor: colors.errorBg, color: colors.errorText, border: 'none',
              padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
              fontSize: '0.85rem', marginLeft: '8px'
            }}
          >
            Sair
          </button>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main style={{ width: '100%', maxWidth: '1200px', padding: '30px 20px', flex: 1 }}>
        
        <div style={{ marginBottom: '25px' }}>
            <h2 style={{ fontSize: '1.5rem', color: colors.text, margin: 0 }}>Comandas Ativas</h2>
            <p style={{ margin: '5px 0 0', color: colors.textMuted, fontSize: '0.9rem' }}>
              Selecione uma mesa para adicionar pedidos
            </p>
        </div>

        {/* GRID DINÂMICO */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
          gap: '20px' 
        }}>
          
          {/* BOTÃO + NOVA MESA */}
          <div 
            onClick={openNewOrderModal}
            style={{
              height: '140px',
              border: `2px dashed ${colors.border}`, borderRadius: '12px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.5)',
              transition: 'all 0.2s', color: colors.textMuted
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = colors.primary; e.currentTarget.style.color = colors.primary }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = colors.border; e.currentTarget.style.color = colors.textMuted }}
          >
            <span style={{ fontSize: '3rem', lineHeight: 1, fontWeight: 300 }}>+</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Nova Mesa</span>
          </div>

          {/* CARDS DAS MESAS */}
          {orders.map((order) => {
            const style = getStatusStyle(order.status)
            return (
              <div 
                key={order.id}
                onClick={() => handleOpenOrder(order)} // <--- CLIQUE ABRE O MODAL GRANDE
                style={{
                  backgroundColor: style.bg,
                  border: `2px solid ${style.border}`,
                  borderRadius: '12px', padding: '15px',
                  cursor: 'pointer', height: '140px',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                  position: 'relative',
                  transition: 'transform 0.1s'
                }}
              >
                
                {/* CABEÇALHO: Nome + Lixeira */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ 
                    fontSize: '1.1rem', fontWeight: 800, color: colors.text, 
                    textTransform: 'capitalize', wordBreak: 'break-word', lineHeight: 1.2
                  }}>
                    {order.label}
                  </span>

                  {/* ÍCONE DE EXCLUSÃO */}
                  <div 
                    onClick={(e) => handleDeleteOrder(e, order.id, order.label, order.total)}
                    title="Excluir Mesa"
                    style={{
                        padding: '6px', marginTop: '-6px', marginRight: '-6px',
                        cursor: 'pointer', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#ef4444', opacity: 0.6, transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.backgroundColor = '#fee2e2' }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </div>
                </div>

                {/* Valor Total */}
                <div style={{ textAlign: 'right' }}>
                   <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: style.text }}>
                     R$ {order.total.toFixed(2)}
                   </span>
                </div>

                {/* Rodapé Status */}
                <div style={{ 
                  borderTop: `1px solid ${colors.border}40`, paddingTop: '8px', 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ 
                    fontSize: '0.75rem', fontWeight: 700, 
                    color: order.status === 'pagamento' ? '#d97706' : colors.textMuted,
                    textTransform: 'uppercase'
                  }}>
                    {order.status}
                  </span>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: order.status === 'pagamento' ? '#d97706' : '#22c55e' }} />
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* MODAL 1: DETALHES DA COMANDA (PDV) */}
      {selectedOrder && (
        <OrderDetailsModal 
          orderId={selectedOrder.id}
          label={selectedOrder.label}
          onClose={() => setSelectedOrder(null)}
          onUpdate={fetchOrders} // Atualiza o dashboard ao fechar/alterar
        />
      )}

      {/* MODAL 2: CRIAR NOVA MESA */}
      {isCreateModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ ...globalStyles.card, width: '90%', maxWidth: '350px', padding: '30px' }}>
            <h3 style={{ margin: '0 0 20px', color: colors.text, textAlign: 'center' }}>Abrir Nova Comanda</h3>
            
            <form onSubmit={handleCreateOrder}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: colors.textMuted }}>
                  Identificação (Mesa ou Nome)
                </label>
                <input
                  id="newOrderInput"
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Ex: 10, Balcão..."
                  style={{ ...globalStyles.input, fontSize: '1.2rem', textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}
                  autoComplete="off"
                />
                {feedback && <p style={{ color: colors.errorText, fontSize: '0.85rem', margin: 0, textAlign: 'center' }}>{feedback}</p>}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', border: `1px solid ${colors.border}`, background: 'transparent', cursor: 'pointer', color: colors.text }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={creating}
                  style={{ ...globalStyles.buttonPrimary, flex: 1, marginTop: 0, opacity: creating ? 0.7 : 1 }}
                >
                  {creating ? 'Abrindo...' : 'ABRIR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}