'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { colors, globalStyles } from '../styles/theme'
import { BrandLogo } from '../components/BrandLogo'

export default function SetupPage() {
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      router.push('/login')
      return
    }

    // Busca o perfil para verificar o estado atual
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', session.user.id)
      .single()

    // SE JÁ TEM ORG: Redireciona para a Home (já está configurado)
    if (profile?.org_id) {
      router.push('/')
      return
    }

    // SE NÃO TEM ORG: Permite ficar na página para criar a primeira Organização
    // Não vamos checar se é 'admin' aqui, pois o primeiro acesso de um 
    // usuário criado manualmente será justamente para se tornar o Admin/Dono.
    setChecking(false)
  }

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgName.trim()) return
    
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    
    try {
      const res = await fetch('/api/setup-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          orgName: orgName.trim(), 
          userId: session?.user.id 
        })
      })

      const data = await res.json()

      if (res.ok) {
        // O router.refresh() é vital para limpar o cache do cargo e da org
        router.refresh()
        // Pequeno delay para o banco processar antes de ir para a Home
        setTimeout(() => router.push('/'), 500)
      } else {
        throw new Error(data.error || 'Erro na configuração')
      }
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div style={{ ...globalStyles.container, background: '#f8fafc' }}>
        <p style={{ color: colors.textMuted }}>Validando acesso...</p>
      </div>
    )
  }

  return (
    <div style={{ ...globalStyles.container, background: '#f8fafc' }}>
      <div style={{
        ...globalStyles.card, 
        width: '100%', 
        maxWidth: '450px', 
        padding: '40px', 
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '30px' }}>
          <BrandLogo size={60} color={colors.primary} />
          <h1 style={{ color: colors.primary, fontSize: '1.8rem', fontWeight: 800, margin: '15px 0 5px' }}>
            Configuração Inicial
          </h1>
          <p style={{ color: colors.textMuted, fontSize: '0.95rem' }}>
            Identificamos que este é seu primeiro acesso. <br/>
            Como se chama o seu estabelecimento?
          </p>
        </div>

        <form onSubmit={handleSetup} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: colors.textMuted, fontWeight: 600 }}>
              NOME DA ORGANIZAÇÃO
            </label>
            <input 
              required 
              autoFocus
              style={globalStyles.input} 
              value={orgName} 
              onChange={e => setOrgName(e.target.value)} 
              placeholder="Ex: Pizzaria Komanda"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            style={{ ...globalStyles.buttonPrimary, height: '55px' }}
          >
            {loading ? 'CRIANDO EMPRESA...' : 'FINALIZAR E ENTRAR'}
          </button>
        </form>
      </div>
    </div>
  )
}