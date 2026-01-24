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

export default function ReportsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  
  // Dados
  const [dailySales, setDailySales] = useState<any[]>([])
  const [paymentStats, setPaymentStats] = useState<any[]>([])
  const [quickStats, setQuickStats] = useState({ today: 0, month: 0 })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    // 1. Busca Vendas Diárias (View)
    const { data: daily } = await supabase.from('view_analytics_daily').select('*')
    if (daily) setDailySales(daily)

    // 2. Busca Por Pagamento (View)
    const { data: payments } = await supabase.from('view_analytics_payments').select('*')
    if (payments) setPaymentStats(payments)

    // 3. Busca Resumo Rápido (Função RPC)
    const { data: stats } = await supabase.rpc('get_dashboard_stats')
    if (stats) setQuickStats(stats)

    setLoading(false)
  }

  // Cores para o gráfico de pizza
  const PIE_COLORS: Record<string, string> = {
    pix: '#06b6d4',       // Ciano
    dinheiro: '#22c55e',  // Verde
    cartao_credito: '#3b82f6', // Azul
    cartao_debito: '#6366f1',  // Índigo
    fiado: '#f97316'      // Laranja
  }

  // Formata nome do pagamento para exibição
  const formatPaymentName = (name: string) => {
    const map: Record<string, string> = {
      pix: 'PIX',
      dinheiro: 'Dinheiro',
      cartao_credito: 'Crédito',
      cartao_debito: 'Débito',
      fiado: 'Fiado'
    }
    return map[name] || name
  }

  return (
    <div style={{ ...globalStyles.container, justifyContent: 'flex-start', background: '#f8fafc' }}>
      
      {/* NAVBAR (Idêntica à Home) */}
      <header style={{
        width: '100%', backgroundColor: 'white', borderBottom: `1px solid ${colors.border}`,
        padding: '0 20px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <BrandLogo size={36} color={colors.primary} />
          <div style={{ lineHeight: 1 }}>
            <span style={{ fontWeight: 800, color: colors.primary, display: 'block' }}>KOMANDA</span>
            <span style={{ fontSize: '0.65rem', color: colors.textMuted, textTransform: 'uppercase' }}>Relatórios</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/')} style={{ background: 'white', border: `1px solid ${colors.border}`, borderRadius: '6px', padding: '8px 16px', color: colors.text, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
            ← Voltar para Mesas
          </button>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main style={{ width: '100%', maxWidth: '1200px', padding: '30px 20px', flex: 1 }}>
        
        <h2 style={{ fontSize: '1.5rem', color: colors.text, marginBottom: '25px' }}>Resumo Financeiro</h2>

        {/* 1. CARTÕES DE RESUMO */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          {/* Card Hoje */}
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: `1px solid ${colors.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <span style={{ color: colors.textMuted, fontSize: '0.9rem', fontWeight: 600 }}>VENDIDO HOJE</span>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#22c55e', marginTop: '5px' }}>
              R$ {quickStats.today.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Card Mês */}
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: `1px solid ${colors.border}`, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <span style={{ color: colors.textMuted, fontSize: '0.9rem', fontWeight: 600 }}>FATURAMENTO DO MÊS</span>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: colors.primary, marginTop: '5px' }}>
              R$ {quickStats.month.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* 2. GRÁFICOS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          
          {/* Gráfico 1: Vendas por Dia */}
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', border: `1px solid ${colors.border}` }}>
            <h3 style={{ margin: '0 0 20px', color: colors.text }}>Evolução Diária (30 dias)</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailySales}>
                  <XAxis dataKey="day" style={{ fontSize: '0.8rem' }} />
                  <YAxis style={{ fontSize: '0.8rem' }} />
                  <Tooltip 
                    formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Total']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="total" fill={colors.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 2: Pizza por Pagamento */}
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', border: `1px solid ${colors.border}` }}>
            <h3 style={{ margin: '0 0 20px', color: colors.text }}>Entradas por Pagamento</h3>
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentStats}
                    cx="50%" cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="total"
                  >
                    {paymentStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.payment_method] || '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `R$ ${value.toFixed(2)}`} />
                  <Legend formatter={(value) => formatPaymentName(paymentStats[value]?.payment_method || '')} />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Legenda Lateral Customizada (Opcional para clareza) */}
              <div style={{ marginLeft: '20px', minWidth: '120px' }}>
                {paymentStats.map((p) => (
                  <div key={p.payment_method} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontSize: '0.9rem' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: PIE_COLORS[p.payment_method] || '#94a3b8', marginRight: '8px' }} />
                    <span style={{ fontWeight: 600 }}>{formatPaymentName(p.payment_method)}</span>
                    <span style={{ marginLeft: 'auto', color: colors.textMuted, fontSize: '0.8rem' }}>
                      {((p.total / paymentStats.reduce((a, b) => a + b.total, 0)) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  )
}