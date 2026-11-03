import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DecryptDataRequest {
  @ApiProperty({ description: 'data1 returned by /get-encrypt-data' })
  @IsString()
  @IsNotEmpty()
  data1: string;

  @ApiProperty({ description: 'data2 returned by /get-encrypt-data' })
  @IsString()
  @IsNotEmpty()
  data2: string;
}

export class DecryptedData {
  @ApiProperty({ example: 'Hello, world!' })
  payload: string;
}

export class DecryptDataResponse {
  @ApiProperty({ example: true })
  successful: boolean;

  @ApiProperty({ example: '', description: 'Empty when successful' })
  error_code: string;

  @ApiProperty({ type: DecryptedData, nullable: true })
  data: DecryptedData | null;
}
