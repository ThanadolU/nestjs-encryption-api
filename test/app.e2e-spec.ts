import { generateKeyPairSync } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { RSA_KEYS } from '../src/config/rsa-keys';

describe('Encryption API (e2e)', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer();
  const encrypt = (body: object) =>
    request(server()).post('/get-encrypt-data').send(body);
  const decrypt = (body: object) =>
    request(server()).post('/get-decrypt-data').send(body);
  const failure = (errorCode: string) => ({
    successful: false,
    error_code: errorCode,
    data: null,
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(RSA_KEYS)
      .useValue(generateKeyPairSync('rsa', { modulusLength: 2048 }))
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.init();
  });

  afterAll(() => app.close());

  describe('/api-docs', () => {
    it('serves the Swagger UI', async () => {
      const response = await request(server()).get('/api-docs/').expect(200);
      expect(response.text).toContain('swagger-ui');
    });

    it('documents exactly the two APIs', async () => {
      const response = await request(server()).get('/api-docs-json').expect(200);
      expect(Object.keys(response.body.paths).sort()).toEqual([
        '/get-decrypt-data',
        '/get-encrypt-data',
      ]);
    });
  });

  describe('POST /get-encrypt-data', () => {
    it('returns data1 and data2', async () => {
      const response = await encrypt({ payload: 'Hello' }).expect(200);
      expect(response.body).toEqual({
        successful: true,
        error_code: '',
        data: { data1: expect.any(String), data2: expect.any(String) },
      });
    });

    it.each([
      ['empty', ''],
      ['2000 characters', 'x'.repeat(2000)],
    ])('accepts a payload that is %s', async (_name, payload) => {
      await encrypt({ payload }).expect(200);
    });

    it.each([
      ['missing', {}],
      ['null', { payload: null }],
      ['a number', { payload: 123 }],
      ['an array', { payload: ['text'] }],
      ['2001 characters', { payload: 'x'.repeat(2001) }],
    ])('rejects a payload that is %s', async (_name, body) => {
      const response = await encrypt(body).expect(400);
      expect(response.body).toEqual(failure('VALIDATION_ERROR'));
    });
  });

  describe('POST /get-decrypt-data', () => {
    it.each([['Hello'], [''], ['สวัสดี 🔐'], ['x'.repeat(2000)]])(
      'decrypts what /get-encrypt-data returned (%#)',
      async (payload) => {
        const encrypted = await encrypt({ payload }).expect(200);
        const response = await decrypt(encrypted.body.data).expect(200);
        expect(response.body).toEqual({
          successful: true,
          error_code: '',
          data: { payload },
        });
      },
    );

    it.each([
      ['data1 is missing', { data2: 'abc' }],
      ['data2 is missing', { data1: 'abc' }],
      ['data1 is empty', { data1: '', data2: 'abc' }],
      ['data2 is not a string', { data1: 'abc', data2: 1 }],
    ])('rejects the request when %s', async (_name, body) => {
      const response = await decrypt(body).expect(400);
      expect(response.body).toEqual(failure('VALIDATION_ERROR'));
    });

    it('reports data that cannot be decrypted', async () => {
      const response = await decrypt({ data1: 'abc', data2: 'def' }).expect(400);
      expect(response.body).toEqual(failure('DECRYPTION_FAILED'));
    });
  });

  describe('error responses keep the API shape', () => {
    const postRaw = (body: string) =>
      request(server())
        .post('/get-encrypt-data')
        .set('Content-Type', 'application/json')
        .send(body);

    it('for malformed JSON', async () => {
      const response = await postRaw('{"payload":').expect(400);
      expect(response.body).toEqual(failure('BAD_REQUEST'));
    });

    it('for a body with no content', async () => {
      const response = await request(server())
        .post('/get-encrypt-data')
        .expect(400);
      expect(response.body).toEqual(failure('VALIDATION_ERROR'));
    });

    it('for an oversized body', async () => {
      const response = await encrypt({ payload: 'x'.repeat(200_000) }).expect(413);
      expect(response.body).toEqual(failure('PAYLOAD_TOO_LARGE'));
    });

    it('for an unknown route', async () => {
      const response = await request(server()).get('/unknown').expect(404);
      expect(response.body).toEqual(failure('NOT_FOUND'));
    });
  });
});
