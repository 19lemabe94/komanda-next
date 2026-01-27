'use client'
import { useState, FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { BrandLogo } from '../components/BrandLogo'

export default function LoginPage() {
  const router = useRouter()
  
  const grenaColor = '#800020'

  // Estados
  const [emailOrUser, setEmailOrUser] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    const finalEmail = emailOrUser.includes('@') 
      ? emailOrUser.trim() 
      : `${emailOrUser.trim().toLowerCase()}@komanda.com`

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: finalEmail,
      password
    })

    if (authError) {
      setErrorMsg('Usuário ou senha incorretos.')
      setLoading(false)
      return
    }

    if (authData.user) {
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', authData.user.id).single()
      if (!profile?.org_id) router.push('/setup'); else router.push('/dashboard')
      router.refresh()
    }
  }

  // --- ESTILOS INLINE (MANTIDOS) ---
  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      fontFamily: "'Inter', sans-serif",
      padding: '20px' // Garante margem no celular
    },
    card: {
      backgroundColor: 'white',
      width: '100%',
      maxWidth: '400px',
      padding: '40px 30px',
      borderRadius: '24px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
      border: '1px solid #e2e8f0',
      textAlign: 'center' as 'center',
      position: 'relative' as 'relative'
    },
    title: { fontSize: '2rem', fontWeight: 900, color: '#0f172a', margin: '10px 0 5px', letterSpacing: '-1px' },
    subtitle: { color: '#64748b', fontSize: '0.9rem', marginBottom: '30px' },
    label: { display: 'block', textAlign: 'left' as 'left', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' as 'uppercase', letterSpacing: '0.5px' },
    input: {
      width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1',
      backgroundColor: '#f8fafc', fontSize: '1rem', color: '#334155', outline: 'none', marginBottom: '20px', transition: 'all 0.2s ease'
    },
    button: {
      width: '100%', padding: '16px', backgroundColor: grenaColor, color: 'white', border: 'none',
      borderRadius: '12px', fontSize: '1rem', fontWeight: 800, cursor: 'pointer', marginTop: '10px',
      transition: 'opacity 0.2s', boxShadow: '0 4px 12px rgba(128, 0, 32, 0.25)'
    },
    errorBox: {
      backgroundColor: '#fef2f2', color: '#ef4444', padding: '12px', borderRadius: '8px', fontSize: '0.85rem',
      fontWeight: 600, marginBottom: '20px', border: '1px solid #fee2e2', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center'
    }
  }

  return (
    <>
      {/* --- CORREÇÃO DO LAYOUT QUEBRADO --- */}
      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background-color: #f8fafc; }
      `}</style>

      <div style={styles.container}>
        <div style={styles.card}>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px' }}>
            <BrandLogo size={55} color={grenaColor} />
            <h1 style={styles.title}>Komanda<span style={{ color: grenaColor }}>PRO</span></h1>
            <p style={styles.subtitle}>Acesso ao APP</p>
          </div>

          {errorMsg && (
            <div style={styles.errorBox}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
            <div>
              <label style={styles.label}>Usuário ou Email</label>
              <input required autoFocus type="text" value={emailOrUser} onChange={(e) => setEmailOrUser(e.target.value)} placeholder="Ex: joao" style={styles.input} />
            </div>

            <div>
              <label style={styles.label}>Senha</label>
              <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" style={styles.input} />
            </div>

            <button type="submit" disabled={loading} style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'ACESSANDO...' : 'ENTRAR NO SISTEMA'}
            </button>
          </form>

          <div style={{ marginTop: '30px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Esqueceu sua senha? <span style={{ color: grenaColor, fontWeight: 700, cursor: 'pointer' }}>Contate o gerente.</span>
            </p>
          </div>

        </div>
      </div>
    </>
  )
}