'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { colors, globalStyles } from '../styles/theme'

export default function SetupPage() {
  const router = useRouter()
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgName.trim()) return
    setLoading(true)

    // Recupera a sessão atual para vincular o perfil
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
      return
    }

    /**
     * 1. Criar a Organização
     * IMPORTANTE: A política de RLS no banco deve permitir INSERT para 'authenticated'.
     */
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert([{ name: orgName.trim() }])
      .select()
      .single()

    if (orgError) {
      // Se cair aqui, a política de INSERT do RLS na tabela organizations está bloqueando.
      alert("Erro ao criar organização: " + orgError.message)
      setLoading(false)
      return
    }

    /**
     * 2. Tornar o usuário ADM e vincular à nova Org
     * Atualiza o perfil do usuário logado com o ID da org recém-criada.
     */
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        org_id: orgData.id, 
        role: 'admin' // Define como administrador por padrão no setup inicial
      })
      .eq('id', session.user.id)

    if (profileError) {
      // Se cair aqui, a política de UPDATE do RLS na tabela profiles está bloqueando.
      alert("Erro ao vincular seu perfil administrativo: " + profileError.message)
      setLoading(false)
    } else {
      /**
       * 3. Sucesso!
       * O router.refresh() é crucial aqui para que o Next.js invalide o cache 
       * e reconheça o novo org_id e role nas verificações de layout.
       */
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div style={{ ...globalStyles.container, background: '#f8fafc' }}>
      <div style={{ ...globalStyles.card, maxWidth: '400px', width: '90%', padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: colors.primary, marginBottom: '10px' }}>Bem-vindo ao Komanda!</h2>
        <p style={{ color: colors.textMuted, marginBottom: '30px', fontSize: '0.9rem' }}>
          Para começar, dê um nome ao seu estabelecimento. Como criador, você terá acesso total de administrador.
        </p>
        
        <form onSubmit={handleCreateOrg}>
          <input 
            required
            autoFocus
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Ex: PIZZARIA DO XANDÃO"
            style={{ ...globalStyles.input, textAlign: 'center', fontSize: '1.1rem' }}
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              ...globalStyles.buttonPrimary, 
              marginTop: '10px',
              opacity: loading ? 0.7 : 1 
            }}
          >
            {loading ? 'CONFIGURANDO...' : 'FINALIZAR CONFIGURAÇÃO'}
          </button>
        </form>
      </div>
    </div>
  )
}