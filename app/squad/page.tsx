'use client'
import { useEffect, useState, FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { colors, globalStyles } from '../styles/theme'
// Importamos o Header centralizado
import { Header } from '../components/Header'

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
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'funcionario' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchSquad()
  }, [])

  const fetchSquad = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    
    setCurrentUserEmail(session.user.email || '')

    // 1. Primeiro buscamos o perfil do usuário logado
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', session.user.id)
      .single()

    if (myProfile) {
      setCurrentOrgId(myProfile.org_id)
      setUserRole(myProfile.role) // Define o papel para o menu
      
      // 2. Agora buscamos apenas os membros que pertencem à MESMA organização
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('org_id', myProfile.org_id) // Filtro crucial para o isolamento
        .order('created_at', { ascending: false })
      
      if (!error && data) {
        setMembers(data as Member[])
      }
    }
    
    setLoading(false)
  }

  const handleCreateMember = async (e: FormEvent) => {
    e.preventDefault()
    if (!currentOrgId) {
      alert("Erro: Organização não identificada.")
      return
    }
    
    setCreating(true)

    try {
      // Enviamos os dados junto com o orgId da empresa atual
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...newUser, 
          orgId: currentOrgId // Vincula o novo usuário à org atual
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setIsModalOpen(false)
      setNewUser({ username: '', password: '', role: 'funcionario' })
      
      router.refresh()
      setTimeout(() => fetchSquad(), 800)

    } catch (error: any) {
      alert('Erro ao criar: ' + error.message)
    } finally {
      setCreating(false)
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
      router.refresh()
      alert(`Usuário ${displayUser} removido.`)
    } catch (error: any) {
      alert('Erro na exclusão: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ ...globalStyles.container, justifyContent: 'flex-start', background: '#f8fafc' }}>
      
      {/* HEADER CENTRALIZADO E RESPONSIVO */}
      <Header userRole={userRole} subtitle="GESTÃO DE EQUIPE" />

      <main style={{ width: '100%', maxWidth: '800px', padding: '30px 20px', flex: 1 }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
            <div>
                <h2 style={{ fontSize: '1.2rem', color: colors.text, margin: 0 }}>Gestão de Acessos</h2>
                <p style={{ color: colors.textMuted, fontSize: '0.9rem', margin: '5px 0 0' }}>Administre quem pode acessar o sistema.</p>
            </div>
            <button 
                onClick={() => setIsModalOpen(true)}
                style={{ backgroundColor: colors.primary, color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
                + Novo Membro
            </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: colors.textMuted }}>Sincronizando equipe...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {members.map(member => {
              const isMe = member.email === currentUserEmail
              return (
                <div key={member.id} style={{ 
                    backgroundColor: 'white', padding: '15px 20px', borderRadius: '12px', 
                    border: `1px solid ${colors.border}`, display: 'flex', 
                    justifyContent: 'space-between', alignItems: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                        width: '40px', height: '40px', borderRadius: '50%', 
                        backgroundColor: isMe ? colors.primary : '#94a3b8', 
                        color: 'white', display: 'flex', alignItems: 'center', 
                        justifyContent: 'center', fontWeight: 'bold' 
                    }}>
                      {member.email.substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: colors.text }}>
                        {member.email.split('@')[0]} {isMe && <small style={{fontWeight: 400, color: colors.textMuted}}>(Você)</small>}
                      </div>
                      <span style={{ fontSize: '0.65rem', color: member.role === 'admin' ? '#3b82f6' : '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                        {member.role}
                      </span>
                    </div>
                  </div>
                  {!isMe && (
                    <button onClick={() => handleRemoveMember(member.id, member.email)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  )}
                </div>
              )
            })}
            {members.length === 0 && <p style={{textAlign: 'center', color: colors.textMuted}}>Nenhum membro encontrado.</p>}
          </div>
        )}
      </main>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)' }}>
          <div style={{ ...globalStyles.card, width: '90%', maxWidth: '400px', padding: '30px' }}>
            <h3 style={{ marginTop: 0, color: colors.primary, textAlign: 'center' }}>Novo Acesso</h3>
            <form onSubmit={handleCreateMember}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{display: 'block', fontSize: '0.85rem', color: colors.textMuted, marginBottom: '5px'}}>Login do Funcionário</label>
                <input required type="text" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} style={globalStyles.input} placeholder="Ex: marcos..." />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{display: 'block', fontSize: '0.85rem', color: colors.textMuted, marginBottom: '5px'}}>Senha Inicial</label>
                <input required type="text" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} style={globalStyles.input} placeholder="Mínimo 6 dígitos" />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{display: 'block', fontSize: '0.85rem', color: colors.textMuted, marginBottom: '5px'}}>Permissão</label>
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})} style={{...globalStyles.input, height: '52px'}}>
                  <option value="funcionario">Funcionário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc', background: 'transparent' }}>Cancelar</button>
                <button type="submit" disabled={creating} style={{ ...globalStyles.buttonPrimary, flex: 1, marginTop: 0 }}>
                    {creating ? 'CRIANDO...' : 'CRIAR CONTA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}