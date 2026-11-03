import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ApiException } from './common/api.exception';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { ErrorCode } from './common/error-code';

// Shared by main.ts and the e2e tests so both exercise the same HTTP behaviour.
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      exceptionFactory: () =>
        new ApiException(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR),
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Encryption API')
      .setDescription('Encrypts and decrypts payloads with AES and RSA')
      .setVersion('1.0.0')
      .build(),
  );
  SwaggerModule.setup('api-docs', app, document);
}
