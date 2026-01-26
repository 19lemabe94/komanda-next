'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { colors, globalStyles } from '../styles/theme'
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
  
  // --- FUNÇÃO DE DATA SEGURA (Igual à Vendas) ---
  const getLocalToday = () => {
    const now = new Date()
    const offset = now.getTimezoneOffset() * 60000
    const localDate = new Date(now.getTime() - offset)
    return localDate.toISOString().split('T')[0]
  }
  
  const [startDate, setStartDate] = useState(getLocalToday())
  const [endDate, setEndDate] = useState(getLocalToday())
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('hoje')
  const [userRole, setUserRole] = useState<string | null>(null)

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
    const now = new Date()
    const offset = now.getTimezoneOffset() * 60000
    const formatDate = (d: Date) => new Date(d.getTime() - offset).toISOString().split('T')[0]

    const end = new Date()
    const start = new Date()

    setActiveFilter(period)

    switch (period) {
      case 'hoje': break; // Start e End são hoje
      case 'ontem':
        start.setDate(start.getDate() - 1)
        end.setDate(end.getDate() - 1)
        break;
      case '7dias':
        start.setDate(start.getDate() - 7)
        break;
      case 'mes':
        start.setDate(1) // 1º dia do mês
        break;
      case '6meses':
        start.setMonth(start.getMonth() - 6)
        break;
      case 'ano':
        start.setFullYear(start.getFullYear() - 1)
        break;
    }

    setStartDate(formatDate(start))
    setEndDate(formatDate(end))
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

    setUserRole(profile.role)

    // Busca cores das categorias
    const { data: catSettings } = await supabase
      .from('categories')
      .select('name, color')
      .eq('org_id', profile.org_id)
    
    const colorMap: Record<string, string> = {}
    if (catSettings) {
      catSettings.forEach(cat => colorMap[cat.name] = cat.color)
      setCategoryColors(colorMap)
    }

    // --- BUSCA INTELIGENTE COM FUSO HORÁRIO ---
    // Usamos o intervalo ISO completo para garantir que pegamos vendas da noite
    const startIso = `${startDate}T00:00:00`
    const endIso = `${endDate}T23:59:59`
    
    // 1. Busca Vendas (Orders) + Itens + Produto(Categoria)
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id, status, total, payment_method, created_at,
        order_items (
          quantity,
          product_price_snapshot,
          product_name_snapshot,
          products ( category ) 
        )
      `)
      .eq('org_id', profile.org_id)
      .neq('status', 'aberta') // Apenas fechadas ou canceladas
      .gte('created_at', new Date(startIso).toISOString())
      .lte('created_at', new Date(endIso).toISOString())

    if (!error && orders) {
      processData(orders, colorMap)
    }

    setLoading(false)
  }

  // --- PROCESSAMENTO LOCAL DOS DADOS ---
  const processData = (orders: any[], colorMap: Record<string, string>) => {
    const newStats = { total: 0, dinheiro: 0, fiado: 0, digital: 0, ticket_medio: 0 }
    const productCount: Record<string, number> = {}
    const categoryCount: Record<string, number> = {}
    let validOrdersCount = 0

    orders.forEach(order => {
      if (order.status !== 'concluida') return

      validOrdersCount++
      const val = order.total
      newStats.total += val

      // Financeiro
      if (order.payment_method === 'dinheiro') newStats.dinheiro += val
      else if (order.payment_method === 'fiado') newStats.fiado += val
      else newStats.digital += val

      // Produtos e Categorias
      order.order_items.forEach((item: any) => {
        // Top Produtos
        const pName = item.product_name_snapshot
        productCount[pName] = (productCount[pName] || 0) + item.quantity

        // Top Categorias (Tenta pegar do cadastro atual, senão 'Outros')
        // item.products pode ser null se o produto foi deletado, então tratamos isso
        const catName = item.products?.category || 'Outros'
        categoryCount[catName] = (categoryCount[catName] || 0) + (item.product_price_snapshot * item.quantity)
      })
    })

    // Ticket Médio
    newStats.ticket_medio = validOrdersCount > 0 ? newStats.total / validOrdersCount : 0

    // Formata Top Produtos (Top 5)
    const sortedProducts = Object.entries(productCount)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    // Formata Top Categorias
    const sortedCategories = Object.entries(categoryCount)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)

    // Atualiza Estados
    setStats(newStats)
    setTopProducts(sortedProducts)
    setTopCategories(sortedCategories)
    
    setPaymentDistribution([
      { name: 'Dinheiro', value: newStats.dinheiro, color: '#22c55e' },
      { name: 'Digital', value: newStats.digital, color: '#3b82f6' },
      { name: 'Fiado', value: newStats.fiado, color: '#f97316' }
    ].filter(d => d.value > 0))
  }

  // Componente de Tooltip
  const CustomTooltip = ({ active, payload, totalValue, isCurrency = true }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const percent = totalValue > 0 ? ((data.value / totalValue) * 100).toFixed(1) : 0
      return (
        <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 5px', fontWeight: 700, color: data.payload.fill || colors.primary, fontSize: '0.9rem', textTransform: 'uppercase' }}>
            {data.name || data.payload.category || data.payload.name}
          </p>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '1rem', color: '#1e293b', fontWeight: 600 }}>
              {isCurrency ? `R$ ${Number(data.value).toFixed(2)}` : `${data.value} un.`}
            </span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', background: '#f1f5f9', padding: '4px 8px', borderRadius: '6px' }}>{percent}%</span>
          </div>
        </div>
      )
    }
    return null
  }

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
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '1.2rem' }}>📅</span>
            <input 
              type="date" value={startDate} 
              onChange={e => { setStartDate(e.target.value); setActiveFilter('custom'); }} 
              style={{ background: 'transparent', border: 'none', fontWeight: 'bold', color: colors.text, outline: 'none', fontFamily: 'inherit' }} 
            />
            <span style={{ color: colors.textMuted, fontSize: '0.8rem' }}>até</span>
            <input 
              type="date" value={endDate} 
              onChange={e => { setEndDate(e.target.value); setActiveFilter('custom'); }} 
              style={{ background: 'transparent', border: 'none', fontWeight: 'bold', color: colors.text, outline: 'none', fontFamily: 'inherit' }} 
            />
          </div>
        </div>

        {/* CARDS DE KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
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
          
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1rem', color: colors.text, fontWeight: 800, textTransform: 'uppercase' }}>🏆 Top 5 Produtos</h3>
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

          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1rem', color: colors.text, fontWeight: 800, textTransform: 'uppercase' }}>🍕 Categorias</h3>
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

          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1rem', color: colors.text, fontWeight: 800, textTransform: 'uppercase' }}>💳 Pagamentos</h3>
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