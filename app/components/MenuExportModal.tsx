'use client'
import { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { colors } from '../styles/theme'

// --- ÍCONES SVG ---
const IconCheck = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
const IconPdf = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
const IconClose = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>

// --- TIPOS ---
interface Category { id: string; name: string }
interface Product { id: string; name: string; price: number; category: string; active: boolean; description?: string }

interface Props {
  isOpen: boolean
  onClose: () => void
  categories: Category[]
  products: Product[]
}

export function MenuExportModal({ isOpen, onClose, categories, products }: Props) {
  const [selectedCats, setSelectedCats] = useState<string[]>([])

  useEffect(() => {
    if (isOpen && categories.length > 0) {
      setSelectedCats(categories.map(c => c.name))
    }
  }, [isOpen, categories])

  if (!isOpen) return null

  const toggleCategory = (catName: string) => {
    if (selectedCats.includes(catName)) {
      setSelectedCats(selectedCats.filter(c => c !== catName))
    } else {
      setSelectedCats([...selectedCats, catName])
    }
  }

  const handleSelectAll = () => {
    if (selectedCats.length === categories.length) setSelectedCats([])
    else setSelectedCats(categories.map(c => c.name))
  }

  const generatePDF = () => {
    const doc = new jsPDF()
    const margin = 15
    const pageWidth = doc.internal.pageSize.width
    
    // --- 1. CABEÇALHO ---
    doc.setFillColor(128, 0, 32) // Grená
    doc.rect(0, 0, pageWidth, 35, 'F') 
    
    doc.setFontSize(24)
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.text("CARDÁPIO", pageWidth / 2, 18, { align: "center" })
    
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(255, 255, 255, 0.8) // Branco com transparência
    const date = new Date().toLocaleDateString('pt-BR')
    doc.text(`Atualizado em: ${date}`, pageWidth / 2, 26, { align: "center" })

    let currentY = 45

    // --- 2. CORPO (Categorias Selecionadas) ---
    const categoriesToPrint = categories.filter(c => selectedCats.includes(c.name))

    categoriesToPrint.forEach((cat) => {
      // Filtra produtos ATIVOS
      const catProducts = products.filter(p => p.category === cat.name && p.active)
      
      if (catProducts.length === 0) return

      // Controle de quebra de página manual para o Título
      if (currentY > 260) {
        doc.addPage()
        currentY = 20
      }

      // Título da Categoria
      doc.setFontSize(13)
      doc.setTextColor(128, 0, 32) // Grená
      doc.setFont("helvetica", "bold")
      doc.text(cat.name.toUpperCase(), margin, currentY)
      
      // Linha separadora da categoria
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.5)
      doc.line(margin, currentY + 3, pageWidth - margin, currentY + 3)

      // Tabela de Produtos (Sem Descrição, Caixa Alta)
      autoTable(doc, {
        startY: currentY + 6,
        head: [['PRODUTO', 'PREÇO']], // Cabeçalho Caixa Alta
        body: catProducts.map(p => [
          p.name.toUpperCase(), // Nome em Caixa Alta
          `R$ ${p.price.toFixed(2)}`
        ]),
        theme: 'grid', // Grid limpo
        headStyles: { 
            fillColor: [255, 255, 255], 
            textColor: [150, 150, 150], 
            fontStyle: 'bold',
            fontSize: 8,
            lineWidth: 0,
            halign: 'left'
        },
        styles: { 
            fontSize: 11, 
            cellPadding: 5,
            textColor: [40, 40, 40],
            font: 'helvetica',
            lineWidth: 0, // Remove bordas verticais internas para visual clean
            valign: 'middle'
        },
        alternateRowStyles: {
            fillColor: [250, 250, 250] // Zebra bem leve
        },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 'auto' }, 
            1: { halign: 'right', fontStyle: 'bold', textColor: [128, 0, 32], cellWidth: 40 }
        },
        margin: { left: margin, right: margin },
      })

      currentY = (doc as any).lastAutoTable.finalY + 12
    })

    // --- 3. RODAPÉ (TEXTO SIMPLES) ---
    const pageCount = (doc as any).internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        const pageHeight = doc.internal.pageSize.height;
        const centerX = pageWidth / 2;
        
        // Texto simples centralizado
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(150, 150, 150); // Cinza discreto
        doc.text("KOMANDA APP", centerX, pageHeight - 15, { align: "center" });
    }

    doc.save('Cardapio.pdf')
    onClose()
  }

  // Styles
  const checkboxStyle = (isSelected: boolean) => ({
    width: '22px', height: '22px', borderRadius: '6px', 
    border: `2px solid ${isSelected ? colors.primary : '#cbd5e1'}`, 
    display: 'flex', alignItems: 'center', justifyContent: 'center', 
    background: isSelected ? colors.primary : 'white',
    color: 'white', transition: 'all 0.1s'
  })

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
      <div style={{ backgroundColor: 'white', width: '90%', maxWidth: '480px', borderRadius: '20px', padding: '0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
        
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <h2 style={{ margin: 0, color: colors.text, fontSize: '1.2rem' }}>Exportar Cardápio</h2>
                <p style={{ margin: '5px 0 0', color: colors.textMuted, fontSize: '0.85rem' }}>Gera um PDF pronto para impressão</p>
            </div>
            <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: colors.textMuted }}><IconClose /></button>
        </div>

        {/* Lista */}
        <div style={{ padding: '10px 20px', overflowY: 'auto', flex: 1 }} className="no-scrollbar">
            <div 
                onClick={handleSelectAll}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', marginBottom: '10px', backgroundColor: '#f8fafc', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, color: colors.text }}
            >
                <div style={checkboxStyle(selectedCats.length === categories.length)}>
                    {selectedCats.length === categories.length && <IconCheck />}
                </div>
                <span>Selecionar Todos ({selectedCats.length}/{categories.length})</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {categories.map(cat => {
                    const isSelected = selectedCats.includes(cat.name)
                    return (
                        <div 
                            key={cat.id} 
                            onClick={() => toggleCategory(cat.name)}
                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', transition: 'background 0.1s', backgroundColor: isSelected ? '#fff1f2' : 'transparent', border: isSelected ? `1px solid #fecdd3` : '1px solid transparent' }}
                        >
                            <div style={checkboxStyle(isSelected)}>
                                {isSelected && <IconCheck />}
                            </div>
                            <span style={{ color: isSelected ? colors.primary : colors.text, fontWeight: isSelected ? 600 : 400 }}>{cat.name}</span>
                        </div>
                    )
                })}
            </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '12px', background: '#fff' }}>
            <button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', color: colors.textMuted, fontWeight: 'bold' }}>Cancelar</button>
            <button 
                onClick={generatePDF} 
                disabled={selectedCats.length === 0}
                style={{ flex: 2, padding: '14px', borderRadius: '12px', border: 'none', background: selectedCats.length === 0 ? '#cbd5e1' : colors.primary, color: 'white', fontWeight: 'bold', cursor: selectedCats.length === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: selectedCats.length > 0 ? '0 4px 6px -1px rgba(128, 0, 32, 0.2)' : 'none' }}
            >
                <IconPdf /> GERAR PDF
            </button>
        </div>

      </div>
    </div>
  )
}