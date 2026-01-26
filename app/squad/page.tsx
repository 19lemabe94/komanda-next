'use client'
import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { colors, globalStyles } from '../styles/theme'
// Importamos o Header centralizado
import { Header } from '../components/Header'

// --- ÍCONES SVG ---
const IconPlus = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
const IconEdit = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
const IconTrash = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
const IconUser = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>

type Member = {
  id: string
  email: string
  role: 'admin' | 'funcionario'
  org_id: string
}

export default function SquadPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<Member[]>([])
  const [currentUserEmail, setCurrentUserEmail] = useState('')
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null) // Para o Header
  
  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null) // Para saber se é Edição
  
  // Formulário Unificado
  const [formData, setFormData] = useState({ username: '', password: '', role: 'funcionario' })
  const [processing, setProcessing] = useState(false)

  // Estilos
  const touchBtnStyle = { 
    padding: '10px 16px', 
    borderRadius: '10px', 
    fontWeight: 700, 
    fontSize: '0.9rem', 
    cursor: 'pointer', 
    border: 'none', 
    minHeight: '44px', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: '8px', 
    transition: 'all 0.1s' 
  }

  useEffect(() => {
    fetchSquad()
  }, [])

  const fetchSquad = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    
    setCurrentUserEmail(session.user.email || '')

    // 1. Busca perfil do usuário logado
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', session.user.id)
      .single()

    if (myProfile) {
      setCurrentOrgId(myProfile.org_id)
      setUserRole(myProfile.role) // Define o papel para o menu
      
      // 2. Busca membros da organização
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('org_id', myProfile.org_id)
        .order('created_at', { ascending: false })
      
      if (!error && data) {
        setMembers(data as Member[])
      }
    }
    setLoading(false)
  }

  // --- FUNÇÕES DE MODAL ---
  
  const openCreateModal = () => {
    setEditingMember(null) // Modo Criação
    setFormData({ username: '', password: '', role: 'funcionario' })
    setIsModalOpen(true)
  }

  const openEditModal = (member: Member) => {
    setEditingMember(member) // Modo Edição
    setFormData({ 
        username: member.email.split('@')[0], // Pega só o nome antes do @
        password: '', // Senha começa vazia (só preenche se quiser trocar)
        role: member.role 
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!currentOrgId) return
    
    setProcessing(true)

    try {
      // Decide qual endpoint chamar: Criar ou Atualizar
      const endpoint = editingMember ? '/api/update-user' : '/api/register'
      
      const bodyPayload = {
        ...formData,
        orgId: currentOrgId,
        userId: editingMember?.id // Vai undefined se for criação, sem problemas
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro na operação')

      setIsModalOpen(false)
      alert(editingMember ? 'Dados atualizados com sucesso!' : 'Membro criado com sucesso!')
      
      router.refresh()
      setTimeout(() => fetchSquad(), 800)

    } catch (error: any) {
      alert('Erro: ' + error.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleRemoveMember = async (id: string, email: string) => {
    const displayUser = email.split('@')[0]
    if (!confirm(`⚠️ PERIGO: Excluir permanentemente o acesso de "${displayUser}"?`)) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id })
      })

      if (!res.ok) throw new Error('Falha ao deletar')

      setMembers(prev => prev.filter(m => m.id !== id))
      alert(`Usuário ${displayUser} removido.`)
    } catch (error: any) {
      alert('Erro na exclusão: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ ...globalStyles.container, justifyContent: 'flex-start', background: '#f8fafc' }}>
      
      {/* HEADER CENTRALIZADO */}
      <Header userRole={userRole} subtitle="GESTÃO DE EQUIPE" />

      <main style={{ width: '100%', maxWidth: '800px', padding: '30px 20px', flex: 1 }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
            <div>
                <h2 style={{ fontSize: '1.3rem', color: colors.text, margin: 0 }}>Gestão de Acessos</h2>
                <span style={{ color: colors.textMuted, fontSize: '0.9rem' }}>{members.length} membros na equipe</span>
            </div>
            <button 
                onClick={openCreateModal}
                style={{ ...touchBtnStyle, backgroundColor: colors.primary, color: 'white' }}
            >
                <IconPlus /> Novo Membro
            </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: colors.textMuted }}>Sincronizando equipe...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {members.map(member => {
              const isMe = member.email === currentUserEmail
              return (
                <div key={member.id} style={{ 
                    backgroundColor: 'white', padding: '20px', borderRadius: '16px', 
                    border: `1px solid ${colors.border}`, display: 'flex', 
                    justifyContent: 'space-between', alignItems: 'center',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ 
                        width: '45px', height: '45px', borderRadius: '50%', 
                        backgroundColor: isMe ? colors.primary : '#f1f5f9', 
                        color: isMe ? 'white' : '#64748b', display: 'flex', alignItems: 'center', 
                        justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem'
                    }}>
                      {member.email.substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: colors.text, fontSize: '1.05rem' }}>
                        {member.email.split('@')[0]} {isMe && <small style={{fontWeight: 400, color: colors.textMuted, fontSize: '0.8rem'}}>(Você)</small>}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: member.role === 'admin' ? '#3b82f6' : '#64748b', fontWeight: 700, textTransform: 'uppercase', background: member.role === 'admin' ? '#eff6ff' : '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
                        {member.role}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {/* BOTÃO EDITAR (Lápis) */}
                    <button 
                        onClick={() => openEditModal(member)} 
                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', width: '42px', height: '42px', cursor: 'pointer', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                        title="Editar Senha/Cargo"
                    >
                       <IconEdit />
                    </button>

                    {/* BOTÃO EXCLUIR (Lixeira) - Não pode se auto-excluir */}
                    {!isMe && (
                        <button 
                            onClick={() => handleRemoveMember(member.id, member.email)} 
                            style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '10px', width: '42px', height: '42px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                            title="Excluir Acesso"
                        >
                            <IconTrash />
                        </button>
                    )}
                  </div>
                </div>
              )
            })}
            {members.length === 0 && <div style={{textAlign: 'center', padding: '40px', color: colors.textMuted}}>Nenhum membro encontrado.</div>}
          </div>
        )}
      </main>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
          <div style={{ ...globalStyles.card, width: '90%', maxWidth: '420px', padding: '30px' }}>
            <h3 style={{ marginTop: 0, color: colors.primary, textAlign: 'center', fontSize: '1.4rem' }}>
                {editingMember ? 'Editar Acesso' : 'Novo Acesso'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{display: 'block', fontSize: '0.9rem', color: colors.textMuted, marginBottom: '8px', fontWeight: 600}}>Login (E-mail)</label>
                <input 
                    required 
                    type="text" 
                    value={formData.username} 
                    onChange={e => setFormData({...formData, username: e.target.value})} 
                    style={{ ...globalStyles.input, backgroundColor: editingMember ? '#f8fafc' : 'white', cursor: editingMember ? 'not-allowed' : 'text', padding: '12px' }} 
                    placeholder="Ex: marcos" 
                    disabled={!!editingMember} 
                />
                {!editingMember && <span style={{fontSize: '0.75rem', color: colors.textMuted}}>Será criado como <b>{formData.username || '...'}@empresa.com</b></span>}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{display: 'block', fontSize: '0.9rem', color: colors.textMuted, marginBottom: '8px', fontWeight: 600}}>
                    {editingMember ? 'Nova Senha (Opcional)' : 'Senha Inicial'}
                </label>
                <input 
                    type="text" 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                    style={{ ...globalStyles.input, padding: '12px' }} 
                    placeholder={editingMember ? "Deixe vazio para manter a atual" : "Mínimo 6 dígitos"} 
                    required={!editingMember} 
                />
              </div>
              <div style={{ marginBottom: '25px' }}>
                <label style={{display: 'block', fontSize: '0.9rem', color: colors.textMuted, marginBottom: '8px', fontWeight: 600}}>Permissão</label>
                <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} style={{...globalStyles.input, height: '48px'}}>
                  <option value="funcionario">Funcionário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ ...touchBtnStyle, flex: 1, border: '2px solid #e2e8f0', background: 'transparent', color: colors.text }}>Cancelar</button>
                <button type="submit" disabled={processing} style={{ ...touchBtnStyle, backgroundColor: colors.primary, color: 'white', flex: 1 }}>
                    {processing ? 'SALVANDO...' : (editingMember ? 'SALVAR' : 'CRIAR')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}