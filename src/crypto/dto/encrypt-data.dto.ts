import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsString, MaxLength } from 'class-validator';

export class EncryptDataRequest {
  @ApiProperty({ minLength: 0, maxLength: 2000, example: 'Hello, world!' })
  @IsDefined()
  @IsString()
  @MaxLength(2000)
  payload: string;
}

export class EncryptedData {
  @ApiProperty({ description: 'AES key encrypted with the RSA private key (base64)' })
  data1: string;

  @ApiProperty({ description: 'Payload encrypted with the AES key (base64)' })
  data2: string;
}

export class EncryptDataResponse {
  @ApiProperty({ example: true })
  successful: boolean;

  @ApiProperty({ example: '', description: 'Empty when successful' })
  error_code: string;

  @ApiProperty({ type: EncryptedData, nullable: true })
  data: EncryptedData | null;
}
