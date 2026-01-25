'use client'
import { useState, CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import { colors } from '../styles/theme'
import { BrandLogo } from './BrandLogo'

interface HeaderProps {
  userRole?: string | null
  subtitle?: string
}

export function Header({ userRole, subtitle = 'OPERAÇÃO' }: HeaderProps) {
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // --- ESTILOS DESKTOP (Agora Robustos e Grandes) ---
  const desktopBtnStyle = {
    background: 'white', 
    border: `1px solid ${colors.border}`, 
    borderRadius: '12px',           // Mais arredondado
    padding: '12px 24px',           // Bem mais espaçoso
    color: colors.text, 
    fontSize: '1.1rem',             // Fonte maior
    fontWeight: 800,                // Negrito forte
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '10px', 
    whiteSpace: 'nowrap' as 'nowrap',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', // Sombra elegante
    transition: 'transform 0.1s'
  }

  // --- ESTILOS MOBILE ---
  const mobileBtnStyle = {
    background: 'white', 
    border: `1px solid ${colors.border}`, 
    borderRadius: '12px',
    padding: '16px',
    color: colors.text, 
    fontSize: '1.2rem',
    fontWeight: 700,
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: '12px',
    width: '100%',
    boxShadow: '0 2px 5px rgba(0,0,0,0.03)'
  }

  // --- ANIMAÇÃO HAMBURGUER ---
  const hamburgerLineStyle: CSSProperties = {
    height: '4px', width: '32px', backgroundColor: colors.primary, borderRadius: '4px',
    transition: 'all 0.3s ease', position: 'absolute',
  }
  const line1Transform = isMobileMenuOpen ? 'rotate(45deg) translateY(0)' : 'translateY(-10px)'
  const line2Opacity = isMobileMenuOpen ? 0 : 1
  const line3Transform = isMobileMenuOpen ? 'rotate(-45deg) translateY(0)' : 'translateY(10px)'

  // Overlay do Menu Mobile
  const MobileMenuOverlay = () => (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 90, backdropFilter: 'blur(3px)' }} onClick={() => setIsMobileMenuOpen(false)}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '300px', background: 'white', padding: '30px 20px', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '-5px 0 25px rgba(0,0,0,0.15)', borderTopLeftRadius: '20px', borderBottomLeftRadius: '20px' }}>
        
        <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <div>
             <span style={{ fontSize: '0.75rem', color: colors.textMuted, textTransform: 'uppercase', fontWeight: 800 }}>Menu Principal</span>
             <h3 style={{ margin: '5px 0 0 0', color: colors.primary, fontSize: '1.5rem' }}>Navegação</h3>
           </div>
           <button onClick={() => setIsMobileMenuOpen(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '45px', height: '45px', fontSize: '1.5rem', color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
        </div>
        
        <button onClick={() => { router.push('/'); setIsMobileMenuOpen(false); }} style={mobileBtnStyle}>🏠 Início</button>
        <button onClick={() => { router.push('/vendas'); setIsMobileMenuOpen(false); }} style={mobileBtnStyle}>💰 Histórico</button>
        
        {userRole === 'admin' && (
          <>
            <div style={{ height: '1px', background: colors.border, margin: '10px 0', opacity: 0.5 }}></div>
            <span style={{ textAlign: 'center', fontSize: '0.8rem', color: colors.textMuted, fontWeight: 800, textTransform: 'uppercase' }}>Gerência</span>
            <button onClick={() => { router.push('/reports'); setIsMobileMenuOpen(false); }} style={mobileBtnStyle}>📈 Relatórios</button>
            <button onClick={() => { router.push('/products'); setIsMobileMenuOpen(false); }} style={mobileBtnStyle}>🍔 Cardápio</button>
            <button onClick={() => { router.push('/squad'); setIsMobileMenuOpen(false); }} style={mobileBtnStyle}>👥 Equipe</button>
          </>
        )}
        
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={{ ...mobileBtnStyle, backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', marginTop: 'auto' }}>Sair</button>
      </div>
    </div>
  )

  return (
    <>
      <style jsx global>{`
        .desktop-nav { display: none !important; }
        .mobile-hamburger { display: flex !important; }
        /* Aumentei o breakpoint para 900px, assim tablets pequenos já pegam o menu mobile, 
           e telas grandes pegam o menu desktop robusto */
        @media (min-width: 900px) {
          .desktop-nav { display: flex !important; align-items: center; gap: 15px; }
          .mobile-hamburger { display: none !important; }
        }
      `}</style>

      {/* AUMENTO DA ALTURA DO HEADER PARA 100px */}
      <header style={{ width: '100%', backgroundColor: 'white', borderBottom: `1px solid ${colors.border}`, padding: '0 30px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', position: 'sticky', top: 0, zIndex: 50 }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {/* LOGO MAIOR */}
          <BrandLogo size={48} color={colors.primary} />
          <div style={{ lineHeight: 1 }}>
            {/* TEXTO KOMANDA MAIOR */}
            <span style={{ fontWeight: 900, color: colors.primary, display: 'block', fontSize: '1.6rem', letterSpacing: '-1px' }}>KOMANDA</span>
            <span style={{ fontSize: '0.8rem', color: colors.textMuted, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px' }}>{subtitle}</span>
          </div>
        </div>

        <div>
          {/* MENU DESKTOP ROBUSTO */}
          <nav className="desktop-nav">
             <button onClick={() => router.push('/')} style={desktopBtnStyle}>🏠 INÍCIO</button>
             <button onClick={() => router.push('/vendas')} style={desktopBtnStyle}>💰 HISTÓRICO</button>
             {userRole === 'admin' && (
               <>
                 <div style={{ width: '1px', height: '40px', background: colors.border, margin: '0 5px' }}></div>
                 <button onClick={() => router.push('/reports')} style={desktopBtnStyle}>📈 KPIS</button>
                 <button onClick={() => router.push('/products')} style={desktopBtnStyle}>🍔 MENU</button>
                 <button onClick={() => router.push('/squad')} style={desktopBtnStyle}>👥 SQUAD</button>
               </>
             )}
             <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={{ ...desktopBtnStyle, backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', marginLeft: '10px' }}>SAIR</button>
          </nav>

          {/* BOTÃO MOBILE */}
          <button 
             className="mobile-hamburger"
             onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
             style={{ 
               border: 'none', background: 'none', cursor: 'pointer', padding: '10px', 
               alignItems: 'center', justifyContent: 'center',
               width: '60px', height: '60px', position: 'relative', zIndex: 100 
             }}
             aria-label="Menu"
           >
             <div style={{ ...hamburgerLineStyle, transform: line1Transform }} />
             <div style={{ ...hamburgerLineStyle, opacity: line2Opacity }} />
             <div style={{ ...hamburgerLineStyle, transform: line3Transform }} />
           </button>
        </div>
      </header>

      {isMobileMenuOpen && <MobileMenuOverlay />}
    </>
  )
}