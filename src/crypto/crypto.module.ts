import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { loadRsaKeys, RSA_KEYS } from '../config/rsa-keys';
import { CryptoController } from './crypto.controller';
import { CryptoService } from './crypto.service';

@Module({
  controllers: [CryptoController],
  providers: [
    CryptoService,
    { provide: RSA_KEYS, inject: [ConfigService], useFactory: loadRsaKeys },
  ],
})
export class CryptoModule {}
