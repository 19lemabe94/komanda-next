'use client'
import { useState, CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import { colors } from '../styles/theme'
import { BrandLogo } from './BrandLogo'
import { BackupModal } from './BackupModal'

// --- ÍCONES SVG (Usam 'currentColor' para trocar de cor automaticamente) ---
const IconHome = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
)
const IconHistory = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
)
const IconClients = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
)
const IconChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
)
const IconMenu = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
)
const IconFood = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>
)
const IconTeam = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
)
const IconSave = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
)
const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
)

interface HeaderProps {
  userRole?: string | null
  subtitle?: string
}

export function Header({ userRole, subtitle = 'OPERAÇÃO' }: HeaderProps) {
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isBackupOpen, setIsBackupOpen] = useState(false)

  // Cor Grená Padrão
  const grenaColor = '#800020'

  // --- ESTILOS GERAIS (Layout apenas) ---
  // Removi cores daqui para o CSS controlar 100%
  const btnBaseStyle = {
    borderRadius: '12px',           
    padding: '10px 18px',          
    fontSize: '0.8rem',             
    fontWeight: 800, 
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center', 
    gap: '8px', 
    whiteSpace: 'nowrap' as 'nowrap',
    transition: 'all 0.2s ease',
    textTransform: 'uppercase' as 'uppercase'
  }

  // --- ESTILOS MOBILE ---
  const mobileBtnStyle = {
    ...btnBaseStyle,
    width: '100%',
    justifyContent: 'flex-start',
    padding: '16px',
    fontSize: '1rem',
    border: `1px solid #f1f5f9`,
    // Mobile mantém fundo branco padrão
    background: 'white',
    color: colors.text
  }

  const hamburgerLineStyle: CSSProperties = {
    height: '3px', width: '28px', backgroundColor: grenaColor, borderRadius: '4px',
    transition: 'all 0.3s ease', position: 'absolute',
  }
  const line1Transform = isMobileMenuOpen ? 'rotate(45deg) translateY(0)' : 'translateY(-8px)'
  const line2Opacity = isMobileMenuOpen ? 0 : 1
  const line3Transform = isMobileMenuOpen ? 'rotate(-45deg) translateY(0)' : 'translateY(8px)'

  // Overlay do Menu Mobile
  const MobileMenuOverlay = () => (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 90, backdropFilter: 'blur(4px)' }} onClick={() => setIsMobileMenuOpen(false)}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '320px', background: 'white', padding: '30px 20px', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '-10px 0 30px rgba(0,0,0,0.1)', borderTopLeftRadius: '20px', borderBottomLeftRadius: '20px' }}>
        
        <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <div>
             <span style={{ fontSize: '0.75rem', color: colors.textMuted, textTransform: 'uppercase', fontWeight: 800 }}>Menu Principal</span>
             <h3 style={{ margin: '5px 0 0 0', color: grenaColor, fontSize: '1.5rem' }}>Navegação</h3>
           </div>
           <button onClick={() => setIsMobileMenuOpen(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '1.2rem', color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
        </div>
        
        <button onClick={() => { router.push('/'); setIsMobileMenuOpen(false); }} style={{...mobileBtnStyle, color: grenaColor}}>
            <IconHome /> Início
        </button>
        <button onClick={() => { router.push('/vendas'); setIsMobileMenuOpen(false); }} style={{...mobileBtnStyle, color: grenaColor}}>
            <IconHistory /> Histórico
        </button>
        
        {userRole === 'admin' && (
          <>
            <div style={{ height: '1px', background: colors.border, margin: '10px 0', opacity: 0.5 }}></div>
            <span style={{ paddingLeft: '10px', fontSize: '0.75rem', color: colors.textMuted, fontWeight: 800, textTransform: 'uppercase' }}>Gerência</span>
            
            <button onClick={() => { router.push('/clients'); setIsMobileMenuOpen(false); }} style={{...mobileBtnStyle, color: grenaColor}}>
                <IconClients /> Clientes
            </button>
            <button onClick={() => { router.push('/reports'); setIsMobileMenuOpen(false); }} style={{...mobileBtnStyle, color: grenaColor}}>
                <IconChart /> Relatórios
            </button>
            <button onClick={() => { router.push('/products'); setIsMobileMenuOpen(false); }} style={{...mobileBtnStyle, color: grenaColor}}>
                <IconFood /> Cardápio
            </button>
            <button onClick={() => { router.push('/squad'); setIsMobileMenuOpen(false); }} style={{...mobileBtnStyle, color: grenaColor}}>
                <IconTeam /> Equipe
            </button>
            <button onClick={() => { setIsBackupOpen(true); setIsMobileMenuOpen(false); }} style={{ ...mobileBtnStyle, color: '#2563eb', border: '1px dashed #2563eb' }}>
                <IconSave /> Backup
            </button>
          </>
        )}
        
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={{ ...mobileBtnStyle, backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', marginTop: 'auto' }}>
            <IconLogout /> Sair
        </button>
      </div>
    </div>
  )

  return (
    <>
      <style jsx global>{`
        .desktop-nav { display: none !important; }
        .mobile-hamburger { display: flex !important; }
        
        /* CLASSE PODEROSA: GRENÁ + HOVER INVERTIDO 
           Usa !important para garantir que sobrescreva qualquer estilo padrão
        */
        .nav-btn-grena {
            color: #800020 !important;
            background-color: white !important;
            border: 1px solid #e2e8f0 !important;
        }
        
        /* INVERSÃO DE CORES NO HOVER */
        .nav-btn-grena:hover {
            background-color: #800020 !important;
            color: white !important;
            border-color: #800020 !important;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(128, 0, 32, 0.25) !important;
        }

        /* Garante que o ícone SVG dentro mude de cor também */
        .nav-btn-grena:hover svg {
            stroke: white !important;
        }

        @media (min-width: 950px) {
          .desktop-nav { display: flex !important; align-items: center; gap: 12px; }
          .mobile-hamburger { display: none !important; }
        }
      `}</style>

      <header style={{ width: '100%', backgroundColor: 'white', borderBottom: `1px solid ${colors.border}`, padding: '0 30px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', position: 'sticky', top: 0, zIndex: 50 }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <BrandLogo size={42} color={grenaColor} />
          <div style={{ lineHeight: 1 }}>
            <span style={{ fontWeight: 900, color: grenaColor, display: 'block', fontSize: '1.5rem', letterSpacing: '-1px' }}>KOMANDA</span>
            <span style={{ fontSize: '0.75rem', color: colors.textMuted, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px' }}>{subtitle}</span>
          </div>
        </div>

        <div>
          {/* MENU DESKTOP */}
          <nav className="desktop-nav">
             <button onClick={() => router.push('/')} style={btnBaseStyle} className="nav-btn-grena">
                <IconHome /> INÍCIO
             </button>
             <button onClick={() => router.push('/vendas')} style={btnBaseStyle} className="nav-btn-grena">
                <IconHistory /> HISTÓRICO
             </button>

             {userRole === 'admin' && (
               <>
                 <div style={{ width: '1px', height: '30px', background: colors.border, margin: '0 5px' }}></div>
                 
                 <button onClick={() => router.push('/clients')} style={btnBaseStyle} className="nav-btn-grena">
                    <IconClients /> CLIENTES
                 </button>
                 
                 <button onClick={() => router.push('/reports')} style={btnBaseStyle} className="nav-btn-grena">
                    <IconChart /> KPIS
                 </button>
                 <button onClick={() => router.push('/products')} style={btnBaseStyle} className="nav-btn-grena">
                    <IconFood /> MENU
                 </button>
                 <button onClick={() => router.push('/squad')} style={btnBaseStyle} className="nav-btn-grena">
                    <IconTeam /> SQUAD
                 </button>
                 <button onClick={() => setIsBackupOpen(true)} style={{ ...btnBaseStyle, border: '1px dashed #3b82f6', color: '#2563eb' }} title="Salvar Dados">
                    <IconSave />
                 </button>
               </>
             )}
             <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }} style={{ ...btnBaseStyle, backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', marginLeft: '5px' }} title="Sair">
                <IconLogout />
             </button>
          </nav>

          {/* BOTÃO HAMBURGUER MOBILE */}
          <button 
              className="mobile-hamburger"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              style={{ 
                border: 'none', background: 'none', cursor: 'pointer', padding: '10px', 
                alignItems: 'center', justifyContent: 'center',
                width: '50px', height: '50px', position: 'relative', zIndex: 100 
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
      
      {isBackupOpen && <BackupModal onClose={() => setIsBackupOpen(false)} />}
    </>
  )
}