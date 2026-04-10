'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'

export default function ResetPasswordPage() {
  const router = useRouter()
  const grenaColor = '#800020'

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // O Supabase processa o token da URL automaticamente via onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleReset = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (password.length < 6) {
      setErrorMsg('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setErrorMsg('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setErrorMsg('Erro ao redefinir: ' + error.message)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/'), 3000)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f8fafc', fontFamily: "'Inter', sans-serif", padding: '20px'
    }}>
      <div style={{
        background: 'white', borderRadius: '24px', padding: '40px 35px',
        width: '100%', maxWidth: '380px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
        textAlign: 'center'
      }}>
        {success ? (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>✅</div>
            <h2 style={{ color: '#16a34a', fontWeight: 900, margin: '0 0 10px' }}>Senha redefinida!</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Redirecionando para o login...</p>
          </>
        ) : !ready ? (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>⏳</div>
            <h2 style={{ color: '#0f172a', fontWeight: 900, margin: '0 0 10px' }}>Validando link...</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Aguarde um momento.</p>
          </>
        ) : (
          <>
            <div style={{
              width: '60px', height: '60px', borderRadius: '50%',
              background: '#fff1f2', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 20px', fontSize: '1.8rem'
            }}>
              🔐
            </div>
            <h2 style={{ color: '#0f172a', fontWeight: 900, margin: '0 0 8px', fontSize: '1.4rem' }}>
              Nova Senha
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '25px' }}>
              Digite e confirme sua nova senha abaixo.
            </p>

            <form onSubmit={handleReset}>
              <input
                type="password"
                placeholder="Nova senha"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%', padding: '14px 16px', marginBottom: '12px',
                  border: '1px solid #e2e8f0', borderRadius: '12px',
                  fontSize: '1rem', background: '#f8fafc', outline: 'none',
                  color: '#334155', boxSizing: 'border-box'
                }}
              />
              <input
                type="password"
                placeholder="Confirmar nova senha"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                style={{
                  width: '100%', padding: '14px 16px', marginBottom: '20px',
                  border: '1px solid #e2e8f0', borderRadius: '12px',
                  fontSize: '1rem', background: '#f8fafc', outline: 'none',
                  color: '#334155', boxSizing: 'border-box'
                }}
              />

              {errorMsg && (
                <div style={{
                  color: '#ef4444', background: '#fef2f2', padding: '10px',
                  borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600,
                  marginBottom: '15px'
                }}>
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '14px', background: grenaColor,
                  color: 'white', border: 'none', borderRadius: '12px',
                  fontWeight: 800, fontSize: '1rem', cursor: 'pointer'
                }}
              >
                {loading ? 'SALVANDO...' : 'REDEFINIR SENHA'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}