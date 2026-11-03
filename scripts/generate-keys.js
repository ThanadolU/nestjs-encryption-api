// Generates an RSA key pair into keys/. Existing keys are never overwritten.
const { generateKeyPairSync } = require('node:crypto');
const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const dir = join(__dirname, '..', 'keys');
const privatePath = join(dir, 'private.pem');
const publicPath = join(dir, 'public.pem');

if (existsSync(privatePath) || existsSync(publicPath)) {
  console.log(`Keys already exist in ${dir}, leaving them unchanged.`);
  process.exit(0);
}

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

mkdirSync(dir, { recursive: true });
writeFileSync(privatePath, privateKey, { mode: 0o600 });
writeFileSync(publicPath, publicKey);
console.log(`Generated a 2048-bit RSA key pair in ${dir}`);
