'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { colors, globalStyles } from '../styles/theme'
import { BrandLogo } from '../components/BrandLogo'
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
  
  const today = new Date().toLocaleDateString('sv-SE')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [loading, setLoading] = useState(true)
  const [myOrgId, setMyOrgId] = useState<string | null>(null)

  const [stats, setStats] = useState<FinancialStats>({ total: 0, dinheiro: 0, fiado: 0, digital: 0, ticket_medio: 0 })
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [topCategories, setTopCategories] = useState<TopCategory[]>([])
  const [paymentDistribution, setPaymentDistribution] = useState<any[]>([])
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({})

  useEffect(() => {
    checkAdminAndFetch()
  }, [startDate, endDate])

  const checkAdminAndFetch = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }

    // 1. Identifica o Perfil e a Organização
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, org_id')
      .eq('id', session.user.id)
      .single()
    
    if (profile?.role !== 'admin') {
      alert('Acesso negado!')
      router.push('/')
      return
    }

    if (!profile.org_id) {
      router.push('/setup')
      return
    }

    setMyOrgId(profile.org_id)

    // 2. Busca cores das categorias APENAS desta organização
    const { data: catSettings } = await supabase
      .from('categories')
      .select('name, color')
      .eq('org_id', profile.org_id)
    
    if (catSettings) {
      const colorMap = catSettings.reduce((acc, cat) => ({ ...acc, [cat.name]: cat.color }), {})
      setCategoryColors(colorMap)
    }

    // 3. Chamadas RPC com o parâmetro p_org_id para isolamento total
    // Certifique-se de que suas funções no Postgres agora aceitam o org_id
    const [financeRes, prodsRes, catsRes] = await Promise.all([
      supabase.rpc('get_period_stats', { 
        start_date: startDate, 
        end_date: endDate, 
        p_org_id: profile.org_id 
      }),
      supabase.rpc('get_top_products', { 
        start_date: startDate, 
        end_date: endDate, 
        p_org_id: profile.org_id 
      }),
      supabase.rpc('get_top_categories', { 
        start_date: startDate, 
        end_date: endDate, 
        p_org_id: profile.org_id 
      })
    ])

    if (financeRes.data) {
      const f = financeRes.data as FinancialStats
      setStats(f)
      setPaymentDistribution([
        { name: 'Dinheiro', value: f.dinheiro, color: '#22c55e' },
        { name: 'Digital', value: f.digital, color: '#3b82f6' },
        { name: 'Fiado', value: f.fiado, color: '#f97316' }
      ].filter(d => d.value > 0))
    }

    if (prodsRes.data) setTopProducts(prodsRes.data as TopProduct[])
    if (catsRes.data) setTopCategories(catsRes.data as TopCategory[])

    setLoading(false)
  }

  const CustomTooltip = ({ active, payload, totalValue, isCurrency = true }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const percent = totalValue > 0 ? ((data.value / totalValue) * 100).toFixed(1) : 0
      return (
        <div style={{ backgroundColor: 'white', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' }}>
          <p style={{ margin: '0 0 5px', fontWeight: 700, color: data.payload.fill || data.payload.color || colors.primary, fontSize: '0.95rem' }}>
            {data.name || data.payload.category || data.payload.name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
              {isCurrency ? `R$ ${Number(data.value).toFixed(2)}` : `${data.value} un.`}
            </span>
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
              {percent}%
            </span>
          </div>
        </div>
      )
    }
    return null
  }

  if (loading) return (
    <div style={{...globalStyles.container, justifyContent: 'center'}}>
      <p style={{color: colors.textMuted}}>Processando Inteligência de Dados...</p>
    </div>
  )

  const totalCategoryVal = topCategories.reduce((acc, curr) => acc + curr.total, 0)
  const totalProductsQty = topProducts.reduce((acc, curr) => acc + curr.quantity, 0)

  const navBtn = {
    background: 'white', border: `1px solid ${colors.border}`, borderRadius: '6px',
    padding: '8px 16px', color: colors.text, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
  }

  return (
    <div style={{ ...globalStyles.container, justifyContent: 'flex-start', background: '#f8fafc' }}>
      
      <header style={{ 
        width: '100%', backgroundColor: 'white', borderBottom: `1px solid ${colors.border}`, 
        padding: '0 20px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <BrandLogo size={36} color={colors.primary} />
          <div style={{ lineHeight: 1 }}>
            <span style={{ fontWeight: 800, color: colors.primary, display: 'block' }}>KOMANDA</span>
            <span style={{ fontSize: '0.65rem', color: colors.textMuted, textTransform: 'uppercase' }}>Intelligence</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => { router.push('/'); router.refresh(); }} style={navBtn}>🏠 Comandas</button>
          <button onClick={() => { router.push('/products'); router.refresh(); }} style={navBtn}>🍔 Menu</button>
          <button onClick={() => { router.push('/squad'); router.refresh(); }} style={navBtn}>👥 Squad</button>
          <button 
            onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            style={{ ...navBtn, backgroundColor: colors.errorBg, color: colors.errorText, border: 'none' }}
          >
            Sair
          </button>
        </div>
      </header>

      <main style={{ width: '100%', maxWidth: '1200px', padding: '30px 20px', flex: 1 }}>
        
        {/* FILTROS */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px', background: 'white', padding: '20px', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 10px', color: colors.text }}>Filtro de Faturamento</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => {setStartDate(today); setEndDate(today)}} style={filterBtnStyle}>Hoje</button>
              <button onClick={() => {const d = new Date(); d.setDate(d.getDate()-7); setStartDate(d.toISOString().split('T')[0]); setEndDate(today)}} style={filterBtnStyle}>7 Dias</button>
              <button onClick={() => {const date = new Date(); setStartDate(new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0]); setEndDate(today)}} style={filterBtnStyle}>Mês</button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={dateInputStyle} />
            <span style={{fontWeight: 'bold', color: colors.textMuted}}>até</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={dateInputStyle} />
          </div>
        </div>

        {/* KPI CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div style={{ backgroundColor: colors.primary, padding: '20px', borderRadius: '12px', color: 'white' }}>
            <span style={{ opacity: 0.9, fontSize: '0.8rem', fontWeight: 600 }}>TOTAL PERÍODO</span>
            <div style={{ fontSize: '2rem', fontWeight: 800, marginTop: '5px' }}>R$ {stats.total.toFixed(2)}</div>
          </div>
          <div style={kpiCardStyle}>
            <span style={{ color: colors.textMuted, fontSize: '0.8rem', fontWeight: 600 }}>TICKET MÉDIO</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: colors.text }}>R$ {stats.ticket_medio.toFixed(2)}</div>
          </div>
          <div style={kpiCardStyle}>
            <span style={{ color: colors.textMuted, fontSize: '0.8rem', fontWeight: 600 }}>CAIXA (DINHEIRO)</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a' }}>R$ {stats.dinheiro.toFixed(2)}</div>
          </div>
          <div style={kpiCardStyle}>
            <span style={{ color: colors.textMuted, fontSize: '0.8rem', fontWeight: 600 }}>FIADO</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f97316' }}>R$ {stats.fiado.toFixed(2)}</div>
          </div>
        </div>

        {/* GRÁFICOS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
          <div style={chartCardStyle}>
            <h3 style={chartTitleStyle}>🏆 Top 5 Produtos</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={topProducts} margin={{ left: 10, right: 30 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} style={{ fontSize: '0.75rem', fontWeight: 600 }} />
                  <Tooltip content={<CustomTooltip totalValue={totalProductsQty} isCurrency={false} />} />
                  <Bar dataKey="quantity" fill={colors.primary} radius={[0, 4, 4, 0]} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={chartCardStyle}>
            <h3 style={chartTitleStyle}>🍕 Vendas por Categoria</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={topCategories} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="total" nameKey="category">
                    {topCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={categoryColors[entry.category] || '#94a3b8'} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip totalValue={totalCategoryVal} isCurrency={true} />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={chartCardStyle}>
            <h3 style={chartTitleStyle}>💳 Pagamentos</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                    {paymentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip totalValue={stats.total} isCurrency={true} />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

const filterBtnStyle = { padding: '6px 14px', borderRadius: '20px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#475569' }
const dateInputStyle = { background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '8px', borderRadius: '6px', fontWeight: 'bold', color: '#334155', outline: 'none' }
const kpiCardStyle = { background: 'white', padding: '20px', borderRadius: '12px', border: `1px solid ${colors.border}` }
const chartCardStyle = { backgroundColor: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0' }
const chartTitleStyle = { margin: '0 0 20px', fontSize: '1.1rem', color: '#1e293b', fontWeight: 700 }