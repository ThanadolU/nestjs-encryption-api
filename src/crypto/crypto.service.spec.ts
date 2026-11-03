import { generateKeyPairSync, publicDecrypt } from 'node:crypto';
import { ApiException } from '../common/api.exception';
import { ErrorCode } from '../common/error-code';
import { CryptoService } from './crypto.service';

const generateKeys = () =>
  generateKeyPairSync('rsa', { modulusLength: 2048 });

describe('CryptoService', () => {
  const keys = generateKeys();
  const service = new CryptoService(keys);

  const expectDecryptionFailure = (data1: string, data2: string) => {
    let thrown: unknown;
    try {
      service.decrypt(data1, data2);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ApiException);
    expect((thrown as ApiException).errorCode).toBe(
      ErrorCode.DECRYPTION_FAILED,
    );
    expect((thrown as ApiException).getStatus()).toBe(400);
  };

  it.each([
    ['plain text', 'Hello, world!'],
    ['an empty string', ''],
    ['unicode', 'สวัสดี 🔐'],
    ['the maximum length', 'x'.repeat(2000)],
  ])('round trips %s', (_name, payload) => {
    const { data1, data2 } = service.encrypt(payload);
    expect(service.decrypt(data1, data2)).toEqual({ payload });
  });

  it('encrypts data1 with the private key so the public key recovers a 32 character AES key', () => {
    const { data1 } = service.encrypt('payload');
    const aesKey = publicDecrypt(
      keys.publicKey,
      Buffer.from(data1, 'base64'),
    ).toString();
    expect(aesKey).toMatch(/^[\w-]{32}$/);
  });

  it('does not expose the payload in data2', () => {
    const { data2 } = service.encrypt('top-secret');
    expect(Buffer.from(data2, 'base64').toString('latin1')).not.toContain(
      'top-secret',
    );
  });

  it('uses a new AES key and IV for each call', () => {
    const first = service.encrypt('same');
    const second = service.encrypt('same');
    const key = (data1: string) =>
      publicDecrypt(keys.publicKey, Buffer.from(data1, 'base64')).toString();

    expect(key(first.data1)).not.toBe(key(second.data1));
    expect(first.data2).not.toBe(second.data2);
  });

  it('rejects data1 that is not valid RSA ciphertext', () => {
    const { data2 } = service.encrypt('payload');
    expectDecryptionFailure('bm90LXJzYQ==', data2);
  });

  it('rejects data1 encrypted with a different key pair', () => {
    const other = new CryptoService(generateKeys()).encrypt('payload');
    const { data2 } = service.encrypt('payload');
    expectDecryptionFailure(other.data1, data2);
  });

  it('rejects data2 encrypted with a different AES key', () => {
    const first = service.encrypt('first');
    const second = service.encrypt('second');
    expectDecryptionFailure(first.data1, second.data2);
  });

  it('rejects tampered data2', () => {
    const { data1, data2 } = service.encrypt('payload');
    const bytes = Buffer.from(data2, 'base64');
    bytes[bytes.length - 1] ^= 0xff;
    expectDecryptionFailure(data1, bytes.toString('base64'));
  });

  it('rejects data2 that is too short to hold an IV and auth tag', () => {
    const { data1 } = service.encrypt('payload');
    expectDecryptionFailure(data1, 'c2hvcnQ=');
  });
});
