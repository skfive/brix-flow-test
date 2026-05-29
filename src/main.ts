import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);

  // Helmet 보안 헤더 적용
  app.use(helmet());

  // CORS 설정
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
    credentials: true,
  });

  // Swagger 문서 설정 (/api 경로)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('brix-CMS API')
    .setDescription('brix-CMS NestJS 백엔드 API 문서')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  await app.listen(port);
  console.log(`서버 기동 완료: http://localhost:${port}`);
  console.log(`Swagger 문서: http://localhost:${port}/api`);
}

bootstrap();
