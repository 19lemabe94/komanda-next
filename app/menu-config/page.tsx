'use client'

import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Header } from '../components/Header'
import { colors, globalStyles } from '../styles/theme'

type DeliveryFee = {
  id: string
  neighborhood: string
  fee: number
}

export default function MenuConfigPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [saved, setSaved] = useState(false)

  // Estados para as Taxas de Entrega
  const [fees, setFees] = useState<DeliveryFee[]>([])
  const [newBairro, setNewBairro] = useState('')
  const [newTaxa, setNewTaxa] = useState('')
  const [addingFee, setAddingFee] = useState(false)

  const [form, setForm] = useState({
    restaurant_name: '',
    tagline: '',
    primary_color: '#800020',
    logo_url: '',
    whatsapp: '',
    address: '',
  })

  useEffect(() => { init() }, [])

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'admin') { router.push('/dashboard'); return }

    setUserRole(profile.role)
    setOrgId(profile.org_id)

    // Busca as configurações do cardápio
    const { data: config } = await supabase
      .from('menu_config')
      .select('*')
      .eq('org_id', profile.org_id)
      .single()

    if (config) {
      setForm({
        restaurant_name: config.restaurant_name || '',
        tagline: config.tagline || '',
        primary_color: config.primary_color || '#800020',
        logo_url: config.logo_url || '',
        whatsapp: config.whatsapp || '',
        address: config.address || '',
      })
    }

    // Busca as taxas de entrega cadastradas
    await fetchFees(profile.org_id)

    setLoading(false)
  }

  const fetchFees = async (currentOrgId: string) => {
    const { data } = await supabase
      .from('delivery_fees')
      .select('*')
      .eq('org_id', currentOrgId)
      .order('neighborhood', { ascending: true })
    
    if (data) setFees(data)
  }

  const handleAddFee = async (e: FormEvent) => {
    e.preventDefault()
    if (!orgId || !newBairro.trim() || !newTaxa) return
    setAddingFee(true)

    // Troca vírgula por ponto para o banco aceitar casas decimais corretamente
    const feeValue = parseFloat(newTaxa.replace(',', '.'))

    const { error } = await supabase.from('delivery_fees').insert([{
      org_id: orgId,
      neighborhood: newBairro.trim(),
      fee: feeValue
    }])

    if (!error) {
      setNewBairro('')
      setNewTaxa('')
      await fetchFees(orgId)
    } else {
      alert('Erro ao adicionar taxa: ' + error.message)
    }
    setAddingFee(false)
  }

  const handleDeleteFee = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este bairro?')) return
    const { error } = await supabase.from('delivery_fees').delete().eq('id', id)
    if (!error && orgId) {
      await fetchFees(orgId)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !orgId) return
    setLogoUploading(true)

    const path = `logos/${orgId}/logo`

    await supabase.storage.from('product-images').remove([path])

    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (!error) {
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path)
      const urlWithCache = `${urlData.publicUrl}?t=${Date.now()}`
      setForm(f => ({ ...f, logo_url: urlWithCache }))
    } else {
      alert('Erro no upload: ' + error.message)
    }
    setLogoUploading(false)
  }

  const handleRemoveLogo = () => {
    if (!confirm('Remover o logo do cardápio?')) return
    setForm(f => ({ ...f, logo_url: '' }))
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!orgId) return
    setSaving(true)

    const { error } = await supabase.from('menu_config').upsert({
      org_id: orgId,
      ...form,
      updated_at: new Date().toISOString()
    }, { onConflict: 'org_id' })

    if (error) {
      alert('Erro ao salvar: ' + error.message)
      setSaving(false)
      return
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  const menuUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/menu/${orgId}`

  if (loading) return null

  return (
    <div style={{ ...globalStyles.container, justifyContent: 'flex-start', background: '#f8fafc' }}>
      <Header userRole={userRole} subtitle="CARDÁPIO DIGITAL" />

      <main style={{ width: '100%', maxWidth: '700px', padding: '30px 20px', flex: 1 }}>

        {/* LINK DO CARDÁPIO */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '20px 25px', marginBottom: '25px', border: `1px solid ${colors.border}` }}>
          <p style={{ margin: '0 0 8px', fontSize: '0.8rem', fontWeight: 800, color: colors.textMuted, letterSpacing: '1px' }}>LINK DO SEU CARDÁPIO</p>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <code style={{ flex: 1, background: '#f1f5f9', padding: '10px 15px', borderRadius: '10px', fontSize: '0.85rem', color: colors.primary, fontWeight: 700, wordBreak: 'break-all' }}>
              {menuUrl}
            </code>
            <button
              onClick={() => { navigator.clipboard.writeText(menuUrl); alert('Link copiado!') }}
              style={{ padding: '10px 18px', background: colors.primary, color: 'white', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              📋 Copiar
            </button>
            <button
              onClick={() => window.open(menuUrl, '_blank')}
              style={{ padding: '10px 18px', background: '#f1f5f9', color: colors.text, border: `1px solid ${colors.border}`, borderRadius: '10px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              👁️ Ver
            </button>
          </div>
        </div>

        {/* FORMULÁRIO PRINCIPAL */}
        <form onSubmit={handleSave} style={{ background: 'white', borderRadius: '16px', padding: '25px', border: `1px solid ${colors.border}`, marginBottom: '25px' }}>
          <h3 style={{ margin: '0 0 25px', color: colors.text, fontWeight: 800 }}>Configurações do Cardápio</h3>

          {/* LOGO */}
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            {form.logo_url ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={form.logo_url} alt="Logo" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '50%', border: `3px solid ${form.primary_color}` }} />
                  <button type="button" onClick={handleRemoveLogo} style={{ position: 'absolute', top: '-5px', right: '-5px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer', fontWeight: 900, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }} title="Remover logo">✕</button>
                </div>
                <label style={{ display: 'inline-block', padding: '8px 18px', background: '#f1f5f9', border: `1px solid ${colors.border}`, borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>
                  {logoUploading ? 'Enviando...' : '🔄 Trocar Logo'}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} disabled={logoUploading} />
                </label>
              </div>
            ) : (
              <label style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '120px', height: '120px', border: `2px dashed ${colors.border}`, borderRadius: '50%', cursor: 'pointer', color: colors.textMuted, background: '#f8fafc', gap: '8px' }}>
                <span style={{ fontSize: '2rem' }}>📷</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, textAlign: 'center' }}>{logoUploading ? 'Enviando...' : 'Upload do Logo'}</span>
                <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} disabled={logoUploading} />
              </label>
            )}
          </div>

          {[
            { label: 'Nome do Restaurante', key: 'restaurant_name', placeholder: 'Ex: Toca do Bezerra', required: true },
            { label: 'Slogan / Descrição curta', key: 'tagline', placeholder: 'Ex: O melhor da região!' },
            { label: 'WhatsApp (com DDD)', key: 'whatsapp', placeholder: 'Ex: 82999999999' },
            { label: 'Endereço', key: 'address', placeholder: 'Ex: Rua das Flores, 123 - Centro' },
          ].map(field => (
            <div key={field.key} style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: colors.textMuted, marginBottom: '8px' }}>{field.label}</label>
              <input type="text" required={field.required} placeholder={field.placeholder} value={(form as any)[field.key]} onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))} style={{ ...globalStyles.input, width: '100%', padding: '12px 15px' }} />
            </div>
          ))}

          {/* COR PRINCIPAL */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: colors.textMuted, marginBottom: '8px' }}>Cor Principal</label>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <input type="color" value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))} style={{ width: '60px', height: '45px', borderRadius: '10px', border: `1px solid ${colors.border}`, cursor: 'pointer', padding: '2px' }} />
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {['#800020', '#b91c1c', '#15803d', '#1d4ed8', '#7c3aed', '#b45309', '#0f172a'].map(c => (
                  <button key={c} type="button" onClick={() => setForm(f => ({ ...f, primary_color: c }))} style={{ width: '32px', height: '32px', borderRadius: '50%', background: c, border: form.primary_color === c ? '3px solid #0f172a' : '2px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving} style={{ width: '100%', padding: '15px', background: saved ? '#16a34a' : colors.primary, color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', transition: 'background 0.3s' }}>
            {saving ? 'SALVANDO...' : saved ? '✅ SALVO!' : 'SALVAR CONFIGURAÇÕES'}
          </button>
        </form>

        {/* NOVA SEÇÃO: TAXAS DE ENTREGA */}
        <div style={{ background: 'white', borderRadius: '16px', padding: '25px', border: `1px solid ${colors.border}` }}>
          <h3 style={{ margin: '0 0 8px', color: colors.text, fontWeight: 800 }}>Taxas de Entrega</h3>
          <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: colors.textMuted }}>Cadastre os bairros que você atende e o valor do frete.</p>

          <form onSubmit={handleAddFee} style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: 2, minWidth: '150px' }}>
              <input type="text" placeholder="Bairro (ex: Tribobó)" value={newBairro} onChange={e => setNewBairro(e.target.value)} required style={{ ...globalStyles.input, width: '100%', padding: '12px 15px' }} />
            </div>
            <div style={{ flex: 1, minWidth: '100px' }}>
              <input type="number" step="0.01" min="0" placeholder="R$ 0,00" value={newTaxa} onChange={e => setNewTaxa(e.target.value)} required style={{ ...globalStyles.input, width: '100%', padding: '12px 15px' }} />
            </div>
            <button type="submit" disabled={addingFee} style={{ padding: '0 20px', background: colors.primary, color: 'white', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}>
              {addingFee ? '...' : '+ Add'}
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {fees.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.85rem', color: colors.textMuted, textAlign: 'center', fontStyle: 'italic', padding: '20px 0' }}>
                Nenhuma taxa cadastrada.
              </p>
            ) : (
              fees.map(fee => (
                <div key={fee.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', background: '#f8fafc', borderRadius: '10px', border: `1px solid ${colors.border}` }}>
                  <span style={{ fontWeight: 700, color: colors.text }}>{fee.neighborhood}</span>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, color: colors.primary }}>R$ {fee.fee.toFixed(2)}</span>
                    <button type="button" onClick={() => handleDeleteFee(fee.id)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 'bold' }}>
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>
    </div>
  )
}