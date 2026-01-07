'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { colors, globalStyles } from '../styles/theme'
import { BrandLogo } from '../components/BrandLogo' // Certifique-se que criou este arquivo no passo anterior

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  
  // Estado para mensagens de erro ou sucesso
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' })
  
  const router = useRouter()

  // Função auxiliar para mostrar feedback temporário
  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message })
    setTimeout(() => setFeedback({ type: null, message: '' }), 4000)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setFeedback({ type: null, message: '' })

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      showFeedback('error', 'Credenciais inválidas. Tente novamente.')
      setLoading(false)
    } else {
      // Login com sucesso, redireciona
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div style={globalStyles.container}>
      
      {/* Efeitos de Fundo (Glow sutil cinza) */}
      <div style={{ ...globalStyles.glow, top: '-20%', left: '-10%', backgroundColor: '#e2e8f0', opacity: 0.6 }} />
      <div style={{ ...globalStyles.glow, bottom: '-20%', right: '-10%', backgroundColor: '#cbd5e1', opacity: 0.6 }} />

      <div style={globalStyles.card}>
        
        {/* Cabeçalho da Marca */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          marginBottom: '40px' 
        }}>
          
          {/* Logo Vetorial */}
          <div style={{ marginBottom: '16px' }}>
            <BrandLogo size={70} color={colors.primary} />
          </div>

          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 800, 
            margin: 0,
            color: colors.primary, // Grená
            lineHeight: 1.2
          }}>
            KOMANDA
          </h1>
          
          <p style={{ 
            color: colors.textMuted, 
            fontSize: '0.75rem', 
            textTransform: 'uppercase', 
            letterSpacing: '0.25em',
            fontWeight: 600,
            marginTop: '8px'
          }}>
            Gestão Inteligente
          </p>
        </div>

        {/* Área de Feedback (Erro/Sucesso) */}
        {feedback.message && (
          <div style={{
            padding: '12px', 
            borderRadius: '8px', 
            fontSize: '0.875rem', 
            textAlign: 'center', 
            marginBottom: '24px',
            fontWeight: 500,
            backgroundColor: feedback.type === 'error' ? colors.errorBg : colors.successBg,
            color: feedback.type === 'error' ? colors.errorText : colors.successText,
            border: `1px solid ${feedback.type === 'error' ? colors.errorText : colors.successText}`
          }}>
            {feedback.message}
          </div>
        )}

        {/* Formulário de Login */}
        <form onSubmit={handleLogin}>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              color: colors.text, 
              marginBottom: '8px', 
              fontWeight: 600 
            }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              style={globalStyles.input}
              placeholder="seu@email.com"
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              color: colors.text, 
              marginBottom: '8px', 
              fontWeight: 600 
            }}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              style={{...globalStyles.input, marginBottom: 0}} // Remove margem inferior do último input
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            style={{ 
              ...globalStyles.buttonPrimary, 
              opacity: loading ? 0.7 : 1, 
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            {loading ? (
              <>
                {/* Pequeno spinner CSS puro */}
                <div style={{
                  width: '16px', height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <span>Entrando...</span>
              </>
            ) : 'ACESSAR SISTEMA'}
          </button>
        </form>

        {/* Adiciona animação do spinner globalmente neste componente */}
        <style jsx global>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>

      </div>

      <p style={{ 
        marginTop: '40px', 
        color: colors.textMuted, 
        fontSize: '0.75rem', 
        position: 'relative', 
        zIndex: 10 
      }}>
        &copy; {new Date().getFullYear()} Komanda System. Todos os direitos reservados.
      </p>
    </div>
  )
}