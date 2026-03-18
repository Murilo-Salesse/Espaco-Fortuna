import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function Page() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <LoginForm />
    </Suspense>
  )
}