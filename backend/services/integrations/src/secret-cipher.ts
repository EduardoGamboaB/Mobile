/**
 * Cifrado en reposo de secretos literales (AES-256-GCM). La llave es
 * `INTEGRATIONS_ENCRYPTION_KEY` (32 bytes en base64, Secret Manager/KMS en
 * producción). El AAD liga cada ciphertext a su configuración y campo: un
 * secreto copiado a otra compañía o campo no se descifra.
 * Formato: `v1.<iv>.<tag>.<ciphertext>` (base64url).
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

export interface SecretCipher {
  encrypt(plain: string, aad: string): string;
  decrypt(blob: string, aad: string): string;
}

export class AesGcmSecretCipher implements SecretCipher {
  constructor(private readonly key: Buffer) {
    if (key.length !== 32) throw new Error('La llave AES-256-GCM debe ser de 32 bytes');
  }

  encrypt(plain: string, aad: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    cipher.setAAD(Buffer.from(aad, 'utf8'));
    const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ['v1', iv.toString('base64url'), tag.toString('base64url'), ct.toString('base64url')].join('.');
  }

  decrypt(blob: string, aad: string): string {
    const [v, iv, tag, ct] = blob.split('.');
    if (v !== 'v1' || !iv || !tag || !ct) throw new Error('Formato de secreto cifrado inválido');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64url'));
    decipher.setAAD(Buffer.from(aad, 'utf8'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ct, 'base64url')), decipher.final()]).toString('utf8');
  }
}

/**
 * Llave desde `INTEGRATIONS_ENCRYPTION_KEY`. En producción es obligatoria;
 * en desarrollo se deriva una fija de prueba (mismo patrón que
 * `MFA_ENCRYPTION_KEY` en auth).
 */
export function loadEncryptionKey(env: Record<string, string | undefined>): Buffer {
  const raw = env.INTEGRATIONS_ENCRYPTION_KEY ?? '';
  if (raw) {
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) throw new Error('[integrations-service] INTEGRATIONS_ENCRYPTION_KEY debe ser 32 bytes en base64');
    return key;
  }
  if (env.NODE_ENV === 'production') {
    throw new Error('[integrations-service] falta INTEGRATIONS_ENCRYPTION_KEY (Secret Manager / KMS)');
  }
  return createHash('sha256').update('g3-dev-only-integrations-key').digest();
}
