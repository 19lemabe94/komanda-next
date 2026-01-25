'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { colors, globalStyles } from '../styles/theme'

interface Props {
  onClose: () => void
}

export function BackupModal({ onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  // --- FUNÇÃO DE EXPORTAR (BACKUP) ---
  const handleExport = async () => {
    setLoading(true)
    setStatus('Lendo banco de dados...')
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sem sessão.')

      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', session.user.id).single()
      if (!profile?.org_id) throw new Error('Organização não encontrada.')

      // Busca dados de TODAS as tabelas vitais
      const [products, categories, orders, orderItems, profiles] = await Promise.all([
        supabase.from('products').select('*').eq('org_id', profile.org_id),
        supabase.from('categories').select('*').eq('org_id', profile.org_id),
        supabase.from('orders').select('*').eq('org_id', profile.org_id),
        supabase.from('order_items').select('*').eq('org_id', profile.org_id),
        supabase.from('profiles').select('*').eq('org_id', profile.org_id)
      ])

      const backupData = {
        timestamp: new Date().toISOString(),
        org_id: profile.org_id,
        version: '1.0',
        data: {
          categories: categories.data || [],
          products: products.data || [],
          profiles: profiles.data || [], // Cuidado: Senhas não são exportadas pelo Supabase por segurança
          orders: orders.data || [],
          order_items: orderItems.data || []
        }
      }

      // Cria o arquivo para download
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `komanda_backup_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      
      setStatus('Backup baixado com sucesso!')
      setTimeout(onClose, 2000)

    } catch (err: any) {
      alert('Erro no backup: ' + err.message)
      setStatus('')
    } finally {
      setLoading(false)
    }
  }

  // --- FUNÇÃO DE IMPORTAR (RESTAURAR) ---
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!confirm('⚠️ ATENÇÃO: Isso irá mesclar os dados do arquivo com o banco atual. Dados com o mesmo ID serão atualizados. Deseja continuar?')) {
      e.target.value = '' // Limpa o input
      return
    }

    setLoading(true)
    setStatus('Lendo arquivo...')

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        if (!json.data || !json.org_id) throw new Error('Arquivo de backup inválido.')

        setStatus('Restaurando dados no banco...')

        // A ordem de restauração importa por causa das chaves estrangeiras (IDs)
        // 1. Perfis e Categorias (Base)
        if (json.data.categories?.length) await supabase.from('categories').upsert(json.data.categories)
        if (json.data.profiles?.length) await supabase.from('profiles').upsert(json.data.profiles)

        // 2. Produtos (Dependem de Categoria e Org)
        if (json.data.products?.length) await supabase.from('products').upsert(json.data.products)

        // 3. Vendas (Orders)
        if (json.data.orders?.length) await supabase.from('orders').upsert(json.data.orders)

        // 4. Itens da Venda (Dependem de Vendas e Produtos)
        if (json.data.order_items?.length) await supabase.from('order_items').upsert(json.data.order_items)

        alert(`Restauração concluída!\n${json.data.orders.length} vendas recuperadas.`)
        setStatus('Sucesso!')
        setTimeout(onClose, 1500)

      } catch (err: any) {
        alert('Erro ao restaurar: ' + err.message)
        setStatus('Erro!')
      } finally {
        setLoading(false)
        e.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
      <div style={{ ...globalStyles.card, width: '90%', maxWidth: '400px', padding: '30px' }}>
        <h3 style={{ marginTop: 0, color: colors.primary, textAlign: 'center' }}>Backup & Restauração</h3>
        <p style={{ textAlign: 'center', color: colors.textMuted, fontSize: '0.9rem', marginBottom: '30px' }}>
          Gera um arquivo local com todo o seu histórico.
        </p>

        {status && (
          <div style={{ marginBottom: '20px', padding: '10px', background: '#e0f2fe', color: '#0369a1', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' }}>
            {status}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {/* BOTÃO EXPORTAR */}
          <button 
            onClick={handleExport}
            disabled={loading}
            style={{ 
              backgroundColor: colors.primary, color: 'white', border: 'none', 
              padding: '15px', borderRadius: '10px', fontWeight: 800, fontSize: '1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer'
            }}
          >
            {loading ? 'Processando...' : '⬇️ FAZER BACKUP AGORA'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '10px 0' }}>
            <div style={{ flex: 1, height: '1px', background: colors.border }}></div>
            <span style={{ fontSize: '0.8rem', color: colors.textMuted, fontWeight: 600 }}>OU RESTAURAR</span>
            <div style={{ flex: 1, height: '1px', background: colors.border }}></div>
          </div>

          {/* INPUT IMPORTAR */}
          <label style={{ 
              backgroundColor: 'white', border: `2px dashed ${colors.border}`, color: colors.text, 
              padding: '15px', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer',
              opacity: loading ? 0.5 : 1
          }}>
            ⬆️ Carregar Arquivo de Backup
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImport} 
              disabled={loading}
              style={{ display: 'none' }} 
            />
          </label>

          <button onClick={onClose} disabled={loading} style={{ background: 'transparent', border: 'none', color: colors.textMuted, marginTop: '10px', cursor: 'pointer' }}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}