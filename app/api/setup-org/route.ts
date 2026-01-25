import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { orgName, userId } = await req.json()

    // Validação básica
    if (!orgName || !userId) {
      return NextResponse.json({ error: 'Nome da organização e ID do usuário são obrigatórios.' }, { status: 400 })
    }

    // Inicializa o cliente do Supabase com a Service Role (Chave Mestra)
    // Usamos a Service Role porque um usuário comum não tem permissão para criar organizações
    // ou alterar o próprio cargo para 'admin' via RLS.
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

    // 1. Criar a Organização na tabela 'organizations'
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert([{ name: orgName.trim() }])
      .select()
      .single()

    if (orgError) {
      console.error('Erro ao criar organização:', orgError.message)
      throw new Error('Falha ao registrar a empresa no banco de dados.')
    }

    // 2. Vincular o usuário à organização e promovê-lo a ADMIN
    // Aqui garantimos que 'org_id' seja preenchido e o 'role' seja 'admin'
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        org_id: org.id, 
        role: 'admin' 
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Erro ao atualizar perfil:', profileError.message)
      throw new Error('Falha ao vincular seu usuário à nova organização.')
    }

    return NextResponse.json({ 
      success: true, 
      orgId: org.id,
      message: 'Organização configurada e usuário promovido a Admin.' 
    })

  } catch (error: any) {
    console.error('Erro crítico no Setup:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}