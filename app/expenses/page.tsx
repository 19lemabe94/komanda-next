'use client'

import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { colors, globalStyles } from '../styles/theme'
import { Header } from '../components/Header'

const IconPlus = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
const IconTrash = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
const IconFilter = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>

type Expense = {
  id: string
  description: string
  amount: number
  category: string
  type: 'fixa' | 'variavel'
  payment_method: string
  date: string
  notes: string | null
}

const CATEGORIAS_FIXAS = ['Aluguel', 'Energia', 'Água', 'Internet', 'Telefone', 'Contador', 'Salário', 'Outro']
const CATEGORIAS_VARIAVEIS = ['Fornecedor', 'Compras/Estoque', 'Manutenção', 'Marketing', 'Embalagens', 'Transporte', 'Imposto', 'Outro']

const getLocalToday = () => {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().split('T')[0]
}

export default function ExpensesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Filtros
  const [filterType, setFilterType] = useState<'todos' | 'fixa' | 'variavel'>('todos')
  const [filterMonth, setFilterMonth] = useState(getLocalToday().substring(0, 7))

  // Formulário
  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: CATEGORIAS_FIXAS[0],
    type: 'fixa' as 'fixa' | 'variavel',
    payment_method: 'dinheiro',
    date: getLocalToday(),
    notes: ''
  })

  useEffect(() => { init() }, [])
  useEffect(() => { if (orgId) fetchExpenses(orgId) }, [filterType, filterMonth, orgId])

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }
    const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('id', session.user.id).single()
    if (profile) {
      setUserRole(profile.role)
      setOrgId(profile.org_id)
      fetchExpenses(profile.org_id)
    }
    setLoading(false)
  }

  const fetchExpenses = async (oid: string) => {
    // CORREÇÃO DO BUG DO DIA 31: Calcula o último dia correto do mês selecionado
    const [year, month] = filterMonth.split('-')
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()

    let query = supabase
      .from('expenses')
      .select('*')
      .eq('org_id', oid)
      .gte('date', `${filterMonth}-01`)
      .lte('date', `${filterMonth}-${lastDay}`) // Agora usa 28, 30 ou 31 dinamicamente
      .order('date', { ascending: false })

    if (filterType !== 'todos') query = query.eq('type', filterType)

    const { data, error } = await query
    
    // Mostra o erro no console do navegador caso o banco reclame de algo
    if (error) console.error("Erro ao buscar despesas do Supabase:", error)
    if (data) setExpenses(data)
  }

  const handleTypeChange = (type: 'fixa' | 'variavel') => {
    setForm(f => ({
      ...f,
      type,
      category: type === 'fixa' ? CATEGORIAS_FIXAS[0] : CATEGORIAS_VARIAVEIS[0]
    }))
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!orgId) return
    setSubmitting(true)

    const amount = parseFloat(form.amount.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) { alert('Valor inválido'); setSubmitting(false); return }

    const { error } = await supabase.from('expenses').insert([{
      org_id: orgId,
      description: form.description.trim(),
      amount,
      category: form.category,
      type: form.type,
      payment_method: form.payment_method,
      date: form.date,
      notes: form.notes || null
    }])

    if (error) { 
      alert('Erro ao salvar no banco: ' + error.message) 
    } else {
      setShowModal(false)
      setForm({ description: '', amount: '', category: CATEGORIAS_FIXAS[0], type: 'fixa', payment_method: 'dinheiro', date: getLocalToday(), notes: '' })
      fetchExpenses(orgId)
    }
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta despesa?')) return
    await supabase.from('expenses').delete().eq('id', id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  // Totais
  const totalGeral = expenses.reduce((acc, e) => acc + e.amount, 0)
  const totalFixas = expenses.filter(e => e.type === 'fixa').reduce((acc, e) => acc + e.amount, 0)
  const totalVariaveis = expenses.filter(e => e.type === 'variavel').reduce((acc, e) => acc + e.amount, 0)

  const typeColor = (type: string) => type === 'fixa' ? '#3b82f6' : '#f97316'
  const typeBg = (type: string) => type === 'fixa' ? '#eff6ff' : '#fff7ed'
  const typeLabel = (type: string) => type === 'fixa' ? 'FIXA' : 'VARIÁVEL'

  const paymentIcon = (method: string) => {
    if (method === 'pix') return '💠'
    if (method === 'cartao_debito' || method === 'cartao_credito') return '💳'
    return '💵'
  }

  const touchBtn = {
    padding: '12px 16px', borderRadius: '12px', fontWeight: 700,
    fontSize: '0.9rem', cursor: 'pointer', border: 'none', minHeight: '48px',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
  }

  if (loading) return null

  return (
    <div style={{ ...globalStyles.container, justifyContent: 'flex-start', background: '#f8fafc' }}>
      <Header userRole={userRole} subtitle="DESPESAS" />

      <main style={{ width: '100%', maxWidth: '900px', padding: '20px', flex: 1 }}>

        {/* KPI CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
          <div style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', borderRadius: '16px', padding: '20px', color: 'white' }}>
            <p style={{ margin: '0 0 5px', fontSize: '0.75rem', fontWeight: 700, opacity: 0.85 }}>TOTAL DO MÊS</p>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 900 }}>R$ {totalGeral.toFixed(2)}</p>
          </div>
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: '0 0 5px', fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6' }}>FIXAS</p>
            <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: '#1e40af' }}>R$ {totalFixas.toFixed(2)}</p>
          </div>
          <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: '0 0 5px', fontSize: '0.75rem', fontWeight: 700, color: '#f97316' }}>VARIÁVEIS</p>
            <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: '#c2410c' }}>R$ {totalVariaveis.toFixed(2)}</p>
          </div>
        </div>

        {/* FILTROS */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="month"
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            style={{ padding: '10px 15px', borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 700, color: colors.text, outline: 'none', background: 'white' }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['todos', 'fixa', 'variavel'] as const).map(t => (
              <button key={t} onClick={() => setFilterType(t)}
                style={{ ...touchBtn, minHeight: '42px', padding: '8px 16px', background: filterType === t ? colors.primary : 'white', color: filterType === t ? 'white' : colors.textMuted, border: `1px solid ${filterType === t ? colors.primary : '#e2e8f0'}` }}>
                {t === 'todos' ? 'Todos' : t === 'fixa' ? '🔵 Fixas' : '🟠 Variáveis'}
              </button>
            ))}
          </div>
          <button onClick={() => setShowModal(true)}
            style={{ ...touchBtn, background: colors.primary, color: 'white', marginLeft: 'auto' }}>
            <IconPlus /> Nova Despesa
          </button>
        </div>

        {/* LISTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {expenses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px', color: colors.textMuted, background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>💸</div>
              <p style={{ margin: 0, fontWeight: 600 }}>Nenhuma despesa neste período.</p>
            </div>
          ) : expenses.map(expense => (
            <div key={expense.id} style={{ background: 'white', borderRadius: '16px', padding: '18px 20px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: '1rem', color: colors.text }}>{expense.description}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '3px 8px', borderRadius: '10px', background: typeBg(expense.type), color: typeColor(expense.type) }}>
                    {typeLabel(expense.type)}
                  </span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', borderRadius: '10px', background: '#f1f5f9', color: '#64748b' }}>
                    {expense.category}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: colors.textMuted }}>
                    📅 {new Date(expense.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: colors.textMuted }}>
                    {paymentIcon(expense.payment_method)} {expense.payment_method.replace('_', ' ')}
                  </span>
                </div>
                {expense.notes && <p style={{ margin: '5px 0 0', fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>{expense.notes}</p>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexShrink: 0 }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ef4444' }}>- R$ {expense.amount.toFixed(2)}</span>
                <button onClick={() => handleDelete(expense.id)}
                  style={{ background: '#fee2e2', border: 'none', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}>
                  <IconTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODAL NOVA DESPESA */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)', padding: '20px' }}>
          <div style={{ background: 'white', borderRadius: '20px', padding: '30px', width: '100%', maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 25px', color: colors.primary, fontWeight: 900, fontSize: '1.3rem' }}>Nova Despesa</h3>
            
            <form onSubmit={handleSave}>
              {/* TIPO */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.9rem', color: colors.textMuted }}>Tipo *</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => handleTypeChange('fixa')}
                    style={{ ...touchBtn, flex: 1, background: form.type === 'fixa' ? '#3b82f6' : '#f1f5f9', color: form.type === 'fixa' ? 'white' : '#64748b' }}>
                    🔵 Fixa
                  </button>
                  <button type="button" onClick={() => handleTypeChange('variavel')}
                    style={{ ...touchBtn, flex: 1, background: form.type === 'variavel' ? '#f97316' : '#f1f5f9', color: form.type === 'variavel' ? 'white' : '#64748b' }}>
                    🟠 Variável
                  </button>
                </div>
              </div>

              {/* CATEGORIA */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.9rem', color: colors.textMuted }}>Categoria *</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  style={{ ...globalStyles.input, height: '48px', width: '100%' }}>
                  {(form.type === 'fixa' ? CATEGORIAS_FIXAS : CATEGORIAS_VARIAVEIS).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* DESCRIÇÃO */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.9rem', color: colors.textMuted }}>Descrição *</label>
                <input required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Ex: Conta de luz de outubro"
                  style={{ ...globalStyles.input, padding: '12px 15px', width: '100%' }} />
              </div>

              {/* VALOR E DATA */}
              <div style={{ display: 'flex', gap: '15px', marginBottom: '18px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.9rem', color: colors.textMuted }}>Valor (R$) *</label>
                  <input required type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="0.00"
                    style={{ ...globalStyles.input, padding: '12px 15px', width: '100%' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.9rem', color: colors.textMuted }}>Data *</label>
                  <input required type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    style={{ ...globalStyles.input, padding: '12px 15px', width: '100%' }} />
                </div>
              </div>

              {/* PAGAMENTO */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.9rem', color: colors.textMuted }}>Forma de Pagamento *</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { value: 'dinheiro', label: '💵 Dinheiro' },
                    { value: 'pix', label: '💠 PIX' },
                    { value: 'cartao_debito', label: '💳 Débito' },
                    { value: 'cartao_credito', label: '💳 Crédito' },
                  ].map(opt => (
                    <button key={opt.value} type="button" onClick={() => setForm(f => ({ ...f, payment_method: opt.value }))}
                      style={{ ...touchBtn, minHeight: '40px', padding: '8px 14px', flex: 1, fontSize: '0.8rem', background: form.payment_method === opt.value ? colors.primary : '#f1f5f9', color: form.payment_method === opt.value ? 'white' : '#64748b', border: 'none' }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* OBSERVAÇÃO */}
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '8px', fontSize: '0.9rem', color: colors.textMuted }}>Observação (opcional)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Alguma observação importante..."
                  rows={2}
                  style={{ ...globalStyles.input, resize: 'none', padding: '12px 15px', width: '100%' }} />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ ...touchBtn, flex: 1, background: '#f1f5f9', color: colors.text }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting}
                  style={{ ...touchBtn, flex: 1, background: colors.primary, color: 'white' }}>
                  {submitting ? 'Salvando...' : '💾 Salvar'}
                </button>
              </div>
            </form>
            
          </div>
        </div>
      )}
    </div>
  )
}