'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './lib/supabaseClient'
import { BrandLogo } from './components/BrandLogo'

// --- ÍCONES PREMIUM ---
const IconSpeed = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
const IconChart = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
const IconBox = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
const IconClose = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>

export default function LandingPage() {
  const router = useRouter()
  
  // Paleta exata
  const grenaColor = '#800020'
  const blushColor = '#fdf2f4' 
  const luxuryBlack = '#111111'
  const textMuted = '#666666'

  // Estados de Autenticação
  const [emailOrUser, setEmailOrUser] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
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
    if (authError) { setErrorMsg('Credenciais inválidas.'); setLoading(false); return }
    if (authData.user) {
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', authData.user.id).single()
      if (!profile?.org_id) router.push('/setup'); else router.push('/dashboard')
    }
  }

  const handleRecovery = async (e: FormEvent) => {
    e.preventDefault()
    setRecoveryLoading(true)
    const email = recoveryEmail.includes('@') ? recoveryEmail.trim() : `${recoveryEmail.trim().toLowerCase()}@komanda.com`
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
    setRecoverySent(true); setRecoveryLoading(false)
  }

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', color: luxuryBlack, fontFamily: "'Inter', sans-serif" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap');
        
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; overflow-x: hidden; }

        /* HEADER RESPONSIVO */
        .header-nav-btn { font-weight: 700; font-size: 0.9rem; padding: 10px 20px; }
        .header-logo-text { font-weight: 800; font-size: 1.4rem; letter-spacing: -0.5px; }

        /* GRID HERO */
        .hero-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          max-width: 1400px;
          margin: 0 auto;
          padding: 180px 40px 100px;
          align-items: center;
        }
        .hero-text-area { justify-self: start; max-width: 600px; }
        .hero-mockup-area { justify-self: end; width: 100%; max-width: 750px; }
        .hero-title { font-size: 4rem; font-weight: 500; line-height: 1.1; margin-bottom: 20px; letter-spacing: -1px; }

        /* MOCKUP INTERNO RESPONSIVO */
        .mockup-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        /* GRID COMO FUNCIONA E FEATURES */
        .steps-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 30px;
          max-width: 1200px;
          margin: 60px auto 120px;
          padding: 0 40px;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
          max-width: 1200px;
          margin: 60px auto 100px;
          padding: 0 40px;
        }

        .feature-card {
          border: 1px solid #eaeaea;
          border-radius: 12px;
          padding: 40px 30px;
          background: white;
          transition: all 0.3s;
        }
        .feature-card:hover { border-color: ${grenaColor}; transform: translateY(-5px); box-shadow: 0 20px 40px rgba(0,0,0,0.04); }
        .feature-card.active { border-color: ${grenaColor}; box-shadow: 0 10px 30px rgba(128,0,32,0.05); }

        /* --- BREAKPOINTS MOBILE --- */
        @media (max-width: 1024px) {
          .hero-container { grid-template-columns: 1fr; text-align: center; padding-top: 140px; gap: 40px; }
          .hero-text-area { justify-self: center; display: flex; flex-direction: column; align-items: center; }
          .hero-mockup-area { justify-self: center; }
          .steps-container { grid-template-columns: repeat(2, 1fr); gap: 50px; }
          .features-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 768px) {
          .mockup-grid { grid-template-columns: 1fr; } /* Empilha os gráficos do mockup */
          .hero-title { font-size: 2.8rem; }
          .header-nav-btn { font-size: 0.8rem; padding: 8px 12px; }
          .header-logo-text { font-size: 1.1rem; }
          .steps-container { margin-bottom: 60px; }
        }

        @media (max-width: 480px) {
          .hero-container { padding: 120px 20px 60px; }
          .hero-title { font-size: 2.2rem; }
          .steps-container { grid-template-columns: 1fr; padding: 0 20px; }
          .features-grid { padding: 0 20px; }
          .header-logo-text { display: none; } /* Esconde texto da logo, deixa só ícone */
        }

        /* MODAL CLASSES */
        .modal-overlay { position: fixed; inset: 0; background: rgba(255,255,255,0.95); z-index: 200; backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-card { width: 100%; max-width: 420px; text-align: center; position: relative; }
        .modal-input { width: 100%; padding: 18px 0; margin-bottom: 25px; border: none; border-bottom: 1px solid #e5e5e5; font-size: 1rem; background: transparent; outline: none; transition: border-color 0.3s; }
        .modal-input:focus { border-bottom-color: ${luxuryBlack}; }
      `}</style>

      {/* --- CABEÇALHO --- */}
      <header style={{ position: 'fixed', top: 0, width: '100%', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 5%', zIndex: 100, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(5px)', borderBottom: '1px solid #fafafa' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BrandLogo size={28} color={grenaColor} />
          <span className="header-logo-text">Komanda<span style={{ color: grenaColor }}>PRO</span></span>
        </div>
        <nav style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <button className="header-nav-btn" onClick={() => setIsLoginModalOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: luxuryBlack }}>ENTRAR</button>
          <button className="header-nav-btn" onClick={() => router.push('/register')} style={{ background: blushColor, color: grenaColor, border: 'none', cursor: 'pointer', borderRadius: '8px', transition: 'opacity 0.2s' }}>CRIAR CONTA</button>
        </nav>
      </header>

      {/* --- HERO SECTION --- */}
      <main className="hero-container">
        {/* Coluna Esquerda: Textos */}
        <div className="hero-text-area">
          <h1 className="hero-title">
            Organize suas mesas.<br />
            <span style={{ color: grenaColor }}>Consagre seus resultados.</span>
          </h1>
          
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#f8f9fa', padding: '8px 20px', borderRadius: '30px', fontSize: '0.9rem', color: textMuted, marginBottom: '40px', border: '1px solid #eee' }}>
            ✨ O sistema definitivo para restaurantes
          </div>

          <div>
            <button onClick={() => router.push('/register')} style={{ background: grenaColor, color: 'white', border: 'none', padding: '16px 40px', borderRadius: '12px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 10px 25px rgba(128,0,32,0.3)', transition: 'transform 0.2s' }}>
              CRIAR CONTA
            </button>
          </div>
        </div>

        {/* Coluna Direita: Dashboard Mockup CSS */}
        <div className="hero-mockup-area">
          <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', border: '1px solid #e5e5e5', overflow: 'hidden', padding: '20px' }}>
            
            {/* Header do Mockup */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #eee', paddingBottom: '15px', marginBottom: '20px' }}>
               <div style={{ display: 'flex', gap: '6px' }}>
                 <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56' }}/>
                 <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e' }}/>
                 <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f' }}/>
               </div>
               <span style={{ fontWeight: 600, fontSize: '0.9rem', color: luxuryBlack, display: 'none', '@media (min-width: 480px)': { display: 'block' } }}>Dashboard</span>
               <span style={{ fontSize: '0.8rem', color: textMuted, background: '#f5f5f5', padding: '4px 12px', borderRadius: '4px' }}>Sales by Category v</span>
            </div>

            {/* Gráficos Mockup (Agora Responsivo) */}
            <div className="mockup-grid">
                <div style={{ border: '1px solid #eee', borderRadius: '12px', padding: '20px' }}>
                    <p style={{ fontSize: '0.8rem', color: textMuted, margin: 0, fontWeight: 600 }}>Monthly Revenue</p>
                    <h3 style={{ margin: '5px 0 20px', fontSize: '1.4rem' }}>R$ 48,500.00</h3>
                    <svg viewBox="0 0 100 40" style={{ width: '100%', height: '60px', overflow: 'visible' }}>
                        <path d="M0 35 L 20 20 L 40 30 L 60 10 L 80 15 L 100 5" fill="none" stroke={grenaColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="60" cy="10" r="3" fill="white" stroke={grenaColor} strokeWidth="1.5" />
                        <circle cx="100" cy="5" r="3" fill="white" stroke={grenaColor} strokeWidth="1.5" />
                    </svg>
                </div>
                <div style={{ border: '1px solid #eee', borderRadius: '12px', padding: '20px' }}>
                    <p style={{ fontSize: '0.8rem', color: textMuted, margin: 0, fontWeight: 600 }}>Operating Expenses</p>
                    <h3 style={{ margin: '5px 0 20px', fontSize: '1.4rem' }}>R$ 12,300.00</h3>
                    <svg viewBox="0 0 100 40" style={{ width: '100%', height: '60px', overflow: 'visible' }}>
                        <path d="M0 30 L 25 25 L 50 35 L 75 15 L 100 20" fill="none" stroke={grenaColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <div style={{ border: '1px solid #eee', borderRadius: '12px', padding: '20px' }}>
                    <p style={{ fontSize: '0.8rem', color: textMuted, margin: 0, fontWeight: 600 }}>Net Profit</p>
                    <h3 style={{ margin: '5px 0 20px', fontSize: '1.4rem' }}>R$ 36,200.00</h3>
                    <svg viewBox="0 0 100 40" style={{ width: '100%', height: '60px', overflow: 'visible' }}>
                        <path d="M0 40 L 30 10 L 60 25 L 100 0" fill="none" stroke={grenaColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <div style={{ border: '1px solid #eee', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifySelf: 'stretch' }}>
                    <p style={{ fontSize: '0.8rem', color: textMuted, margin: '0 0 15px', fontWeight: 600 }}>Sales by Category</p>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '60px', gap: '8px', flex: 1 }}>
                        <div style={{ width: '100%', height: '40%', background: blushColor, border: `1px solid ${grenaColor}`, borderRadius: '2px' }}></div>
                        <div style={{ width: '100%', height: '80%', background: blushColor, border: `1px solid ${grenaColor}`, borderRadius: '2px' }}></div>
                        <div style={{ width: '100%', height: '30%', background: blushColor, border: `1px solid ${grenaColor}`, borderRadius: '2px' }}></div>
                        <div style={{ width: '100%', height: '90%', background: blushColor, border: `1px solid ${grenaColor}`, borderRadius: '2px' }}></div>
                        <div style={{ width: '100%', height: '60%', background: blushColor, border: `1px solid ${grenaColor}`, borderRadius: '2px' }}></div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </main>

      {/* --- COMO FUNCIONA (4 Passos) --- */}
      <section style={{ textAlign: 'center', paddingTop: '20px' }}>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 500 }}>Como Funciona</h2>
        
        <div className="steps-container">
          <div>
            <span style={{ color: grenaColor, fontWeight: 700, letterSpacing: '2px', fontSize: '0.8rem', textTransform: 'uppercase', display: 'block', marginBottom: '15px' }}>Passo 01</span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '10px' }}>Configuração</h3>
            <p style={{ color: textMuted, lineHeight: 1.6, fontSize: '0.95rem' }}>Ajuste os dados do seu restaurante e prepare o ambiente em instantes.</p>
          </div>
          <div>
            <span style={{ color: grenaColor, fontWeight: 700, letterSpacing: '2px', fontSize: '0.8rem', textTransform: 'uppercase', display: 'block', marginBottom: '15px' }}>Passo 02</span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '10px' }}>Cardápio</h3>
            <p style={{ color: textMuted, lineHeight: 1.6, fontSize: '0.95rem' }}>Cadastre categorias e produtos de forma fluida, sem formulários complexos.</p>
          </div>
          <div>
            <span style={{ color: grenaColor, fontWeight: 700, letterSpacing: '2px', fontSize: '0.8rem', textTransform: 'uppercase', display: 'block', marginBottom: '15px' }}>Passo 03</span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '10px' }}>Operação</h3>
            <p style={{ color: textMuted, lineHeight: 1.6, fontSize: '0.95rem' }}>Controle mesas, faturamento e delivery com precisão e clareza visual.</p>
          </div>
          <div>
            <span style={{ color: grenaColor, fontWeight: 700, letterSpacing: '2px', fontSize: '0.8rem', textTransform: 'uppercase', display: 'block', marginBottom: '15px' }}>Passo 04</span>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '10px' }}>Delivery</h3>
            <p style={{ color: textMuted, lineHeight: 1.6, fontSize: '0.95rem' }}>Gerencie entregas e taxas com total integração ao fluxo do salão.</p>
          </div>
        </div>
      </section>

      {/* --- PREMIUM FEATURES --- */}
      <section style={{ textAlign: 'center', background: '#fafafa', paddingTop: '80px', paddingBottom: '40px', borderTop: '1px solid #f0f0f0' }}>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 500 }}>Premium Features</h2>
        
        <div className="features-grid">
          <div className="feature-card active" style={{ textAlign: 'left' }}>
            <div style={{ color: luxuryBlack, marginBottom: '20px' }}><IconSpeed /></div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '15px', color: grenaColor }}>Agilidade no Salão</h3>
            <p style={{ color: textMuted, lineHeight: 1.6 }}>Lance pedidos em segundos. Interface veloz otimizada para tablets e celulares, evitando filas e erros.</p>
          </div>
          <div className="feature-card" style={{ textAlign: 'left' }}>
            <div style={{ color: luxuryBlack, marginBottom: '20px' }}><IconChart /></div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '15px' }}>Gestão Estratégica</h3>
            <p style={{ color: textMuted, lineHeight: 1.6 }}>Gráficos inteligentes que revelam o verdadeiro estado do seu negócio em tempo real.</p>
          </div>
          <div className="feature-card" style={{ textAlign: 'left' }}>
            <div style={{ color: luxuryBlack, marginBottom: '20px' }}><IconBox /></div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '15px' }}>Controle Total</h3>
            <p style={{ color: textMuted, lineHeight: 1.6 }}>Da impressora térmica no balcão ao fechamento de fiados, tudo centralizado num único lugar.</p>
          </div>
        </div>
      </section>

      {/* --- BIBLE SECTION (Serif) --- */}
      <section style={{ padding: '100px 20px', textAlign: 'center', background: 'white' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', fontWeight: 400, marginBottom: '40px' }}>Bible</h2>
        <p style={{ fontSize: '1.6rem', fontStyle: 'italic', fontWeight: 400, lineHeight: 1.6, fontFamily: "'Playfair Display', serif", maxWidth: '700px', margin: '0 auto 30px' }}>
          "Consagre ao Senhor tudo o que você faz, e os seus planos serão bem-sucedidos."
        </p>
        <span style={{ fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Provérbios 16:3</span>
      </section>

      {/* --- MODAL DE LOGIN CENTRALIZADO --- */}
      {isLoginModalOpen && (
        <div className="modal-overlay" onClick={() => setIsLoginModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsLoginModalOpen(false)} style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'none', border: 'none', cursor: 'pointer', color: textMuted }}><IconClose /></button>
            <div style={{ marginBottom: '40px' }}>
              <BrandLogo size={48} color={grenaColor} />
              <h2 style={{ marginTop: '20px', fontSize: '1.5rem', fontWeight: 600 }}>Bem-vindo</h2>
            </div>
            <form onSubmit={handleLogin}>
              {errorMsg && <div style={{ color: grenaColor, marginBottom: '15px', fontWeight: 600, fontSize: '0.9rem' }}>{errorMsg}</div>}
              <input type="text" placeholder="E-mail ou Usuário" autoFocus className="modal-input" value={emailOrUser} onChange={e => setEmailOrUser(e.target.value)} />
              <input type="password" placeholder="Senha" className="modal-input" value={password} onChange={e => setPassword(e.target.value)} style={{ marginBottom: '10px' }} />
              
              <div style={{ textAlign: 'right', marginBottom: '30px' }}>
                <button type="button" onClick={() => { setIsLoginModalOpen(false); setIsRecoveryModalOpen(true) }} style={{ background: 'none', border: 'none', color: textMuted, fontSize: '0.85rem', cursor: 'pointer' }}>Esqueceu a senha?</button>
              </div>

              <button type="submit" disabled={loading} style={{ width: '100%', background: luxuryBlack, color: 'white', border: 'none', padding: '18px', borderRadius: '8px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>
                {loading ? 'AUTENTICANDO...' : 'ENTRAR'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL RECUPERAÇÃO DE SENHA --- */}
      {isRecoveryModalOpen && (
        <div className="modal-overlay" onClick={() => setIsRecoveryModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsRecoveryModalOpen(false)} style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'none', border: 'none', cursor: 'pointer', color: textMuted }}><IconClose /></button>
            <h2 style={{ margin: '0 0 20px', fontSize: '1.5rem', fontWeight: 600 }}>Recuperar Senha</h2>
            {recoverySent ? (
              <div style={{ padding: '20px 0' }}>
                <p style={{ color: '#16a34a', fontWeight: 600, fontSize: '1.1rem', marginBottom: '10px' }}>Instruções enviadas!</p>
                <p style={{ color: textMuted, lineHeight: 1.5 }}>Verifique sua caixa de entrada para redefinir sua senha.</p>
                <button onClick={() => setIsRecoveryModalOpen(false)} style={{ marginTop: '30px', background: luxuryBlack, color: 'white', padding: '15px 30px', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '100%', fontWeight: 600 }}>FECHAR</button>
              </div>
            ) : (
              <form onSubmit={handleRecovery}>
                <p style={{ color: textMuted, marginBottom: '30px', lineHeight: 1.5 }}>Informe o e-mail cadastrado na sua conta.</p>
                <input autoFocus type="text" placeholder="E-mail" className="modal-input" value={recoveryEmail} onChange={e => setRecoveryEmail(e.target.value)} required />
                <button type="submit" disabled={recoveryLoading} style={{ width: '100%', background: luxuryBlack, color: 'white', border: 'none', padding: '18px', borderRadius: '8px', fontWeight: 600, fontSize: '1rem', cursor: 'pointer' }}>
                  {recoveryLoading ? 'ENVIANDO...' : 'ENVIAR LINK'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- FOOTER --- */}
      <footer style={{ textAlign: 'center', padding: '40px', color: textMuted, fontSize: '0.85rem' }}>
        <p>KomandaPRO © {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}