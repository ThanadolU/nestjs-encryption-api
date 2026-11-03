import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ErrorCode } from '../common/error-code';
import { CryptoService } from './crypto.service';
import { DecryptDataRequest, DecryptDataResponse } from './dto/decrypt-data.dto';
import { EncryptDataRequest, EncryptDataResponse } from './dto/encrypt-data.dto';

@ApiTags('Encryption')
@Controller()
export class CryptoController {
  constructor(private readonly cryptoService: CryptoService) {}

  @Post('get-encrypt-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Encrypt a payload' })
  @ApiOkResponse({ type: EncryptDataResponse })
  @ApiBadRequestResponse({
    type: EncryptDataResponse,
    description: 'error_code is VALIDATION_ERROR and data is null',
  })
  getEncryptData(@Body() body: EncryptDataRequest): EncryptDataResponse {
    return {
      successful: true,
      error_code: ErrorCode.NONE,
      data: this.cryptoService.encrypt(body.payload),
    };
  }

  @Post('get-decrypt-data')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Decrypt data1 and data2 back into the payload' })
  @ApiOkResponse({ type: DecryptDataResponse })
  @ApiBadRequestResponse({
    type: DecryptDataResponse,
    description:
      'error_code is VALIDATION_ERROR or DECRYPTION_FAILED and data is null',
  })
  getDecryptData(@Body() body: DecryptDataRequest): DecryptDataResponse {
    return {
      successful: true,
      error_code: ErrorCode.NONE,
      data: this.cryptoService.decrypt(body.data1, body.data2),
    };
  }
}
