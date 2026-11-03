import {
  createCipheriv,
  createDecipheriv,
  KeyObject,
  privateEncrypt,
  publicDecrypt,
  randomBytes,
} from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ApiException } from '../common/api.exception';
import { ErrorCode } from '../common/error-code';
import { RSA_KEYS, RsaKeys } from '../config/rsa-keys';
import { DecryptedData } from './dto/decrypt-data.dto';
import { EncryptedData } from './dto/encrypt-data.dto';

const AES_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
// 24 random bytes encode to a 32 character string, which is a 32 byte AES-256 key.
const AES_KEY_ENTROPY_BYTES = 24;

@Injectable()
export class CryptoService {
  private readonly privateKey: KeyObject;
  private readonly publicKey: KeyObject;

  constructor(@Inject(RSA_KEYS) keys: RsaKeys) {
    this.privateKey = keys.privateKey;
    this.publicKey = keys.publicKey;
  }

  encrypt(payload: string): EncryptedData {
    const aesKey = randomBytes(AES_KEY_ENTROPY_BYTES).toString('base64url');
    return {
      data1: privateEncrypt(this.privateKey, Buffer.from(aesKey)).toString(
        'base64',
      ),
      data2: this.aesEncrypt(payload, aesKey),
    };
  }

  decrypt(data1: string, data2: string): DecryptedData {
    try {
      const aesKey = publicDecrypt(
        this.publicKey,
        Buffer.from(data1, 'base64'),
      ).toString();
      return { payload: this.aesDecrypt(data2, aesKey) };
    } catch {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        ErrorCode.DECRYPTION_FAILED,
      );
    }
  }

  // Output format: base64(iv + auth tag + ciphertext)
  private aesEncrypt(plaintext: string, key: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(AES_ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
      'base64',
    );
  }

  private aesDecrypt(encoded: string, key: string): string {
    const bytes = Buffer.from(encoded, 'base64');
    const tagStart = IV_LENGTH;
    const ciphertextStart = tagStart + AUTH_TAG_LENGTH;

    const decipher = createDecipheriv(
      AES_ALGORITHM,
      key,
      bytes.subarray(0, tagStart),
      { authTagLength: AUTH_TAG_LENGTH },
    );
    decipher.setAuthTag(bytes.subarray(tagStart, ciphertextStart));
    return Buffer.concat([
      decipher.update(bytes.subarray(ciphertextStart)),
      decipher.final(),
    ]).toString('utf8');
  }
}
