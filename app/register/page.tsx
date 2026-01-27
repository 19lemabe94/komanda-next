// Arquivo: app/register/page.tsx
'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function Register() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMsg('')

    // 1. Cria usuário no Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setMsg('Erro: ' + error.message)
      setLoading(false)
      return
    }

    // 2. Cria perfil e organização inicial (Opcional se você tiver triggers no banco)
    // Se você não tiver triggers automáticos no banco, avise que eu passo o código extra aqui.
    // Por enquanto, vamos assumir que o Auth funcionou.
    
    setMsg('Conta criada! Verifique seu email ou faça login.')
    setLoading(false)
    setTimeout(() => router.push('/'), 3000)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: 'sans-serif' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '20px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <h2 style={{ textAlign: 'center', color: '#0f172a', marginBottom: '30px', fontWeight: 800 }}>Criar Conta</h2>
        
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input type="email" placeholder="Seu melhor email" required value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }} />
          <input type="password" placeholder="Crie uma senha forte" required value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ccc' }} />
          
          {msg && <p style={{ color: msg.includes('Erro') ? 'red' : 'green', textAlign: 'center', fontSize: '0.9rem' }}>{msg}</p>}

          <button type="submit" disabled={loading} style={{ padding: '15px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
            {loading ? 'Criando...' : 'CADASTRAR'}
          </button>
        </form>

        <button onClick={() => router.push('/')} style={{ width: '100%', marginTop: '20px', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}>
          Voltar para Login
        </button>
      </div>
    </div>
  )
}