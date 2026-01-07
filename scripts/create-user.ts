import { auth } from '../src/lib/auth'
import { createInterface } from 'node:readline'

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
})

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve)
  })
}

async function main() {
  console.log('--- Criar Novo Usuário ---')

  try {
    const name = await question('Nome: ')
    const email = await question('Email: ')
    const password = await question('Senha: ')

    if (!name || !email || !password) {
      console.error('Todos os campos são obrigatórios!')
      process.exit(1)
    }

    console.log('Criando usuário...')
    
    const res = await auth.api.signUpEmail({
        body: {
            email,
            password,
            name,
        }
    })

    if (res) {
        console.log('Usuário criado com sucesso!')
        console.log('ID:', res.user.id)
        console.log('Email:', res.user.email)
    }

  } catch (error: any) {
    console.error('Erro ao criar usuário:', error.message || error)
    if (error.body) {
        console.error('Detalhes:', error.body)
    }
  } finally {
    rl.close()
    process.exit(0)
  }
}

main()
