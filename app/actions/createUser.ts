'use server'

import { createClient } from '@supabase/supabase-js'

// Inicializa o cliente com poderes de ADMIN
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

export async function createUser(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const role = formData.get('role') as string // 'admin' ou 'funcionario'
  const name = formData.get('name') as string // Opcional, se quiser salvar nome

  if (!email || !password) {
    return { error: 'Email e senha são obrigatórios' }
  }

  // 1. Cria o usuário no Auth (sem deslogar você)
  const { data: userData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Já confirma o email automaticamente
    user_metadata: { name } // Salva o nome nos metadados
  })

  if (authError) {
    return { error: authError.message }
  }

  // 2. Atualiza o cargo na tabela profiles
  // (O trigger cria como 'funcionario' por padrão, então se for admin, precisamos atualizar)
  if (userData.user && role) {
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ role: role })
      .eq('id', userData.user.id)

    if (profileError) {
      console.error('Erro ao atualizar cargo:', profileError)
      return { error: 'Usuário criado, mas falha ao definir cargo.' }
    }
  }

  return { success: true }
}