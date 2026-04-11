'use client'

import { useState, CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import { colors } from '../styles/theme'
import { BrandLogo } from './BrandLogo'
import { BackupModal } from './BackupModal'

// --- ÍCONES SVG ---
const IconHome = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
)
const IconHistory = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
)
const IconClients = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
)
const IconChart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
)
const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
)
const IconFood = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>
)
const IconTeam = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
)
const IconExpenses = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
)
const IconQr = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><rect x="14" y="14" width="4" height="4"></rect></svg>
)
const IconSave = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
)
const IconLogout = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
)

interface HeaderProps {
  userRole?: string | null
  subtitle?: string
}

export function Header({ userRole, subtitle = 'OPERAÇÃO' }: HeaderProps) {
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isBackupOpen, setIsBackupOpen] = useState(false)
  const grenaColor = '#800020'

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
    border: `1px solid transparent`,
    transition: 'all 0.2s ease',
    textTransform: 'uppercase' as 'uppercase'
  }

  const mobileBtnStyle = {
    ...btnBaseStyle,
    width: '100%',
    justifyContent: 'flex-start',
    padding: '18px 20px',
    fontSize: '1.1rem',
    border: `1px solid #f1f5f9`,
    background: 'white',
    color: colors.text,
    marginBottom: '8px'
  }

  const hamburgerLineStyle: CSSProperties = {
    height: '3px', width: '28px', backgroundColor: grenaColor, borderRadius: '4px',
    transition: 'all 0.3s ease', position: 'absolute',
  }

  const line1Transform = isMobileMenuOpen ? 'rotate(45deg) translateY(0)' : 'translateY(-8px)'
  const line2Opacity = isMobileMenuOpen ? 0 : 1
  const line3Transform = isMobileMenuOpen ? 'rotate(-45deg) translateY(0)' : 'translateY(8px)'

  const MobileMenuOverlay = () => (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 90, backdropFilter: 'blur(4px)' }} onClick={() => setIsMobileMenuOpen(false)}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute',
          right: 0, top: 0, bottom: 0,
          width: '85%',
          maxWidth: '400px',
          background: 'white',
          padding: '25px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-5px 0 25px rgba(0,0,0,0.2)',
          borderTopLeftRadius: '20px',
          borderBottomLeftRadius: '20px',
          overflowY: 'auto'
        }}
      >
        {/* CABEÇALHO DO MENU */}
        <div style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: `2px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: colors.textMuted, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px' }}>Menu Principal</span>
            <h3 style={{ margin: '5px 0 0 0', color: grenaColor, fontSize: '1.8rem', fontWeight: 900 }}>Navegação</h3>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} style={{ background: '#f8fafc', border: 'none', borderRadius: '50%', width: '45px', height: '45px', fontSize: '1.4rem', color: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</button>
        </div>

        {/* NAVEGAÇÃO MOBILE */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <button onClick={() => { router.push('/dashboard'); setIsMobileMenuOpen(false); }} style={{...mobileBtnStyle, color: grenaColor}}>
            <IconHome /> Início
          </button>
          <button onClick={() => { router.push('/vendas'); setIsMobileMenuOpen(false); }} style={{...mobileBtnStyle, color: grenaColor}}>
            <IconHistory /> Histórico
          </button>

          {userRole === 'admin' && (
            <>
              <div style={{ margin: '15px 0', paddingLeft: '10px' }}>
                <span style={{ fontSize: '0.75rem', color: colors.textMuted, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>Gerência</span>
              </div>
              <button onClick={() => { router.push('/clients'); setIsMobileMenuOpen(false); }} style={{...mobileBtnStyle, color: grenaColor}}>
                <IconClients /> Clientes
              </button>
              <button onClick={() => { router.push('/reports'); setIsMobileMenuOpen(false); }} style={{...mobileBtnStyle, color: grenaColor}}>
                <IconChart /> Relatórios
              </button>
              <button onClick={() => { router.push('/products'); setIsMobileMenuOpen(false); }} style={{...mobileBtnStyle, color: grenaColor}}>
                <IconFood /> Cardápio
              </button>
              <button onClick={() => { router.push('/expenses'); setIsMobileMenuOpen(false); }} style={{...mobileBtnStyle, color: grenaColor}}>
                <IconExpenses /> Despesas
              </button>
              <button onClick={() => { router.push('/menu-config'); setIsMobileMenuOpen(false); }} style={{...mobileBtnStyle, color: grenaColor}}>
                <IconQr /> Cardápio Digital
              </button>
              <button onClick={() => { router.push('/squad'); setIsMobileMenuOpen(false); }} style={{...mobileBtnStyle, color: grenaColor}}>
                <IconTeam /> Equipe
              </button>
              <button onClick={() => { setIsBackupOpen(true); setIsMobileMenuOpen(false); }} style={{ ...mobileBtnStyle, color: '#2563eb', border: '1px dashed #2563eb' }}>
                <IconSave /> Backup
              </button>
            </>
          )}
        </div>

        {/* RODAPÉ */}
        <div style={{ marginTop: '20px', borderTop: `1px solid ${colors.border}`, paddingTop: '20px' }}>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }} style={{ ...mobileBtnStyle, backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', justifyContent: 'center' }}>
            <IconLogout /> SAIR DO SISTEMA
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <style jsx global>{`
        .desktop-nav { display: none !important; }
        .mobile-hamburger { display: flex !important; }
        .nav-btn-grena {
          color: #800020 !important;
          background-color: white !important;
          border: 1px solid #e2e8f0 !important;
        }
        .nav-btn-grena:hover {
          background-color: #800020 !important;
          color: white !important;
          border-color: #800020 !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(128, 0, 32, 0.25) !important;
        }
        .nav-btn-grena:hover svg { stroke: white !important; }
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
            <button onClick={() => router.push('/dashboard')} style={btnBaseStyle} className="nav-btn-grena">
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
                <button onClick={() => router.push('/expenses')} style={btnBaseStyle} className="nav-btn-grena">
                  <IconExpenses /> DESPESAS
                </button>
                <button onClick={() => router.push('/menu-config')} style={btnBaseStyle} className="nav-btn-grena">
                  <IconQr /> CARDÁPIO
                </button>
                <button onClick={() => router.push('/squad')} style={btnBaseStyle} className="nav-btn-grena">
                  <IconTeam /> SQUAD
                </button>
                <button onClick={() => setIsBackupOpen(true)} style={{ ...btnBaseStyle, border: '1px dashed #3b82f6', color: '#2563eb' }} title="Salvar Dados">
                  <IconSave />
                </button>
              </>
            )}

            <button onClick={async () => { await supabase.auth.signOut(); router.push('/') }} style={{ ...btnBaseStyle, backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', marginLeft: '5px' }} title="Sair">
              <IconLogout />
            </button>
          </nav>

          {/* HAMBURGUER MOBILE */}
          <button
            className="mobile-hamburger"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '10px', alignItems: 'center', justifyContent: 'center', width: '50px', height: '50px', position: 'relative', zIndex: 100 }}
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