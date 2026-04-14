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

// --- ÍCONES SVG ---
const IconCalendar = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
const IconMoney = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
const IconChartPie = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
const IconCreditCard = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
const IconTrophy = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"></path></svg>
const IconTrendingUp = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
const IconLayers = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
const IconWhatsapp = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>

// --- TIPOS ---
type FinancialStats = {
  total: number
  dinheiro: number
  fiado: number
  digital: number
  ticket_medio: number
}

type TopProduct = { name: string; quantity: number }
type CategoryData = { category: string; totalValue: number; totalQty: number }

export default function ReportsPage() {
  const router = useRouter()
  const grenaColor = '#800020'
  
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
  const [categoriesData, setCategoriesData] = useState<CategoryData[]>([])
  const [paymentDistribution, setPaymentDistribution] = useState<any[]>([])
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({})

  // Estados para o Modal de WhatsApp
  const [showShareModal, setShowShareModal] = useState(false)
  const [whatsappNumber, setWhatsappNumber] = useState('')

  useEffect(() => {
    checkAdminAndFetch()
    const savedNumber = localStorage.getItem('komanda_whatsapp_target')
    if (savedNumber) setWhatsappNumber(savedNumber)
  }, [startDate, endDate])

  const handlePreset = (period: string) => {
    const now = new Date()
    const offset = now.getTimezoneOffset() * 60000
    const formatDate = (d: Date) => new Date(d.getTime() - offset).toISOString().split('T')[0]

    const end = new Date()
    const start = new Date()

    setActiveFilter(period)

    switch (period) {
      case 'hoje': break; 
      case 'ontem':
        start.setDate(start.getDate() - 1)
        end.setDate(end.getDate() - 1)
        break;
      case '7dias':
        start.setDate(start.getDate() - 7)
        break;
      case 'mes':
        start.setDate(1)
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

    const { data: profile } = await supabase.from('profiles').select('role, org_id').eq('id', session.user.id).single()
    
    if (profile?.role !== 'admin') {
      alert('Acesso restrito à gerência.')
      router.push('/')
      return
    }

    setUserRole(profile.role)

    const { data: catSettings } = await supabase.from('categories').select('name, color').eq('org_id', profile.org_id)
    const colorMap: Record<string, string> = {}
    if (catSettings) {
      catSettings.forEach(cat => colorMap[cat.name] = cat.color)
      setCategoryColors(colorMap)
    }

    const startIso = `${startDate}T00:00:00`
    const endIso = `${endDate}T23:59:59`
    
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
      .neq('status', 'aberta')
      .gte('created_at', new Date(startIso).toISOString())
      .lte('created_at', new Date(endIso).toISOString())

    if (!error && orders) {
      processData(orders)
    }
    setLoading(false)
  }

  const processData = (orders: any[]) => {
    const newStats = { total: 0, dinheiro: 0, fiado: 0, digital: 0, ticket_medio: 0 }
    const productCount: Record<string, number> = {}
    const categoryStats: Record<string, { value: number, qty: number }> = {}
    let validOrdersCount = 0

    orders.forEach(order => {
      if (order.status !== 'concluida') return

      validOrdersCount++
      const val = order.total
      newStats.total += val

      if (order.payment_method === 'dinheiro') newStats.dinheiro += val
      else if (order.payment_method === 'fiado') newStats.fiado += val
      else newStats.digital += val

      order.order_items.forEach((item: any) => {
        const pName = item.product_name_snapshot
        productCount[pName] = (productCount[pName] || 0) + item.quantity

        const catName = item.products?.category || 'Outros'
        if (!categoryStats[catName]) categoryStats[catName] = { value: 0, qty: 0 }
        
        categoryStats[catName].value += (item.product_price_snapshot * item.quantity)
        categoryStats[catName].qty += item.quantity
      })
    })

    newStats.ticket_medio = validOrdersCount > 0 ? newStats.total / validOrdersCount : 0

    const sortedProducts = Object.entries(productCount)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    const sortedCategories = Object.entries(categoryStats)
      .map(([category, data]) => ({ category, totalValue: data.value, totalQty: data.qty }))
      .sort((a, b) => b.totalValue - a.totalValue) 

    setStats(newStats)
    setTopProducts(sortedProducts)
    setCategoriesData(sortedCategories)
    
    setPaymentDistribution([
      { name: 'Dinheiro', value: newStats.dinheiro, color: '#22c55e' },
      { name: 'Cartão / PIX', value: newStats.digital, color: '#3b82f6' },
      { name: 'Fiado', value: newStats.fiado, color: '#f97316' }
    ].filter(d => d.value > 0))
  }

    const sendWhatsAppReport = () => {
      if (!whatsappNumber) return alert('Digite um número de telefone.')

      localStorage.setItem('komanda_whatsapp_target', whatsappNumber)

      const now = new Date()
      const timeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      const dateString = now.toLocaleDateString('pt-BR')

      const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

      const categoriesList = categoriesData
        .sort((a, b) => b.totalQty - a.totalQty)
        .map(cat => `- ${removeAccents(cat.category)}: ${cat.totalQty}`)
        .join('\n')

      const message = [
        `*RESUMO KOMANDA*`,
        `${dateString} - ${timeString}`,
        ``,
        `*TOTAL: R$ ${stats.total.toFixed(2)}*`,
        ``,
        `Dinheiro: R$ ${stats.dinheiro.toFixed(2)}`,
        `Cartao/Pix: R$ ${stats.digital.toFixed(2)}`,
        `Fiado: R$ ${stats.fiado.toFixed(2)}`,
        ``,
        `*QTD POR CATEGORIA*`,
        categoriesList || "- Nenhum item",
        ``,
        `_Sistema Komanda_`
      ].join('\n')

      const cleanNumber = whatsappNumber.replace(/\D/g, '')
      const finalNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`
      const url = `https://wa.me/${finalNumber}?text=${encodeURIComponent(message)}`

      // Abre em nova aba de forma compatível com mobile
      const link = document.createElement('a')
      link.href = url
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setShowShareModal(false)
    }

  const CustomTooltip = ({ active, payload, totalValue, isCurrency = true, suffix = '' }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const percent = totalValue ? ((data.value / totalValue) * 100).toFixed(1) + '%' : ''
      return (
        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: '0 0 4px', fontWeight: 700, color: data.payload.fill || colors.text, fontSize: '0.85rem' }}>
            {data.name || data.payload.category || data.payload.name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.95rem', color: colors.primary, fontWeight: 800 }}>
              {isCurrency ? `R$ ${Number(data.value).toFixed(2)}` : `${data.value} ${suffix}`}
            </span>
            {percent && <span style={{ fontSize: '0.75rem', color: colors.textMuted, fontWeight: 600 }}>({percent})</span>}
          </div>
        </div>
      )
    }
    return null
  }

  const filterBtnStyle = (isActive: boolean) => ({
    padding: '8px 18px', borderRadius: '20px', 
    border: isActive ? `1px solid ${grenaColor}` : '1px solid #e2e8f0', 
    background: isActive ? grenaColor : 'white', 
    color: isActive ? 'white' : colors.textMuted,
    cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
    transition: 'all 0.2s ease', 
    boxShadow: isActive ? '0 4px 10px rgba(128,0,32,0.2)' : 'none'
  })

  const kpiCardStyle = { 
    background: 'white', padding: '20px 25px', borderRadius: '16px', 
    border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
    display: 'flex', flexDirection: 'column' as 'column', justifyContent: 'space-between', minHeight: '130px'
  }

  if (loading) return null

  const totalCatValue = categoriesData.reduce((acc, c) => acc + c.totalValue, 0)
  const dataByQty = [...categoriesData].sort((a,b) => b.totalQty - a.totalQty)

  return (
    <div style={{ ...globalStyles.container, justifyContent: 'flex-start', background: '#f8fafc' }}>
      
      <Header userRole={userRole} subtitle="INTELIGÊNCIA" />

      <main style={{ width: '100%', maxWidth: '1200px', padding: '30px 20px', flex: 1 }}>
        
        {/* FILTROS E AÇÕES */}
        <div style={{ marginBottom: '30px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
           <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' }} className="no-scrollbar">
              <button onClick={() => handlePreset('hoje')} style={filterBtnStyle(activeFilter === 'hoje')}>Hoje</button>
              <button onClick={() => handlePreset('ontem')} style={filterBtnStyle(activeFilter === 'ontem')}>Ontem</button>
              <button onClick={() => handlePreset('7dias')} style={filterBtnStyle(activeFilter === '7dias')}>7 Dias</button>
              <button onClick={() => handlePreset('mes')} style={filterBtnStyle(activeFilter === 'mes')}>Mês</button>
              <button onClick={() => handlePreset('custom')} style={filterBtnStyle(activeFilter === 'custom')}>Personalizado</button>
           </div>

           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '10px 15px', borderRadius: '12px', border: `1px solid ${colors.border}`, width: 'fit-content' }}>
                <span style={{ color: colors.textMuted }}><IconCalendar /></span>
                <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setActiveFilter('custom'); }} style={{ border: 'none', fontWeight: 'bold', color: colors.text, outline: 'none' }} />
                <span style={{ color: colors.textMuted }}>até</span>
                <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setActiveFilter('custom'); }} style={{ border: 'none', fontWeight: 'bold', color: colors.text, outline: 'none' }} />
             </div>

             {/* BOTÃO COMPARTILHAR WHATSAPP */}
             <button 
               onClick={() => setShowShareModal(true)}
               style={{ 
                 display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', 
                 backgroundColor: '#25D366', color: 'white', border: 'none', borderRadius: '12px', 
                 fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 10px rgba(37, 211, 102, 0.3)'
               }}
             >
               <IconWhatsapp /> Enviar Resumo
             </button>
           </div>
        </div>

        {/* CARDS DE KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div style={{ ...kpiCardStyle, background: 'linear-gradient(135deg, #800020 0%, #be123c 100%)', border: 'none', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <span style={{ opacity: 0.9, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.5px' }}>FATURAMENTO</span>
              <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '50%', display: 'flex' }}><IconMoney /></div>
            </div>
            <div>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, margin: '10px 0 5px' }}>R$ {stats.total.toFixed(2)}</div>
                <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>Total vendido no período</span>
            </div>
          </div>

          <div style={kpiCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: colors.textMuted, fontSize: '0.8rem', fontWeight: 700 }}>TICKET MÉDIO</span>
                <span style={{ color: colors.primary }}><IconTrendingUp /></span>
            </div>
            <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: colors.text }}>R$ {stats.ticket_medio.toFixed(2)}</div>
                <div style={{ height: '6px', width: '100%', background: '#f1f5f9', borderRadius: '3px', marginTop: '10px' }}>
                    <div style={{ height: '100%', width: '100%', background: colors.primary, borderRadius: '3px', opacity: 0.7 }}></div>
                </div>
            </div>
          </div>

          <div style={kpiCardStyle}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: colors.textMuted, fontSize: '0.8rem', fontWeight: 700 }}>EM CAIXA (DINHEIRO)</span>
                <span style={{ color: '#16a34a' }}><IconMoney /></span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a' }}>R$ {stats.dinheiro.toFixed(2)}</div>
          </div>

          <div style={kpiCardStyle}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: colors.textMuted, fontSize: '0.8rem', fontWeight: 700 }}>A RECEBER (FIADO)</span>
                <span style={{ color: '#f97316' }}><IconCreditCard /></span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f97316' }}>R$ {stats.fiado.toFixed(2)}</div>
          </div>
        </div>

        {/* GRÁFICOS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <span style={{ color: colors.primary }}><IconTrophy /></span>
                <h3 style={{ margin: 0, fontSize: '1rem', color: colors.text, fontWeight: 800 }}>Top 5 Produtos</h3>
            </div>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={topProducts} margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip isCurrency={false} suffix="un." />} cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="quantity" fill={colors.primary} radius={[0, 6, 6, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <span style={{ color: '#3b82f6' }}><IconCreditCard /></span>
                <h3 style={{ margin: 0, fontSize: '1rem', color: colors.text, fontWeight: 800 }}>Pagamentos</h3>
            </div>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value" stroke="none">
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

          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <span style={{ color: '#16a34a' }}><IconChartPie /></span>
                <h3 style={{ margin: 0, fontSize: '1rem', color: colors.text, fontWeight: 800 }}>Receita por Categoria</h3>
            </div>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoriesData} innerRadius={0} outerRadius={90} paddingAngle={2} dataKey="totalValue" nameKey="category" stroke="white" strokeWidth={2}>
                    {categoriesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={categoryColors[entry.category] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip totalValue={totalCatValue} isCurrency={true} />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <span style={{ color: '#f97316' }}><IconLayers /></span>
                <h3 style={{ margin: 0, fontSize: '1rem', color: colors.text, fontWeight: 800 }}>Volume por Categoria</h3>
            </div>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={dataByQty} margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="category" type="category" width={110} tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip isCurrency={false} suffix="itens" />} cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="totalQty" name="Quantidade" radius={[0, 6, 6, 0]} barSize={20}>
                    {dataByQty.map((entry, index) => (
                        <Cell key={`cell-qty-${index}`} fill={categoryColors[entry.category] || '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </main>

      {/* MODAL PARA INSERIR TELEFONE */}
      {showShareModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
            <div style={{ ...globalStyles.card, width: '90%', maxWidth: '380px', padding: '25px' }}>
                <h3 style={{ marginTop: 0, color: '#25D366', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <IconWhatsapp /> Enviar para...
                </h3>
                <p style={{ color: colors.textMuted, fontSize: '0.9rem' }}>Insira o número (com DDD) para enviar o resumo financeiro.</p>
                
                <input 
                    placeholder="Ex: 21999999999" 
                    value={whatsappNumber} 
                    onChange={e => setWhatsappNumber(e.target.value)}
                    style={{ ...globalStyles.input, fontSize: '1.2rem', padding: '12px', textAlign: 'center', marginBottom: '20px' }}
                />

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setShowShareModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #ccc', background: 'transparent', cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={sendWhatsAppReport} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#25D366', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>ENVIAR</button>
                </div>
            </div>
        </div>
      )}

    </div>
  )
}