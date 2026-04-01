

import { randomBytes } from 'crypto'

export function gerarToken(): string {
  return randomBytes(16).toString('hex')
}

export function gerarChave(): string {
  return randomBytes(16).toString('hex') 
}
