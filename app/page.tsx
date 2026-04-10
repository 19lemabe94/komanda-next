'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './lib/supabaseClient'
import { BrandLogo } from './components/BrandLogo'

// --- ÍCONES ---
const IconSpeed = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
const IconShield = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
const IconChart = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
const IconUser = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
const IconClose = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>

export default function LandingPage() {
  const router = useRouter()
  const grenaColor = '#800020'
  const bgColor = '#f8fafc'

  // Estados de Login
  const [emailOrUser, setEmailOrUser] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)

  // Estados de Recuperação de Senha
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoverySent, setRecoverySent] = useState(false)
  const [recoveryLoading, setRecoveryLoading] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) router.push('/dashboard')
    }
    checkSession()
  }, [router])

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    const finalEmail = emailOrUser.includes('@') ? emailOrUser.trim() : `${emailOrUser.trim().toLowerCase()}@komanda.com`
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: finalEmail, password })
    if (authError) { setErrorMsg('Dados incorretos.'); setLoading(false); return }
    if (authData.user) {
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', authData.user.id).single()
      if (!profile?.org_id) router.push('/setup'); else router.push('/dashboard')
    }
  }

  const handleRecovery = async (e: FormEvent) => {
    e.preventDefault()
    setRecoveryLoading(true)
    const email = recoveryEmail.includes('@')
      ? recoveryEmail.trim()
      : `${recoveryEmail.trim().toLowerCase()}@komanda.com`
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    setRecoverySent(true)
    setRecoveryLoading(false)
  }

  const closeRecovery = () => {
    setIsRecoveryModalOpen(false)
    setRecoverySent(false)
    setRecoveryEmail('')
  }

  const s: any = {
    hero: { padding: '120px 20px 80px', textAlign: 'center', background: 'radial-gradient(circle at center, #ffffff 0%, #f1f5f9 100%)' },
    heroTitle: { fontSize: '3.5rem', fontWeight: 900, color: '#0f172a', marginBottom: '25px', lineHeight: 1.1 },
    heroBtn: { backgroundColor: grenaColor, color: 'white', padding: '20px 55px', borderRadius: '50px', border: 'none', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 10px 25px -5px rgba(128, 0, 32, 0.4)', marginTop: '35px', transition: 'transform 0.2s' },
    cardTitle: { fontSize: '1.4rem', fontWeight: 800, margin: '20px 0 10px', color: '#0f172a' },
    iconBox: { width: '55px', height: '55px', background: '#fff1f2', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: grenaColor },
    bibleSection: { backgroundColor: '#1a1a1a', backgroundImage: `linear-gradient(to right, #2c0b15, #1a1a1a)`, padding: '100px 20px', textAlign: 'center', color: '#e2e8f0' },
    verseText: { fontSize: '1.8rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.5, maxWidth: '800px', margin: '0 auto', fontFamily: 'serif' },
    verseRef: { marginTop: '30px', display: 'block', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '3px', color: '#fbbf24', fontSize: '0.85rem' },
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", backgroundColor: bgColor, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <style jsx>{`
        * { box-sizing: border-box; }
        .header-wrapper { width: 100%; background: white; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 50; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
        .header-container { width: 100%; max-width: 1200px; margin: 0 auto; padding: 0 25px; height: 80px; display: flex; align-items: center; justify-content: space-between; }
        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 40px; padding: 60px 5%; max-width: 1200px; margin: 0 auto 80px; }
        .feature-card { background: white; padding: 40px 30px; border-radius: 24px; border: 1px solid #e2e8f0; box-shadow: 0 10px 20px -5px rgba(0,0,0,0.03); text-align: left; transition: all 0.3s ease; cursor: default; }
        .feature-card:hover { transform: translateY(-8px) scale(1.02); box-shadow: 0 20px 40px -10px rgba(128, 0, 32, 0.15); border-color: #fecdd3; }
        .desktop-login-area { display: flex; align-items: center; gap: 10px; }
        .desktop-input { padding: 10px 14px; border-radius: 8px; border: 1px solid #cbd5e1; background: #f8fafc; font-size: 0.85rem; width: 170px; outline: none; transition: border 0.2s; }
        .desktop-input:focus { border-color: ${grenaColor}; background: white; }
        .desktop-btn { background: ${grenaColor}; color: white; padding: 10px 24px; border-radius: 10px; border: none; font-weight: 800; font-size: 0.85rem; cursor: pointer; box-shadow: 0 4px 10px rgba(128, 0, 32, 0.2); transition: opacity 0.2s; }
        .desktop-btn:hover { opacity: 0.9; }
        .link-btn { background: none; border: none; color: #94a3b8; font-size: 0.75rem; cursor: pointer; text-decoration: underline; white-space: nowrap; }
        .mobile-login-trigger { display: none; }
        @media (max-width: 768px) {
          .header-container { padding: 0 20px; }
          .desktop-login-area { display: none; }
          .features-grid { grid-template-columns: 1fr; padding: 40px 20px; gap: 25px; }
          .mobile-login-trigger { display: flex; align-items: center; justify-content: center; background: white; color: ${grenaColor}; border: 1px solid #e2e8f0; width: 42px; height: 42px; border-radius: 10px; cursor: pointer; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
        }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-card { background: white; width: 100%; max-width: 320px; padding: 30px 25px; border-radius: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.2); position: relative; text-align: center; overflow: hidden; }
        .modal-input { width: 100%; padding: 14px 16px; margin-bottom: 12px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 1rem; background: #f8fafc; outline: none; color: #334155; transition: all 0.2s; }
        .modal-input:focus { border-color: ${grenaColor}; background: white; }
        .modal-btn { width: 100%; padding: 14px; background: ${grenaColor}; color: white; border: none; border-radius: 12px; font-weight: 800; font-size: 1rem; cursor: pointer; margin-top: 10px; }
      `}</style>

      {/* --- HEADER --- */}
      <header className="header-wrapper">
        <div className="header-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BrandLogo size={36} color={grenaColor} />
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-1px' }}>
              Komanda<span style={{ color: grenaColor }}>PRO</span>
            </span>
          </div>

          {/* FORM DESKTOP */}
          <form onSubmit={handleLogin} className="desktop-login-area">
            {errorMsg && <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700 }}>ERRO</span>}
            <input type="text" placeholder="Usuário ou Email" required value={emailOrUser} onChange={e => setEmailOrUser(e.target.value)} className="desktop-input" />
            <input type="password" placeholder="Senha" required value={password} onChange={e => setPassword(e.target.value)} className="desktop-input" />
            <button type="button" className="link-btn" onClick={() => setIsRecoveryModalOpen(true)}>Esqueci a senha</button>
            <button type="submit" disabled={loading} className="desktop-btn">{loading ? '...' : 'ENTRAR'}</button>
          </form>

          <button className="mobile-login-trigger" onClick={() => setIsLoginModalOpen(true)}>
            <IconUser />
          </button>
        </div>
      </header>

      {/* --- MODAL MOBILE LOGIN --- */}
      {isLoginModalOpen && (
        <div className="modal-overlay" onClick={() => setIsLoginModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsLoginModalOpen(false)} style={{ position: 'absolute', top: 15, right: 15, background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <IconClose />
            </button>
            <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <BrandLogo size={48} color={grenaColor} />
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a', fontWeight: 900 }}>
                Komanda<span style={{ color: grenaColor }}>PRO</span>
              </h2>
            </div>
            <form onSubmit={handleLogin}>
              {errorMsg && <div style={{ color: '#ef4444', marginBottom: '15px', fontWeight: 600, fontSize: '0.85rem', background: '#fef2f2', padding: '8px', borderRadius: '8px' }}>{errorMsg}</div>}
              <input type="text" placeholder="Usuário ou Email" autoFocus className="modal-input" value={emailOrUser} onChange={e => setEmailOrUser(e.target.value)} />
              <input type="password" placeholder="Senha" className="modal-input" value={password} onChange={e => setPassword(e.target.value)} />
              <button
                type="button"
                onClick={() => { setIsLoginModalOpen(false); setIsRecoveryModalOpen(true) }}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline', marginBottom: '5px', width: '100%' }}
              >
                Esqueci minha senha
              </button>
              <button type="submit" disabled={loading} className="modal-btn">{loading ? 'ENTRANDO...' : 'ENTRAR'}</button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL RECUPERAÇÃO DE SENHA --- */}
      {isRecoveryModalOpen && (
        <div className="modal-overlay" onClick={closeRecovery}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <button onClick={closeRecovery} style={{ position: 'absolute', top: 15, right: 15, background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <IconClose />
            </button>
            <h2 style={{ margin: '0 0 10px', fontSize: '1.3rem', color: '#0f172a', fontWeight: 900 }}>Recuperar Senha</h2>

            {recoverySent ? (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>📧</div>
                <p style={{ color: '#16a34a', fontWeight: 700, marginBottom: '8px' }}>Email enviado!</p>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.</p>
                <button onClick={closeRecovery} style={{ marginTop: '20px', background: grenaColor, color: 'white', border: 'none', borderRadius: '12px', padding: '12px 30px', fontWeight: 800, cursor: 'pointer' }}>
                  OK
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecovery}>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '20px' }}>
                  Digite seu usuário ou email para receber o link de recuperação.
                </p>
                <input autoFocus type="text" placeholder="Usuário ou Email" className="modal-input" value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)} required />
                <button type="submit" disabled={recoveryLoading} className="modal-btn">
                  {recoveryLoading ? 'ENVIANDO...' : 'ENVIAR LINK'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- CONTEÚDO --- */}
      <main style={s.hero}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h1 style={s.heroTitle}>Organize suas mesas.<br /><span style={{ color: grenaColor }}>Consagre seus resultados.</span></h1>
          <p style={{ fontSize: '1.25rem', color: '#64748b', maxWidth: '650px', margin: '0 auto 40px', lineHeight: 1.6 }}>
            A ferramenta completa para restaurantes que buscam excelência operacional, controle financeiro e crescimento sustentável.
          </p>
          <button onClick={() => router.push('/register')} style={s.heroBtn}>CRIAR CONTA GRÁTIS</button>
        </div>
      </main>

      {/* --- GRID DE CARDS --- */}
      <section className="features-grid">
        <div className="feature-card">
          <div style={s.iconBox}><IconSpeed /></div>
          <h3 style={s.cardTitle}>Agilidade no Salão</h3>
          <p style={{ color: '#64748b', lineHeight: 1.6 }}>Lance pedidos em segundos sem travar a operação.</p>
        </div>
        <div className="feature-card">
          <div style={s.iconBox}><IconShield /></div>
          <h3 style={s.cardTitle}>Fim dos Erros</h3>
          <p style={{ color: '#64748b', lineHeight: 1.6 }}>Fechamento automático. Fim dos prejuízos manuais.</p>
        </div>
        <div className="feature-card">
          <div style={s.iconBox}><IconChart /></div>
          <h3 style={s.cardTitle}>Gestão Estratégica</h3>
          <p style={{ color: '#64748b', lineHeight: 1.6 }}>Dados claros e gráficos para decisões inteligentes.</p>
        </div>
      </section>

      <section style={s.bibleSection}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <p style={s.verseText}>"Consagre ao Senhor tudo o que você faz, e os seus planos serão bem-sucedidos."</p>
          <span style={s.verseRef}>Provérbios 16:3</span>
        </div>
      </section>

      <footer style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', borderTop: '1px solid #e2e8f0', background: 'white' }}>
        <p style={{ fontWeight: 600 }}>KomandaPRO © {new Date().getFullYear()}</p>
        <p style={{ marginTop: '5px' }}>Feito com excelência.</p>
      </footer>
    </div>
  )
}