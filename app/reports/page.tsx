'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { colors, globalStyles } from '../styles/theme'
// Importamos o Header centralizado
import { Header } from '../components/Header'
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts'

// --- TIPOS ---
type FinancialStats = {
  total: number
  dinheiro: number
  fiado: number
  digital: number
  ticket_medio: number
}

type TopProduct = { name: string; quantity: number }
type TopCategory = { category: string; total: number }

export default function ReportsPage() {
  const router = useRouter()
  
  // Data de hoje no formato YYYY-MM-DD
  const getToday = () => new Date().toLocaleDateString('sv-SE')
  
  const [startDate, setStartDate] = useState(getToday())
  const [endDate, setEndDate] = useState(getToday())
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('hoje') // Para marcar o botão ativo
  const [myOrgId, setMyOrgId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null) // Para o Header

  const [stats, setStats] = useState<FinancialStats>({ total: 0, dinheiro: 0, fiado: 0, digital: 0, ticket_medio: 0 })
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [topCategories, setTopCategories] = useState<TopCategory[]>([])
  const [paymentDistribution, setPaymentDistribution] = useState<any[]>([])
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({})

  useEffect(() => {
    checkAdminAndFetch()
  }, [startDate, endDate])

  // Lógica dos Filtros Rápidos
  const handlePreset = (period: string) => {
    const end = new Date()
    const start = new Date()
    setActiveFilter(period)

    switch (period) {
      case 'hoje':
        // Start e End são hoje
        break;
      case 'ontem':
        start.setDate(start.getDate() - 1)
        end.setDate(end.getDate() - 1)
        break;
      case '7dias':
        start.setDate(start.getDate() - 7)
        break;
      case 'mes':
        start.setMonth(start.getMonth() - 1)
        break;
      case '6meses':
        start.setMonth(start.getMonth() - 6)
        break;
      case 'ano':
        start.setFullYear(start.getFullYear() - 1)
        break;
      default:
        break;
    }

    setStartDate(start.toLocaleDateString('sv-SE'))
    setEndDate(end.toLocaleDateString('sv-SE'))
  }

  const checkAdminAndFetch = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, org_id')
      .eq('id', session.user.id)
      .single()
    
    if (profile?.role !== 'admin') {
      alert('Acesso restrito à gerência.')
      router.push('/')
      return
    }

    if (!profile.org_id) {
      router.push('/setup')
      return
    }

    setMyOrgId(profile.org_id)
    setUserRole(profile.role) // Define o papel para o Header

    // Cores das categorias
    const { data: catSettings } = await supabase
      .from('categories')
      .select('name, color')
      .eq('org_id', profile.org_id)
    
    if (catSettings) {
      const colorMap = catSettings.reduce((acc, cat) => ({ ...acc, [cat.name]: cat.color }), {})
      setCategoryColors(colorMap)
    }

    // Busca de Dados (RPCs)
    const [financeRes, prodsRes, catsRes] = await Promise.all([
      supabase.rpc('get_period_stats', { start_date: startDate, end_date: endDate, p_org_id: profile.org_id }),
      supabase.rpc('get_top_products', { start_date: startDate, end_date: endDate, p_org_id: profile.org_id }),
      supabase.rpc('get_top_categories', { start_date: startDate, end_date: endDate, p_org_id: profile.org_id })
    ])

    if (financeRes.data) {
      const f = financeRes.data as FinancialStats
      setStats(f)
      setPaymentDistribution([
        { name: 'Dinheiro', value: f.dinheiro, color: '#22c55e' }, // Verde
        { name: 'Digital', value: f.digital, color: '#3b82f6' },  // Azul
        { name: 'Fiado', value: f.fiado, color: '#f97316' }       // Laranja
      ].filter(d => d.value > 0))
    }

    if (prodsRes.data) setTopProducts(prodsRes.data as TopProduct[])
    if (catsRes.data) setTopCategories(catsRes.data as TopCategory[])

    setLoading(false)
  }

  // Componente de Tooltip Personalizado para os Gráficos
  const CustomTooltip = ({ active, payload, totalValue, isCurrency = true }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const percent = totalValue > 0 ? ((data.value / totalValue) * 100).toFixed(1) : 0
      return (
        <div style={{ backgroundColor: 'white', padding: '15px', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}>
          <p style={{ margin: '0 0 5px', fontWeight: 700, color: data.payload.fill || colors.primary, fontSize: '0.9rem', textTransform: 'uppercase' }}>
            {data.name || data.payload.category || data.payload.name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '1rem', color: '#1e293b', fontWeight: 600 }}>
              {isCurrency ? `R$ ${Number(data.value).toFixed(2)}` : `${data.value} un.`}
            </span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>
              {percent}%
            </span>
          </div>
        </div>
      )
    }
    return null
  }

  // Estilos Padronizados
  const filterBtnStyle = (isActive: boolean) => ({
    padding: '8px 16px', borderRadius: '8px', 
    border: isActive ? `1px solid ${colors.primary}` : '1px solid #e2e8f0', 
    background: isActive ? '#eff6ff' : 'white', 
    color: isActive ? colors.primary : '#64748b',
    cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
    transition: 'all 0.2s', boxShadow: isActive ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none'
  })

  const kpiCardStyle = { 
    background: 'white', padding: '25px', borderRadius: '16px', 
    border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
    display: 'flex', flexDirection: 'column' as 'column', justifyContent: 'space-between'
  }

  if (loading) return null

  const totalCategoryVal = topCategories.reduce((acc, curr) => acc + curr.total, 0)
  const totalProductsQty = topProducts.reduce((acc, curr) => acc + curr.quantity, 0)

  return (
    <div style={{ ...globalStyles.container, justifyContent: 'flex-start', background: '#f8fafc' }}>
      
      {/* HEADER CENTRALIZADO E RESPONSIVO */}
      <Header userRole={userRole} subtitle="DASHBOARD / INTELIGÊNCIA" />

      <main style={{ width: '100%', maxWidth: '1200px', padding: '30px 20px', flex: 1 }}>
        
        {/* BARRA DE FILTROS */}
        <div style={{ 
          marginBottom: '30px', background: 'white', padding: '20px', borderRadius: '16px', 
          border: `1px solid ${colors.border}`, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontSize: '0.9rem', margin: '0 0 10px', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Período de Análise</h2>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => handlePreset('hoje')} style={filterBtnStyle(activeFilter === 'hoje')}>Hoje</button>
              <button onClick={() => handlePreset('ontem')} style={filterBtnStyle(activeFilter === 'ontem')}>Ontem</button>
              <button onClick={() => handlePreset('7dias')} style={filterBtnStyle(activeFilter === '7dias')}>7 Dias</button>
              <button onClick={() => handlePreset('mes')} style={filterBtnStyle(activeFilter === 'mes')}>Mês Atual</button>
              <button onClick={() => handlePreset('6meses')} style={filterBtnStyle(activeFilter === '6meses')}>6 Meses</button>
              <button onClick={() => handlePreset('ano')} style={filterBtnStyle(activeFilter === 'ano')}>1 Ano</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '1.2rem' }}>📅</span>
            <input 
              type="date" 
              value={startDate} 
              onChange={e => { setStartDate(e.target.value); setActiveFilter('custom'); }} 
              style={{ background: 'transparent', border: 'none', fontWeight: 'bold', color: colors.text, outline: 'none', fontFamily: 'inherit' }} 
            />
            <span style={{ color: colors.textMuted, fontSize: '0.8rem' }}>até</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => { setEndDate(e.target.value); setActiveFilter('custom'); }} 
              style={{ background: 'transparent', border: 'none', fontWeight: 'bold', color: colors.text, outline: 'none', fontFamily: 'inherit' }} 
            />
          </div>
        </div>

        {/* CARDS DE KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          {/* Card Principal - Total */}
          <div style={{ ...kpiCardStyle, backgroundColor: colors.primary, color: 'white', border: 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <span style={{ opacity: 0.8, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px' }}>FATURAMENTO TOTAL</span>
              <span style={{ fontSize: '1.5rem' }}>💰</span>
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 800, marginTop: '10px' }}>R$ {stats.total.toFixed(2)}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '5px' }}>
               {activeFilter === 'hoje' ? 'Vendas de hoje' : 'No período selecionado'}
            </div>
          </div>

          <div style={kpiCardStyle}>
            <span style={{ color: colors.textMuted, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px' }}>TICKET MÉDIO</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: colors.text }}>R$ {stats.ticket_medio.toFixed(2)}</div>
            <div style={{ height: '4px', width: '100%', background: '#f1f5f9', borderRadius: '2px', marginTop: '10px' }}>
               <div style={{ height: '100%', width: '60%', background: colors.primary, borderRadius: '2px' }}></div>
            </div>
          </div>

          <div style={kpiCardStyle}>
            <span style={{ color: colors.textMuted, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px' }}>DINHEIRO (CAIXA)</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a' }}>R$ {stats.dinheiro.toFixed(2)}</div>
            <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600 }}>Liquidez Imediata</span>
          </div>

          <div style={kpiCardStyle}>
            <span style={{ color: colors.textMuted, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1px' }}>A RECEBER (FIADO)</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f97316' }}>R$ {stats.fiado.toFixed(2)}</div>
            <span style={{ fontSize: '0.8rem', color: '#f97316', fontWeight: 600 }}>Pendente de Pagamento</span>
          </div>
        </div>

        {/* ÁREA DE GRÁFICOS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
          
          {/* Top Produtos */}
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1rem', color: colors.text, fontWeight: 800, textTransform: 'uppercase' }}>🏆 Top 5 Produtos Mais Vendidos</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={topProducts} margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip totalValue={totalProductsQty} isCurrency={false} />} cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="quantity" fill={colors.primary} radius={[0, 6, 6, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Vendas por Categoria */}
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1rem', color: colors.text, fontWeight: 800, textTransform: 'uppercase' }}>🍕 Mix de Categorias</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={topCategories} innerRadius={65} outerRadius={85} paddingAngle={4} dataKey="total" nameKey="category">
                    {topCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={categoryColors[entry.category] || '#94a3b8'} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip totalValue={totalCategoryVal} isCurrency={true} />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Meios de Pagamento */}
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1rem', color: colors.text, fontWeight: 800, textTransform: 'uppercase' }}>💳 Distribuição de Pagamentos</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentDistribution} cx="50%" cy="50%" innerRadius={0} outerRadius={85} dataKey="value" stroke="white" strokeWidth={2}>
                    {paymentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip totalValue={stats.total} isCurrency={true} />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}