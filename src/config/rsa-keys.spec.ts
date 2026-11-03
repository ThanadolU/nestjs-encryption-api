import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { loadRsaKeys } from './rsa-keys';

const generatePem = (privateType: 'pkcs1' | 'pkcs8' = 'pkcs8') =>
  generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: privateType === 'pkcs1' ? 'pkcs1' : 'spki',
      format: 'pem',
    },
    privateKeyEncoding: { type: privateType, format: 'pem' },
  });

describe('loadRsaKeys', () => {
  const config = (values: Record<string, string>) =>
    new ConfigService(values);

  it.each(['pkcs1', 'pkcs8'] as const)('loads %s inline PEM keys', (type) => {
    const { privateKey, publicKey } = generatePem(type);
    const keys = loadRsaKeys(
      config({ RSA_PRIVATE_KEY: privateKey, RSA_PUBLIC_KEY: publicKey }),
    );
    expect(keys.privateKey.type).toBe('private');
    expect(keys.publicKey.type).toBe('public');
  });

  it('accepts inline keys with escaped line breaks', () => {
    const { privateKey, publicKey } = generatePem();
    const escape = (pem: string) => pem.replace(/\n/g, '\\n');
    expect(() =>
      loadRsaKeys(
        config({
          RSA_PRIVATE_KEY: escape(privateKey),
          RSA_PUBLIC_KEY: escape(publicKey),
        }),
      ),
    ).not.toThrow();
  });

  it('loads keys from the configured file paths', () => {
    const { privateKey, publicKey } = generatePem();
    const dir = mkdtempSync(join(tmpdir(), 'rsa-keys-'));
    try {
      const privatePath = join(dir, 'private.pem');
      const publicPath = join(dir, 'public.pem');
      writeFileSync(privatePath, privateKey);
      writeFileSync(publicPath, publicKey);
      expect(() =>
        loadRsaKeys(
          config({
            RSA_PRIVATE_KEY_PATH: privatePath,
            RSA_PUBLIC_KEY_PATH: publicPath,
          }),
        ),
      ).not.toThrow();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('explains how to fix missing keys', () => {
    expect(() =>
      loadRsaKeys(
        config({
          RSA_PRIVATE_KEY_PATH: '/nonexistent/private.pem',
          RSA_PUBLIC_KEY_PATH: '/nonexistent/public.pem',
        }),
      ),
    ).toThrow(/npm run keys:generate/);
  });

  it('rejects keys that are not a pair', () => {
    expect(() =>
      loadRsaKeys(
        config({
          RSA_PRIVATE_KEY: generatePem().privateKey,
          RSA_PUBLIC_KEY: generatePem().publicKey,
        }),
      ),
    ).toThrow(/does not match/);
  });
});
