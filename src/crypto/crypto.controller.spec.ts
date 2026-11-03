import { CryptoController } from './crypto.controller';
import { CryptoService } from './crypto.service';

describe('CryptoController', () => {
  const service = { encrypt: jest.fn(), decrypt: jest.fn() };
  const controller = new CryptoController(
    service as unknown as CryptoService,
  );

  it('wraps encrypted data in the response shape', () => {
    service.encrypt.mockReturnValue({ data1: 'a', data2: 'b' });

    expect(controller.getEncryptData({ payload: 'text' })).toEqual({
      successful: true,
      error_code: '',
      data: { data1: 'a', data2: 'b' },
    });
    expect(service.encrypt).toHaveBeenCalledWith('text');
  });

  it('wraps decrypted data in the response shape', () => {
    service.decrypt.mockReturnValue({ payload: 'text' });

    expect(controller.getDecryptData({ data1: 'a', data2: 'b' })).toEqual({
      successful: true,
      error_code: '',
      data: { payload: 'text' },
    });
    expect(service.decrypt).toHaveBeenCalledWith('a', 'b');
  });
});
