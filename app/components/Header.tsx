'use client'
import { useState, CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import { colors } from '../styles/theme'
import { BrandLogo } from './BrandLogo'

interface HeaderProps {
  userRole?: string | null // Passamos a função (admin/user) para saber quais botões mostrar
  subtitle?: string        // Texto abaixo do logo (Ex: OPERAÇÃO, RELATÓRIOS)
}

export function Header({ userRole, subtitle = 'OPERAÇÃO' }: HeaderProps) {
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // --- ESTILOS E ANIMAÇÕES ---
  const navBtnStyle = {
    background: 'white', border: `1px solid ${colors.border}`, borderRadius: '8px',
    padding: '8px 14px', color: colors.text, fontSize: '0.9rem', fontWeight: 600,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' as 'nowrap'
  }

  const hamburgerLineStyle: CSSProperties = {
    height: '3px', width: '28px', backgroundColor: colors.primary, borderRadius: '3px',
    transition: 'all 0.3s ease', position: 'absolute',
  }

  const line1Transform = isMobileMenuOpen ? 'rotate(45deg) translateY(0)' : 'translateY(-9px)'
  const line2Opacity = isMobileMenuOpen ? 0 : 1
  const line3Transform = isMobileMenuOpen ? 'rotate(-45deg) translateY(0)' : 'translateY(9px)'

  // Overlay do Menu Mobile
  const MobileMenuOverlay = () => (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 90, backdropFilter: 'blur(2px)' }} onClick={() => setIsMobileMenuOpen(false)}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '280px', background: 'white', padding: '30px 20px', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '-5px 0 25px rgba(0,0,0,0.15)', borderTopLeftRadius: '20px', borderBottomLeftRadius: '20px' }}>
        <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: `1px solid ${colors.border}` }}>
           <span style={{ fontSize: '0.75rem', color: colors.textMuted, textTransform: 'uppercase', fontWeight: 800 }}>Menu Principal</span>
           <h3 style={{ margin: '5px 0 0 0', color: colors.primary, fontSize: '1.5rem' }}>Navegação</h3>
        </div>
        
        <button onClick={() => router.push('/')} style={navBtnStyle}>🏠 Início</button>
        <button onClick={() => router.push('/vendas')} style={navBtnStyle}>💰 Histórico</button>
        {userRole === 'admin' && (
          <>
            <div style={{ height: '1px', background: colors.border, margin: '10px 0' }}></div>
            <button onClick={() => router.push('/reports')} style={navBtnStyle}>📈 Relatórios</button>
            <button onClick={() => router.push('/products')} style={navBtnStyle}>🍔 Cardápio</button>
            <button onClick={() => router.push('/squad')} style={navBtnStyle}>👥 Equipe</button>
          </>
        )}
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={{ ...navBtnStyle, backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', marginTop: 'auto', justifyContent: 'center' }}>Sair</button>
      </div>
    </div>
  )

  return (
    <>
      {/* CSS Global para Responsividade deste componente */}
      <style jsx global>{`
        .desktop-nav { display: none !important; }
        .mobile-hamburger { display: flex !important; }
        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; align-items: center; gap: 10px; }
          .mobile-hamburger { display: none !important; }
        }
      `}</style>

      <header style={{ width: '100%', backgroundColor: 'white', borderBottom: `1px solid ${colors.border}`, padding: '0 20px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <BrandLogo size={36} color={colors.primary} />
          <div style={{ lineHeight: 1 }}>
            <span style={{ fontWeight: 800, color: colors.primary, display: 'block' }}>KOMANDA</span>
            <span style={{ fontSize: '0.65rem', color: colors.textMuted, textTransform: 'uppercase', fontWeight: 700 }}>{subtitle}</span>
          </div>
        </div>

        <div>
          {/* MENU DESKTOP */}
          <nav className="desktop-nav">
             <button onClick={() => router.push('/')} style={navBtnStyle}>🏠 Início</button>
             <button onClick={() => router.push('/vendas')} style={navBtnStyle}>💰 Histórico</button>
             {userRole === 'admin' && (
               <>
                 <button onClick={() => router.push('/reports')} style={navBtnStyle}>📈 Kpis</button>
                 <button onClick={() => router.push('/products')} style={navBtnStyle}>🍔 Menu</button>
                 <button onClick={() => router.push('/squad')} style={navBtnStyle}>👥 Squad</button>
               </>
             )}
             <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={{ ...navBtnStyle, backgroundColor: colors.errorBg, color: colors.errorText, border: 'none', marginLeft: '10px' }}>Sair</button>
          </nav>

          {/* MENU MOBILE (HAMBURGUER) */}
          <button 
             className="mobile-hamburger"
             onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
             style={{ 
               border: 'none', background: 'none', cursor: 'pointer', padding: '5px', 
               alignItems: 'center', justifyContent: 'center',
               width: '45px', height: '45px', position: 'relative', zIndex: 100 
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