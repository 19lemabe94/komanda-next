'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { createUser } from '../actions/createUser' // Importa a função do passo 2
import { colors, globalStyles } from '../styles/theme'
import { useRouter } from 'next/navigation'

export default function TeamPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const router = useRouter()

  // Busca a lista de perfis ao carregar
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setUsers(data)
    setLoading(false)
  }

  // Lida com o envio do formulário
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFeedback('Criando usuário...')
    
    const formData = new FormData(e.currentTarget)
    
    // Chama a Server Action
    const result = await createUser(formData)
    
    if (result.error) {
      setFeedback('Erro: ' + result.error)
    } else {
      setFeedback('Usuário criado com sucesso!')
      setIsModalOpen(false)
      fetchUsers() // Recarrega a lista
      ;(e.target as HTMLFormElement).reset() // Limpa o form
    }
    
    // Limpa feedback após 3s
    setTimeout(() => setFeedback(''), 3000)
  }

  return (
    <div style={{ ...globalStyles.container, justifyContent: 'flex-start', padding: '40px' }}>
      
      {/* Header Simples */}
      <div style={{ width: '100%', maxWidth: '800px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ color: colors.primary, fontSize: '2rem', fontWeight: 'bold' }}>Equipe</h1>
          <p style={{ color: colors.textMuted }}>Gerencie quem tem acesso ao sistema</p>
        </div>
        <button 
          onClick={() => router.push('/')}
          style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', textDecoration: 'underline' }}
        >
          Voltar ao Início
        </button>
      </div>

      {/* Card Principal da Lista */}
      <div style={{ ...globalStyles.card, maxWidth: '800px', padding: '0' }}>
        
        {/* Barra de Ações */}
        <div style={{ padding: '20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Colaboradores ({users.length})</h2>
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{ 
              backgroundColor: colors.primary, color: 'white', border: 'none', 
              padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' 
            }}
          >
            + Novo Usuário
          </button>
        </div>

        {/* Lista de Usuários */}
        <div style={{ padding: '20px' }}>
          {loading ? (
            <p style={{textAlign: 'center', color: colors.textMuted}}>Carregando equipe...</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ color: colors.textMuted, borderBottom: `2px solid ${colors.bg}` }}>
                  <th style={{ padding: '10px' }}>Email</th>
                  <th style={{ padding: '10px' }}>Cargo</th>
                  <th style={{ padding: '10px' }}>Data Criação</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: `1px solid ${colors.bg}` }}>
                    <td style={{ padding: '12px 10px', color: colors.text }}>{user.email}</td>
                    <td style={{ padding: '12px 10px' }}>
                      <span style={{ 
                        backgroundColor: user.role === 'admin' ? colors.errorBg : colors.successBg,
                        color: user.role === 'admin' ? colors.errorText : colors.successText,
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase'
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 10px', color: colors.textMuted, fontSize: '0.9rem' }}>
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Feedback Flutuante */}
      {feedback && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '20px',
          backgroundColor: feedback.includes('Erro') ? colors.errorBg : colors.successBg,
          color: feedback.includes('Erro') ? colors.errorText : colors.successText,
          padding: '15px 25px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 100
        }}>
          {feedback}
        </div>
      )}

      {/* MODAL de Cadastro */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 50
        }}>
          <div style={{ ...globalStyles.card, width: '400px', animation: 'fadeIn 0.2s' }}>
            <h3 style={{ marginTop: 0, color: colors.primary }}>Novo Membro</h3>
            
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem'}}>Email</label>
                <input name="email" type="email" required style={{...globalStyles.input, marginBottom: 0}} placeholder="nome@exemplo.com" />
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem'}}>Senha Provisória</label>
                <input name="password" type="password" required style={{...globalStyles.input, marginBottom: 0}} placeholder="Mínimo 6 caracteres" />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem'}}>Cargo</label>
                <select name="role" style={{...globalStyles.input, marginBottom: 0, cursor: 'pointer'}}>
                  <option value="funcionario">Funcionário (Padrão)</option>
                  <option value="admin">Gerente / Admin</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  style={{ ...globalStyles.buttonPrimary, flex: 1, marginTop: 0 }}
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}