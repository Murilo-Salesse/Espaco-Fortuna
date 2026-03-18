

import { randomBytes } from 'crypto'

export function gerarToken(): string {
  return randomBytes(4)
    .toString('base64')
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()
    .slice(0, 6)
}

export function gerarChave(): string {
  return randomBytes(16).toString('hex') 
}
