import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const port = app.get(ConfigService).get<string>('PORT') ?? 3000;
  await app.listen(port);
  console.log(`Service: ${await app.getUrl()}`);
  console.log(`Swagger: ${await app.getUrl()}/api-docs`);
}

bootstrap().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
