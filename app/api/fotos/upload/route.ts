import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { ADMIN_CARGO } from '@/lib/constants'
import { consumeRateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/security'
import { supabaseAdmin } from '@/lib/supabase'

const BUCKET = 'fotos'
const MAX_FILE_SIZE = 5 * 1024 * 1024

type FileSignature = {
  ext: string
  mime: string
  matches: (bytes: Uint8Array) => boolean
}

const ALLOWED_SIGNATURES: FileSignature[] = [
  {
    ext: 'jpg',
    mime: 'image/jpeg',
    matches: (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  {
    ext: 'png',
    mime: 'image/png',
    matches: (bytes) =>
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a,
  },
  {
    ext: 'webp',
    mime: 'image/webp',
    matches: (bytes) =>
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP',
  },
  {
    ext: 'gif',
    mime: 'image/gif',
    matches: (bytes) => {
      const signature = String.fromCharCode(...bytes.slice(0, 6))
      return signature === 'GIF87a' || signature === 'GIF89a'
    },
  },
]

function detectSignature(bytes: Uint8Array): FileSignature | null {
  for (const signature of ALLOWED_SIGNATURES) {
    if (signature.matches(bytes)) {
      return signature
    }
  }

  return null
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session || session.cargo !== ADMIN_CARGO) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })
    }

    const uploadLimit = await consumeRateLimit({
      namespace: 'upload:fotos',
      identifier: `${session.id}:${getClientIp(req.headers)}`,
      limit: 20,
      windowSeconds: 10 * 60,
      blockSeconds: 10 * 60,
    })

    if (!uploadLimit.allowed) {
      return NextResponse.json(
        { error: 'Muitos uploads em sequência. Aguarde alguns minutos.' },
        {
          status: 429,
          headers: { 'Retry-After': String(uploadLimit.retryAfter || 60) },
        }
      )
    }

    const form = await req.formData()
    const file = form.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Arquivo inválido ou maior que 5MB.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    const signature = detectSignature(bytes)

    if (!signature) {
      return NextResponse.json(
        { error: 'Formato de imagem não suportado. Envie JPG, PNG, GIF ou WebP.' },
        { status: 400 }
      )
    }

    const filename = `${Date.now()}-${randomBytes(12).toString('hex')}.${signature.ext}`
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filename, Buffer.from(arrayBuffer), {
        contentType: signature.mime,
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('[fotos/upload]', uploadError)
      return NextResponse.json({ error: 'Não foi possível concluir o upload.' }, { status: 500 })
    }

    const { data: publicData } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(filename)

    return NextResponse.json({ url: publicData.publicUrl })
  } catch (err) {
    console.error('[fotos/upload]', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
