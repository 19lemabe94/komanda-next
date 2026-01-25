import { ImageResponse } from 'next/og'

// Metadados da imagem (tamanho padrão Apple)
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

// Geração da Imagem
export default function Icon() {
  return new ImageResponse(
    (
      // Elemento JSX que vira imagem
      <div
        style={{
          fontSize: 24,
          background: '#800020', // Fundo Vinho
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white', // Ícone Branco
          borderRadius: '20%', // Borda levemente arredondada (estilo App)
        }}
      >
        {/* SVG da BrandLogo adaptado para JSX puro dentro do ImageResponse */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M3 19H21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 4C7.58172 4 4 7.58172 4 12V16H20V12C20 7.58172 16.4183 4 12 4Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 2V4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 9L15 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.4" />
        </svg>
      </div>
    ),
    { ...size }
  )
}