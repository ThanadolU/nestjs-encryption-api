import { readFileSync } from 'node:fs';
import {
  createPrivateKey,
  createPublicKey,
  KeyObject,
  privateEncrypt,
  publicDecrypt,
} from 'node:crypto';
import { ConfigService } from '@nestjs/config';

export const RSA_KEYS = Symbol('RSA_KEYS');

export interface RsaKeys {
  privateKey: KeyObject;
  publicKey: KeyObject;
}

export function loadRsaKeys(config: ConfigService): RsaKeys {
  let keys: RsaKeys;
  try {
    keys = {
      privateKey: createPrivateKey(
        readPem(config, 'RSA_PRIVATE_KEY', 'keys/private.pem'),
      ),
      publicKey: createPublicKey(
        readPem(config, 'RSA_PUBLIC_KEY', 'keys/public.pem'),
      ),
    };
  } catch (error) {
    throw new Error(
      `Could not load the RSA keys: ${(error as Error).message}. ` +
        'Run "npm run keys:generate" or see "RSA keys" in the README.',
    );
  }

  const probe = Buffer.from('rsa-key-pair-check');
  let matches = false;
  try {
    matches = publicDecrypt(
      keys.publicKey,
      privateEncrypt(keys.privateKey, probe),
    ).equals(probe);
  } catch {
    // A failed decrypt means the same thing as a mismatch.
  }
  if (!matches) {
    throw new Error('The RSA public key does not match the private key.');
  }
  return keys;
}

function readPem(
  config: ConfigService,
  name: string,
  defaultPath: string,
): string {
  const inline = config.get<string>(name);
  return inline
    ? inline.replace(/\\n/g, '\n')
    : readFileSync(config.get<string>(`${name}_PATH`) ?? defaultPath, 'utf8');
}
