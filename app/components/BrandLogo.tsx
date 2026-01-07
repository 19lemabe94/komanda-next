import React from 'react';

interface LogoProps {
  size?: number;   // Tamanho opcional (padrão 60)
  color?: string;  // Cor opcional (padrão #000)
}

export const BrandLogo = ({ size = 60, color = '#800020' }: LogoProps) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block' }}
    >
      {/* O Prato (Base) */}
      <path 
        d="M3 19H21" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      
      {/* A Campânula (Domo) */}
      <path 
        d="M12 4C7.58172 4 4 7.58172 4 12V16H20V12C20 7.58172 16.4183 4 12 4Z" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      
      {/* A Alça da tampa */}
      <path 
        d="M12 2V4" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      
      {/* Um pequeno detalhe de brilho/corte para dar estilo */}
      <path 
        d="M16 9L15 11" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeOpacity="0.4"
      />
    </svg>
  );
};