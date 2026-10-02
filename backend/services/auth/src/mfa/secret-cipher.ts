/**
 * Cifrado en reposo del secreto TOTP (AES-256-GCM). En producción la llave
 * de datos sale de Secret Manager / Cloud KMS (`MFA_ENCRYPTION_KEY`, 32
 * bytes en base64). Formato: `v1.<iv>.<tag>.<ciphertext>` (base64url).
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export interface SecretCipher {
  encrypt(plain: string): string;
  decrypt(blob: string): string;
}

export class AesGcmSecretCipher implements SecretCipher {
  constructor(private readonly key: Buffer) {
    if (key.length !== 32) throw new Error('La llave AES-256-GCM debe ser de 32 bytes');
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ['v1', iv.toString('base64url'), tag.toString('base64url'), ct.toString('base64url')].join('.');
  }

  decrypt(blob: string): string {
    const [v, iv, tag, ct] = blob.split('.');
    if (v !== 'v1' || !iv || !tag || !ct) throw new Error('Formato de secreto cifrado inválido');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ct, 'base64url')), decipher.final()]).toString('utf8');
  }
}
