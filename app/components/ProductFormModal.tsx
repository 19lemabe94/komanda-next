'use client'
import { useState, useEffect } from 'react'
import { colors, globalStyles } from '../styles/theme'

interface Product {
  id: string
  name: string
  price: number
  category: string
  description?: string
  active: boolean
  org_id: string
}

interface Category { id: string, name: string, color: string }

interface Props {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<Product, 'id' | 'org_id'>) => void
  initialData?: Product
  categories: Category[]
}

export function ProductFormModal({ isOpen, onClose, onSave, initialData, categories }: Props) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (initialData) {
      setName(initialData.name)
      setPrice(initialData.price.toString())
      setCategory(initialData.category)
      setDescription(initialData.description || '')
    } else {
      setName('')
      setPrice('')
      setCategory(categories[0]?.name || '')
      setDescription('')
    }
  }, [initialData, isOpen, categories])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !price || !category) return alert('Preencha os campos obrigatórios')
    
    onSave({
      name,
      price: parseFloat(price.replace(',', '.')),
      category,
      description,
      active: true
    })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
      <div style={{ ...globalStyles.card, width: '90%', maxWidth: '400px', padding: '25px' }}>
        <h2 style={{ margin: '0 0 20px', color: colors.primary }}>{initialData ? 'Editar Produto' : 'Novo Produto'}</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: colors.textMuted, fontSize: '0.9rem' }}>Nome</label>
            <input autoFocus placeholder="Ex: X-Tudo" value={name} onChange={e => setName(e.target.value)} style={globalStyles.input} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: colors.textMuted, fontSize: '0.9rem' }}>Preço (R$)</label>
            <input type="number" step="0.01" placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)} style={globalStyles.input} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: colors.textMuted, fontSize: '0.9rem' }}>Categoria</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...globalStyles.input, backgroundColor: 'white' }}>
              <option value="" disabled>Selecione...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', color: colors.textMuted, fontSize: '0.9rem' }}>Descrição (Opcional)</label>
            <input placeholder="Ex: Pão, carne, queijo..." value={description} onChange={e => setDescription(e.target.value)} style={globalStyles.input} />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #ccc', background: 'transparent', cursor: 'pointer', fontWeight: 'bold', color: colors.textMuted }}>Cancelar</button>
            <button type="submit" style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: colors.primary, color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Salvar</button>
          </div>
        </form>
      </div>
    </div>
  )
}