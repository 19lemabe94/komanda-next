import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { userId } = await req.json()

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Chave Service Role não configurada' }, { status: 500 })
    }

    // Conecta com permissões de Super Administrador
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

    // 1. Deleta o usuário do Supabase Auth (isso impede novos logins)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authError) throw authError

    // 2. Opcional: Deletar do profiles (embora o ON DELETE CASCADE costume resolver se configurado)
    await supabaseAdmin.from('profiles').delete().eq('id', userId)

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Erro na API de exclusão:', error.message)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}