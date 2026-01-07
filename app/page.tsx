'use client'
import { useEffect, useState, FormEvent } from 'react'
import { supabase } from './lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { colors, globalStyles } from './styles/theme'
import { BrandLogo } from './components/BrandLogo'

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
  
  // Estados do Modal de Nova Mesa
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [feedback, setFeedback] = useState('') // Para erros (ex: mesa já existe)

  // Dados do Usuário
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')

  useEffect(() => {
    checkSessionAndFetch()
  }, [])

  // 1. Verifica sessão e busca dados iniciais
  const checkSessionAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      router.push('/login')
      return
    }

    setUserEmail(session.user.email || '')
    
    // Busca Role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
    if (profile) setUserRole(profile.role)

    // Busca Comandas Ativas
    await fetchOrders()
    setLoading(false)
  }

  // 2. Busca apenas mesas Abertas ou em Pagamento
  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .in('status', ['aberta', 'pagamento'])
      .order('created_at', { ascending: true })
    
    if (error) console.error('Erro ao buscar comandas:', error)
    else setOrders(data || [])
  }

  // 3. Lógica inteligente para sugerir nome da mesa
  const openNewOrderModal = () => {
    setFeedback('')
    // Tenta encontrar o próximo número disponível
    // Filtra apenas labels que são números
    const numbers = orders
      .map(o => parseInt(o.label))
      .filter(n => !isNaN(n))
    
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1
    setNewLabel(nextNum.toString())
    
    setIsModalOpen(true)
    // Pequeno hack para focar no input assim que o modal abre
    setTimeout(() => document.getElementById('newOrderInput')?.focus(), 100)
  }

  // 4. Cria a comanda no banco
  const handleCreateOrder = async (e: FormEvent) => {
    e.preventDefault()
    if (!newLabel.trim()) return

    setCreating(true)
    const labelFinal = newLabel.trim().toLowerCase() // Padroniza tudo minúsculo

    // Verifica duplicidade localmente antes de ir ao banco (UX mais rápida)
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
      setIsModalOpen(false)
      fetchOrders() // Atualiza a lista
    }
    setCreating(false)
  }

  // Helpers de Estilo
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pagamento': return { bg: '#fffbeb', border: '#d97706', text: '#b45309' } // Amarelo
      default: return { bg: 'white', border: colors.border, text: colors.primary } // Padrão
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <BrandLogo size={36} color={colors.primary} />
          <div style={{ lineHeight: 1 }}>
            <span style={{ fontWeight: 800, color: colors.primary, display: 'block' }}>KOMANDA</span>
            <span style={{ fontSize: '0.65rem', color: colors.textMuted, textTransform: 'uppercase' }}>Dashboard</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
          {userRole === 'admin' && (
            <button onClick={() => router.push('/squad')} style={{ border: `1px solid ${colors.border}`, background: 'white', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
              👥 Equipe
            </button>
          )}
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={{ backgroundColor: colors.errorBg, color: colors.errorText, border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
            Sair
          </button>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main style={{ width: '100%', maxWidth: '1200px', padding: '30px 20px', flex: 1 }}>
        
        <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', color: colors.text, margin: 0 }}>Comandas Ativas</h2>
            <p style={{ margin: '5px 0 0', color: colors.textMuted, fontSize: '0.9rem' }}>
              Gerencie as mesas e consumos em tempo real
            </p>
          </div>
        </div>

        {/* GRID DINÂMICO */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
          gap: '20px' 
        }}>
          
          {/* 1. CARD DE ADICIONAR (Sempre o primeiro) */}
          <div 
            onClick={openNewOrderModal}
            style={{
              height: '140px',
              border: `2px dashed ${colors.border}`,
              borderRadius: '12px',
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

          {/* 2. LISTA DE COMANDAS DO BANCO */}
          {orders.map((order) => {
            const style = getStatusStyle(order.status)
            return (
              <div 
                key={order.id}
                style={{
                  backgroundColor: style.bg,
                  border: `2px solid ${style.border}`,
                  borderRadius: '12px', padding: '15px',
                  cursor: 'pointer', height: '140px',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span style={{ 
                    fontSize: '1.1rem', fontWeight: 800, color: colors.text, 
                    textTransform: 'capitalize', // Deixa primeira letra maiúscula (arvore -> Arvore)
                    wordBreak: 'break-word', lineHeight: 1.2
                  }}>
                    {order.label}
                  </span>
                </div>

                <div style={{ textAlign: 'right' }}>
                   <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: style.text }}>
                     R$ {order.total.toFixed(2)}
                   </span>
                </div>

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
                  {/* Indicador visual simples */}
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: order.status === 'pagamento' ? '#d97706' : '#22c55e' }} />
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* MODAL CRIAR MESA */}
      {isModalOpen && (
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
                  placeholder="Ex: 10, Balcão, João..."
                  style={{ ...globalStyles.input, fontSize: '1.2rem', textAlign: 'center', fontWeight: 'bold', marginBottom: '10px' }}
                  autoComplete="off"
                />
                {feedback && <p style={{ color: colors.errorText, fontSize: '0.85rem', margin: 0, textAlign: 'center' }}>{feedback}</p>}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
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