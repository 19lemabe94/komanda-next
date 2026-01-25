import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { username, password, role, orgId } = await req.json()

    // 1. Validações de integridade
    if (!username || !password || !role || !orgId) {
      return NextResponse.json({ error: 'Dados incompletos para registro.' }, { status: 400 })
    }

    // Inicializa o cliente com privilégios de Administrador (Service Role)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 2. Padronização do e-mail interno
    const finalEmail = `${username.trim().toLowerCase()}@komanda.com`

    // 3. Criação ou recuperação do usuário no Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: finalEmail,
      password: password,
      email_confirm: true 
    })

    // Se o erro for de usuário já existente no Auth, podemos tentar prosseguir para vincular o perfil
    // caso o erro técnico tenha ocorrido apenas na tabela de profiles anteriormente.
    if (authError && authError.message !== 'User already exists') {
      console.error('Erro Auth:', authError.message)
      return NextResponse.json({ error: 'Erro ao criar credenciais: ' + authError.message }, { status: 400 })
    }

    // Determinamos o ID do usuário (seja o novo criado ou o que já existia)
    const userId = authData.user?.id || (authError?.message === 'User already exists' ? await findUserIdByEmail(supabaseAdmin, finalEmail) : null)

    if (userId) {
      // 4. UPSERT do Perfil (O Segredo para evitar o Erro de Chave Duplicada)
      // Se o perfil já existir, ele apenas sobrescreve com os novos dados de org e role.
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert([{ 
          id: userId, 
          email: finalEmail, 
          role: role, 
          org_id: orgId 
        }], { onConflict: 'id' }) // Especifica que o conflito ocorre no campo ID

      if (profileError) {
        console.error('Erro Profile Upsert:', profileError.message)
        return NextResponse.json({ error: 'Erro ao sincronizar perfil técnico.' }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: 'Não foi possível identificar o usuário para o perfil.' }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Usuário ${username} processado com sucesso!` 
    })

  } catch (error: any) {
    console.error('Erro Crítico Register:', error.message)
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 })
  }
}

// Função auxiliar para encontrar o ID caso o Auth já exista
async function findUserIdByEmail(supabase: any, email: string) {
  const { data } = await supabase.from('profiles').select('id').eq('email', email).single()
  return data?.id || null
}