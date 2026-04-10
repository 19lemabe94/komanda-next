'use client'

import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { Header } from '../components/Header'
import { colors, globalStyles } from '../styles/theme'

export default function MenuConfigPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [saved, setSaved] = useState(false)

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

    setLoading(false)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !orgId) return
    setLogoUploading(true)

    const ext = file.name.split('.').pop()
    const path = `logos/${orgId}.${ext}`

    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: true })

    if (!error) {
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(path)
      setForm(f => ({ ...f, logo_url: urlData.publicUrl }))
    }
    setLogoUploading(false)
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!orgId) return
    setSaving(true)

    await supabase.from('menu_config').upsert({
      org_id: orgId,
      ...form,
      updated_at: new Date().toISOString()
    }, { onConflict: 'org_id' })

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

        {/* FORMULÁRIO */}
        <form onSubmit={handleSave} style={{ background: 'white', borderRadius: '16px', padding: '25px', border: `1px solid ${colors.border}` }}>
          <h3 style={{ margin: '0 0 25px', color: colors.text, fontWeight: 800 }}>Configurações do Cardápio</h3>

          {/* LOGO */}
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            {form.logo_url && (
              <img src={form.logo_url} alt="Logo" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '50%', marginBottom: '10px', border: `3px solid ${form.primary_color}` }} />
            )}
            <div>
              <label style={{ display: 'inline-block', padding: '10px 20px', background: '#f1f5f9', border: `1px solid ${colors.border}`, borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem' }}>
                {logoUploading ? 'Enviando...' : '📷 Upload do Logo'}
                <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
              </label>
            </div>
          </div>

          {[
            { label: 'Nome do Restaurante', key: 'restaurant_name', placeholder: 'Ex: Toca do Bezerra', required: true },
            { label: 'Slogan / Descrição curta', key: 'tagline', placeholder: 'Ex: O melhor da região!' },
            { label: 'WhatsApp (com DDD)', key: 'whatsapp', placeholder: 'Ex: 82999999999' },
            { label: 'Endereço', key: 'address', placeholder: 'Ex: Rua das Flores, 123 - Centro' },
          ].map(field => (
            <div key={field.key} style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: colors.textMuted, marginBottom: '8px' }}>{field.label}</label>
              <input
                type="text"
                required={field.required}
                placeholder={field.placeholder}
                value={(form as any)[field.key]}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                style={{ ...globalStyles.input, width: '100%', padding: '12px 15px' }}
              />
            </div>
          ))}

          {/* COR PRINCIPAL */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: colors.textMuted, marginBottom: '8px' }}>Cor Principal</label>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
              <input type="color" value={form.primary_color} onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                style={{ width: '60px', height: '45px', borderRadius: '10px', border: `1px solid ${colors.border}`, cursor: 'pointer', padding: '2px' }} />
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {['#800020', '#b91c1c', '#15803d', '#1d4ed8', '#7c3aed', '#b45309', '#0f172a'].map(c => (
                  <button key={c} type="button" onClick={() => setForm(f => ({ ...f, primary_color: c }))}
                    style={{ width: '32px', height: '32px', borderRadius: '50%', background: c, border: form.primary_color === c ? '3px solid #0f172a' : '2px solid transparent', cursor: 'pointer' }} />
                ))}
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving}
            style={{ width: '100%', padding: '15px', background: saved ? '#16a34a' : colors.primary, color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', transition: 'background 0.3s' }}>
            {saving ? 'SALVANDO...' : saved ? '✅ SALVO!' : 'SALVAR CONFIGURAÇÕES'}
          </button>
        </form>
      </main>
    </div>
  )
}