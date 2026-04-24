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

// --- ÍCONES SVG MINIMALISTAS ---
const IconCalendar = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
const IconMoney = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
const IconChartPie = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
const IconCreditCard = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
const IconTrophy = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"></path></svg>
const IconTrendingUp = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
const IconLayers = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
const IconWhatsapp = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
const IconPrint = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>

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
  const luxuryBlack = '#111111'
  const textMuted = '#737373'
  const grenaColor = '#800020'
  
  const getLocalToday = () => {
    const now = new Date()
    const offset = now.getTimezoneOffset() * 60000
    return new Date(now.getTime() - offset).toISOString().split('T')[0]
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

  // Estados para o Modal de WhatsApp e Impressão
  const [showShareModal, setShowShareModal] = useState(false)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [restaurantName, setRestaurantName] = useState('KOMANDAPRO')

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
      case 'ontem': start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1); break;
      case '7dias': start.setDate(start.getDate() - 7); break;
      case 'mes': start.setDate(1); break;
      case '6meses': start.setMonth(start.getMonth() - 6); break;
      case 'ano': start.setFullYear(start.getFullYear() - 1); break;
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

    const { data: config } = await supabase.from('menu_config').select('restaurant_name').eq('org_id', profile.org_id).single()
    if (config?.restaurant_name) setRestaurantName(config.restaurant_name)

    const { data: catSettings } = await supabase.from('categories').select('name, color').eq('org_id', profile.org_id)
    const colorMap: Record<string, string> = {}
    if (catSettings) {
      catSettings.forEach(cat => colorMap[cat.name] = cat.color)
      setCategoryColors(colorMap)
    }

    const startIso = `${startDate}T00:00:00`
    const endIso = `${endDate}T23:59:59`
    
    // 1. Busca os pedidos fechados (dinheiro, pix, cartao, fiado)
    const { data: orders } = await supabase
      .from('orders')
      .select(`id, status, total, payment_method, created_at, order_items (quantity, product_price_snapshot, product_name_snapshot, products (category))`)
      .eq('org_id', profile.org_id)
      .neq('status', 'aberta')
      .gte('created_at', new Date(startIso).toISOString())
      .lte('created_at', new Date(endIso).toISOString())

    // 2. Busca os recebimentos de fiado (pagamentos isolados da aba Clientes e parciais da Mesa)
    const { data: debtPayments } = await supabase
      .from('debt_payments')
      .select('amount, notes, created_at')
      .eq('org_id', profile.org_id)
      .gte('created_at', new Date(startIso).toISOString())
      .lte('created_at', new Date(endIso).toISOString())

    // 3. Busca os pagamentos parciais da tabela payments (quando paga parte pix, parte fiado na mesa)
    const { data: partialPayments } = await supabase
      .from('payments')
      .select('amount, method, created_at')
      .eq('org_id', profile.org_id)
      .gte('created_at', new Date(startIso).toISOString())
      .lte('created_at', new Date(endIso).toISOString())

    processData(orders || [], debtPayments || [], partialPayments || [])
    setLoading(false)
  }

  const processData = (orders: any[], debtPayments: any[], partialPayments: any[]) => {
    const newStats = { total: 0, dinheiro: 0, fiado: 0, digital: 0, ticket_medio: 0 }
    const productCount: Record<string, number> = {}
    const categoryStats: Record<string, { value: number, qty: number }> = {}
    let validOrdersCount = 0

    // 1. Processa os Pedidos (Produtos e Ticket Médio)
    orders.forEach(order => {
      if (order.status !== 'concluida') return
      validOrdersCount++
      
      // Contabiliza apenas o fiado no total de pedidos. Os pagamentos reais vêm de payments e debt_payments
      if (order.payment_method === 'fiado') {
        newStats.total += order.total
        newStats.fiado += order.total
      }

      order.order_items.forEach((item: any) => {
        const pName = item.product_name_snapshot
        productCount[pName] = (productCount[pName] || 0) + item.quantity

        const catName = item.products?.category || 'Outros'
        if (!categoryStats[catName]) categoryStats[catName] = { value: 0, qty: 0 }
        
        categoryStats[catName].value += (item.product_price_snapshot * item.quantity)
        categoryStats[catName].qty += item.quantity
      })
    })

    // 2. Processa os Pagamentos da Mesa (Pix, Dinheiro, Cartão)
    partialPayments.forEach(pay => {
      newStats.total += pay.amount
      if (pay.method === 'dinheiro') newStats.dinheiro += pay.amount
      else newStats.digital += pay.amount // pix, debito, credito
    })

    // 3. Processa Recebimentos de Fiado (da tela de clientes)
    // Esses não entram no 'total' faturado do dia (pra não duplicar), mas entram no Caixa!
    debtPayments.forEach(pay => {
       // Se pagou fiado com nota contendo PIX/CARTAO, vai pro digital. Senão assume dinheiro.
       const methodStr = pay.notes?.toLowerCase() || ''
       if (methodStr.includes('pix') || methodStr.includes('cartao') || methodStr.includes('cartão') || methodStr.includes('debito') || methodStr.includes('credito')) {
          newStats.digital += pay.amount
       } else {
          newStats.dinheiro += pay.amount
       }
       // Abate do montante que subiu pro fiado (opcional, dependendo de como vc visualiza. Vamos manter como Receita Extra no caixa)
    })

    newStats.ticket_medio = validOrdersCount > 0 ? (newStats.dinheiro + newStats.digital + newStats.fiado) / validOrdersCount : 0

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
      { name: 'Dinheiro', value: newStats.dinheiro, color: '#16a34a' },
      { name: 'Cartão / PIX', value: newStats.digital, color: '#3b82f6' },
      { name: 'Lançado p/ Fiado', value: newStats.fiado, color: '#f97316' }
    ].filter(d => d.value > 0))
  }

  const handlePrintBluetoothReport = async () => {
    try {
      // @ts-ignore
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2']
      });
      const server = await device.gatt?.connect();
      const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristics = await service.getCharacteristics();
      const writeChar = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);

      const COLS = 28;
      const formatL = (l: string, r: string) => l + " ".repeat(Math.max(1, COLS - l.length - r.length)) + r;
      const centerText = (text: string) => { 
        if (text.length >= COLS) return text.substring(0, COLS); 
        const padding = Math.floor((COLS - text.length) / 2); 
        return " ".repeat(padding) + text; 
      };

      let txt = `\n${centerText(restaurantName.toUpperCase())}\n`;
      txt += centerText("FECHAMENTO DE CAIXA") + "\n";
      txt += "-".repeat(COLS) + "\n";
      txt += `PERIODO:\n`;
      txt += `${startDate.split('-').reverse().join('/')} a ${endDate.split('-').reverse().join('/')}\n`;
      txt += "-".repeat(COLS) + "\n";
      
      txt += formatL("TOTAL VENDIDO:", `R$${stats.total.toFixed(2)}`) + "\n\n";
      txt += formatL("ENTROU DINHEIRO:", `R$${stats.dinheiro.toFixed(2)}`) + "\n";
      txt += formatL("ENTROU CARTAO/PIX:", `R$${stats.digital.toFixed(2)}`) + "\n";
      txt += formatL("LANCADO P/ FIADO:", `R$${stats.fiado.toFixed(2)}`) + "\n";
      
      txt += "-".repeat(COLS) + "\n";
      txt += centerText("CATEGORIAS VENDIDAS") + "\n\n";
      
      categoriesData.sort((a,b)=>b.totalQty - a.totalQty).forEach(cat => {
          txt += formatL(`${cat.totalQty}x ${cat.category.substring(0,15)}`, `R$${cat.totalValue.toFixed(2)}`) + "\n";
      });

      txt += "-".repeat(COLS) + "\n\n\n\n";

      const cleanTxt = txt.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const encoder = new TextEncoder();
      const bytes = encoder.encode(cleanTxt);
      
      await writeChar.writeValue(new Uint8Array([27, 64])); 
      const chunkSize = 64; 
      for (let i = 0; i < bytes.length; i += chunkSize) {
        await writeChar.writeValue(bytes.slice(i, i + chunkSize));
      }
    } catch (e: any) {
      alert("Erro Bluetooth: " + e.message);
    }
  }

  const sendWhatsAppReport = () => {
    if (!whatsappNumber) return alert('Digite um número de telefone.')
    localStorage.setItem('komanda_whatsapp_target', whatsappNumber)

    const dateStr = `${startDate.split('-').reverse().join('/')} até ${endDate.split('-').reverse().join('/')}`;
    const removeAccents = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

    const categoriesList = categoriesData
      .sort((a, b) => b.totalQty - a.totalQty)
      .map(cat => `- ${removeAccents(cat.category)}: ${cat.totalQty} (R$ ${cat.totalValue.toFixed(2)})`)
      .join('\n')

    const message = [
      `*FECHAMENTO KOMANDA*`,
      `Período: ${dateStr}`,
      ``,
      `*FATURAMENTO TOTAL: R$ ${stats.total.toFixed(2)}*`,
      ``,
      `Entrou em Dinheiro: R$ ${stats.dinheiro.toFixed(2)}`,
      `Entrou em Cartão/Pix: R$ ${stats.digital.toFixed(2)}`,
      `Lançado p/ Fiado: R$ ${stats.fiado.toFixed(2)}`,
      ``,
      `*VENDAS POR CATEGORIA*`,
      categoriesList || "- Nenhum item",
      ``,
      `_Gerado por KomandaPRO_`
    ].join('\n')

    const cleanNumber = whatsappNumber.replace(/\D/g, '')
    const finalNumber = cleanNumber.startsWith('55') ? cleanNumber : `55${cleanNumber}`
    
    // Abre o link nativo do WhatsApp corretamente
    window.open(`https://wa.me/${finalNumber}?text=${encodeURIComponent(message)}`, '_blank')
    setShowShareModal(false)
  }

  const CustomTooltip = ({ active, payload, totalValue, isCurrency = true, suffix = '' }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const percent = totalValue ? ((data.value / totalValue) * 100).toFixed(1) + '%' : ''
      return (
        <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '12px', borderRadius: '12px', border: `1px solid ${borderLight}`, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <p style={{ margin: '0 0 4px', fontWeight: 700, color: data.payload.fill || luxuryBlack, fontSize: '0.85rem', textTransform: 'uppercase' }}>
            {data.name || data.payload.category || data.payload.name}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.95rem', color: luxuryBlack, fontWeight: 800 }}>
              {isCurrency ? `R$ ${Number(data.value).toFixed(2)}` : `${data.value} ${suffix}`}
            </span>
            {percent && <span style={{ fontSize: '0.75rem', color: textMuted, fontWeight: 600 }}>({percent})</span>}
          </div>
        </div>
      )
    }
    return null
  }

  const filterBtnStyle = (isActive: boolean) => ({
    padding: '8px 18px', borderRadius: '20px', 
    border: 'none', 
    background: isActive ? luxuryBlack : '#f1f5f9', 
    color: isActive ? 'white' : textMuted,
    cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
    transition: 'all 0.2s ease', whiteSpace: 'nowrap' as 'nowrap'
  })

  const borderLight = '#eaeaea'
  const kpiCardStyle = { 
    background: 'white', padding: '20px', borderRadius: '16px', 
    border: `1px solid ${borderLight}`,
    display: 'flex', flexDirection: 'column' as 'column', justifyContent: 'space-between', minHeight: '130px'
  }

  if (loading) return null

  const totalCatValue = categoriesData.reduce((acc, c) => acc + c.totalValue, 0)
  const dataByQty = [...categoriesData].sort((a,b) => b.totalQty - a.totalQty)

  return (
    <div style={{ ...globalStyles.container, justifyContent: 'flex-start', background: '#fafafa' }}>
      
      <Header userRole={userRole} subtitle="INTELIGÊNCIA" />
      <style jsx global>{` .no-scrollbar::-webkit-scrollbar { display: none; } `}</style>

      <main style={{ width: '100%', maxWidth: '1200px', padding: '20px', flex: 1 }}>
        
        {/* FILTROS E AÇÕES - QUIET LUXURY */}
        <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
           <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '5px' }} className="no-scrollbar">
              <button onClick={() => handlePreset('hoje')} style={filterBtnStyle(activeFilter === 'hoje')}>Hoje</button>
              <button onClick={() => handlePreset('ontem')} style={filterBtnStyle(activeFilter === 'ontem')}>Ontem</button>
              <button onClick={() => handlePreset('7dias')} style={filterBtnStyle(activeFilter === '7dias')}>7 Dias</button>
              <button onClick={() => handlePreset('mes')} style={filterBtnStyle(activeFilter === 'mes')}>Mês</button>
              <button onClick={() => handlePreset('custom')} style={filterBtnStyle(activeFilter === 'custom')}>Personalizado</button>
           </div>

           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', padding: '10px 15px', borderRadius: '12px', border: `1px solid ${borderLight}`, width: 'fit-content' }}>
                <span style={{ color: textMuted }}><IconCalendar /></span>
                <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setActiveFilter('custom'); }} style={{ border: 'none', fontWeight: 600, color: luxuryBlack, outline: 'none', background: 'transparent' }} />
                <span style={{ color: textMuted, fontSize: '0.85rem' }}>até</span>
                <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setActiveFilter('custom'); }} style={{ border: 'none', fontWeight: 600, color: luxuryBlack, outline: 'none', background: 'transparent' }} />
             </div>

             <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={handlePrintBluetoothReport} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', backgroundColor: 'white', color: luxuryBlack, border: `1px solid ${borderLight}`, borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>
                    <IconPrint /> 
                </button>
                <button onClick={() => setShowShareModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', backgroundColor: '#25D366', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}>
                    <IconWhatsapp />
                </button>
             </div>
           </div>
        </div>

        {/* CARDS DE KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '15px', marginBottom: '25px' }}>
          <div style={{ ...kpiCardStyle, background: luxuryBlack, color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <span style={{ opacity: 0.7, fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.5px' }}>FATURAMENTO</span>
              <div style={{ opacity: 0.5 }}><IconMoney /></div>
            </div>
            <div>
                <div style={{ fontSize: '2.2rem', fontWeight: 700, margin: '5px 0' }}>R$ {stats.total.toFixed(2)}</div>
                <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>Vendas brutas no período</span>
            </div>
          </div>

          <div style={kpiCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: textMuted, fontSize: '0.8rem', fontWeight: 600 }}>TICKET MÉDIO</span>
                <span style={{ color: textMuted }}><IconTrendingUp /></span>
            </div>
            <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: luxuryBlack }}>R$ {stats.ticket_medio.toFixed(2)}</div>
            </div>
          </div>

          <div style={kpiCardStyle}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: textMuted, fontSize: '0.8rem', fontWeight: 600 }}>CAIXA (DINHEIRO)</span>
                <span style={{ color: '#16a34a' }}><IconMoney /></span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#16a34a' }}>R$ {stats.dinheiro.toFixed(2)}</div>
          </div>

          <div style={kpiCardStyle}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: textMuted, fontSize: '0.8rem', fontWeight: 600 }}>A RECEBER (FIADO)</span>
                <span style={{ color: '#f97316' }}><IconCreditCard /></span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f97316' }}>R$ {stats.fiado.toFixed(2)}</div>
          </div>
        </div>

        {/* GRÁFICOS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '15px' }}>
          
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: `1px solid ${borderLight}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: luxuryBlack, fontWeight: 700 }}>Top 5 Produtos</h3>
            </div>
            <div style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={topProducts} margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fontWeight: 500, fill: textMuted }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip isCurrency={false} suffix="un." />} cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="quantity" fill={luxuryBlack} radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: `1px solid ${borderLight}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: luxuryBlack, fontWeight: 700 }}>Pagamentos</h3>
            </div>
            <div style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={2} dataKey="value" stroke="none">
                    {paymentDistribution.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                  </Pie>
                  <Tooltip content={<CustomTooltip totalValue={stats.total} isCurrency={true} />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.8rem', color: textMuted }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: `1px solid ${borderLight}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: luxuryBlack, fontWeight: 700 }}>Receita por Categoria</h3>
            </div>
            <div style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoriesData} innerRadius={0} outerRadius={90} paddingAngle={1} dataKey="totalValue" nameKey="category" stroke="white" strokeWidth={1}>
                    {categoriesData.map((entry, index) => (<Cell key={`cell-${index}`} fill={categoryColors[entry.category] || '#cbd5e1'} />))}
                  </Pie>
                  <Tooltip content={<CustomTooltip totalValue={totalCatValue} isCurrency={true} />} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.8rem', color: textMuted }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: `1px solid ${borderLight}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: luxuryBlack, fontWeight: 700 }}>Volume por Categoria</h3>
            </div>
            <div style={{ height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={dataByQty} margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="category" type="category" width={100} tick={{ fontSize: 11, fontWeight: 500, fill: textMuted }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip isCurrency={false} suffix="itens" />} cursor={{fill: '#f8fafc'}} />
                  <Bar dataKey="totalQty" name="Quantidade" radius={[0, 4, 4, 0]} barSize={18}>
                    {dataByQty.map((entry, index) => (<Cell key={`cell-qty-${index}`} fill={categoryColors[entry.category] || '#cbd5e1'} />))}
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
            <div className="slide-up" style={{ backgroundColor: 'white', width: '90%', maxWidth: '380px', padding: '25px', borderRadius: '20px' }}>
                <h3 style={{ marginTop: 0, color: luxuryBlack, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <IconWhatsapp /> Enviar para...
                </h3>
                <p style={{ color: textMuted, fontSize: '0.9rem', marginBottom: '20px' }}>Insira o número (com DDD) para enviar o resumo financeiro do período selecionado.</p>
                
                <input 
                    placeholder="Ex: 21999999999" 
                    value={whatsappNumber} 
                    onChange={e => setWhatsappNumber(e.target.value)}
                    style={{ width: '100%', fontSize: '1.2rem', padding: '15px', textAlign: 'center', marginBottom: '20px', borderRadius: '12px', border: `1px solid ${borderLight}`, outline: 'none', background: '#fafafa' }}
                />

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setShowShareModal(false)} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: 'none', background: '#f1f5f9', color: textMuted, fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={sendWhatsAppReport} style={{ flex: 1, padding: '15px', borderRadius: '12px', border: 'none', background: '#25D366', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Enviar Zap</button>
                </div>
            </div>
        </div>
      )}
      <style jsx global>{` .slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); } @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } } `}</style>
    </div>
  )
}