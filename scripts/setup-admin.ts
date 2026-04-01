

import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseService, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const ADMIN = {
  nome:  'Admin Fortuna',
  email: process.env.ADMIN_MAIL!,
  senha: process.env.ADMIN_PASSWORD!,
  cargo: Number(process.env.ADMIN_ID),
}

async function main() {
  console.log('🔐 Criando usuário administrador...')

  const { data: existe } = await supabase
    .from('usuarios')
    .select('id')
    .eq('email', ADMIN.email)
    .single()

  if (existe) {
    console.log(`⚠️  Usuário ${ADMIN.email} já existe. Abortando.`)
    process.exit(0)
  }

  const senha_hash = await bcrypt.hash(ADMIN.senha, 10)
  
  const dadosUsuario = {
    nome: ADMIN.nome,
    email: ADMIN.email,
    cargo: ADMIN.cargo,
  }

  const { error } = await supabase
    .from('usuarios')
    .insert({ ...dadosUsuario, senha_hash })
    .select('id, nome, email, cargo')
    .single()

  if (error) {
    console.error('❌ Erro ao criar usuário:', error.message)
    process.exit(1)
  }

  console.log('✅ Administrador criado com sucesso!')
}

main()
