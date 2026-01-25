'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { colors, globalStyles } from '../styles/theme'
import { BrandLogo } from '../components/BrandLogo'

export default function LoginPage() {
  const router = useRouter()
  const [emailOrUser, setEmailOrUser] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // LÓGICA DE LOGIN SIMPLIFICADO:
    const finalEmail = emailOrUser.includes('@') 
      ? emailOrUser.trim() 
      : `${emailOrUser.trim().toLowerCase()}@komanda.com`

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: finalEmail,
      password
    })

    if (authError) {
      alert('Usuário ou senha incorretos.')
      setLoading(false)
      return
    }

    // VERIFICAÇÃO DE ORGANIZAÇÃO (Multi-tenancy)
    if (authData.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', authData.user.id)
        .single()

      if (profileError || !profile?.org_id) {
        // Se não tem organização vinculada, vai para o setup inicial
        router.push('/setup')
      } else {
        // Se já tem, vai para o dashboard
        router.push('/')
      }
      
      router.refresh()
    }
  }

  return (
    <div style={{ ...globalStyles.container, background: '#f8fafc' }}>
      <div style={{ ...globalStyles.card, width: '100%', maxWidth: '380px', padding: '40px 30px', textAlign: 'center' }}>
        
        <div style={{ marginBottom: '30px' }}>
          <BrandLogo size={60} color={colors.primary} />
          <h1 style={{ color: colors.primary, fontSize: '2rem', fontWeight: 800, margin: '10px 0 0' }}>KOMANDA</h1>
          <p style={{ color: colors.textMuted, fontSize: '0.9rem' }}>Acesso ao Sistema</p>
        </div>

        <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: colors.textMuted, fontWeight: 600 }}>
              USUÁRIO OU EMAIL
            </label>
            <input
              required
              type="text"
              value={emailOrUser}
              onChange={(e) => setEmailOrUser(e.target.value)}
              placeholder="Digite seu login"
              style={globalStyles.input}
            />
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: colors.textMuted, fontWeight: 600 }}>
              SENHA
            </label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              style={globalStyles.input}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ ...globalStyles.buttonPrimary, height: '55px', fontSize: '1rem' }}
          >
            {loading ? 'ENTRANDO...' : 'ENTRAR'}
          </button>
        </form>

        <p style={{ marginTop: '25px', fontSize: '0.8rem', color: colors.textMuted }}>
          Problemas com o acesso? Procure o gerente.
        </p>
      </div>
    </div>
  )
}