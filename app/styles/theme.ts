import { CSSProperties } from 'react'

// 1. Nova Paleta (Branco, Cinza e Grená)
export const colors = {
  bg: '#f1f5f9',          // Cinza Claro (Fundo da tela - Slate 100)
  card: '#ffffff',        // Branco Puro (Card)
  border: '#cbd5e1',      // Cinza Médio (Bordas - Slate 300)
  
  primary: '#800020',     // GRENÁ (Burgundy)
  primaryHover: '#5a0016',// Grená mais escuro para o hover
  
  text: '#1e293b',        // Cinza Escuro quase preto (Slate 800)
  textMuted: '#64748b',   // Cinza Texto (Slate 500)
  
  inputBg: '#f8fafc',     // Fundo do input (quase branco - Slate 50)
  
  errorBg: '#fee2e2',     // Fundo Vermelho claro
  errorText: '#991b1b',   // Vermelho Escuro
  
  successBg: '#dcfce7',   // Fundo Verde claro
  successText: '#166534'  // Verde Escuro
}

// 2. Estilos Reutilizáveis atualizados
export const globalStyles: { [key: string]: CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    position: 'relative',
    overflow: 'hidden',
    fontFamily: 'sans-serif',
    color: colors.text
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    backgroundColor: colors.card,
    // Sombra mais suave para tema claro
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
    border: `1px solid ${colors.border}`,
    borderRadius: '16px',
    padding: '40px 32px', // Um pouco mais de espaço vertical
    position: 'relative',
    zIndex: 10
  },
  input: {
    width: '100%',
    padding: '16px',
    borderRadius: '8px', // Bordas um pouco menos arredondadas ficam mais sérias
    backgroundColor: colors.inputBg,
    border: `1px solid ${colors.border}`,
    color: colors.text, // Texto escuro agora
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: '20px',
    transition: 'border-color 0.2s'
  },
  buttonPrimary: {
    width: '100%',
    padding: '16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: colors.primary, // Cor sólida Grená fica mais elegante que gradiente aqui
    color: '#ffffff', // Texto branco no botão grená
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '1rem',
    marginTop: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  // Mantemos o glow, mas faremos ele cinza para dar textura sutil
  glow: {
    position: 'absolute',
    width: '600px',
    height: '600px',
    borderRadius: '50%',
    filter: 'blur(120px)',
    zIndex: 0,
    opacity: 0.5
  }
}