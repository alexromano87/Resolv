import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';

// Sanitize request objects from keys like $ or dots (basic NoSQL injection guard)
function sanitizeObject(obj: any) {
  if (obj && typeof obj === 'object') {
    Object.keys(obj).forEach((key) => {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      } else {
        sanitizeObject(obj[key]);
      }
    });
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Limita dimensioni dei payload JSON/form
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ limit: '2mb', extended: true }));

  // Header di sicurezza base
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // Sanitize body/query/params (shallow)
    sanitizeObject(req.body);
    sanitizeObject(req.query);
    sanitizeObject(req.params);

    next();
  });

  // Rileva ambiente e configura CORS automaticamente
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';

  // Configurazione CORS da variabile d'ambiente
  const corsOriginsEnv = configService.get<string>('CORS_ORIGINS', '');

  // Parse CORS_ORIGINS (comma-separated)
  const allowedOrigins = corsOriginsEnv
    ? corsOriginsEnv.split(',').map(origin => origin.trim()).filter(Boolean)
    : [
        // Defaults per development locale
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost',
        'http://127.0.0.1:5173',
        'http://127.0.0.1',
      ];

  app.enableCors({
    origin: (origin, callback) => {
      // Permetti richieste senza origin (Postman, curl, etc.)
      if (!origin) return callback(null, true);

      // Controlla se origin è nella lista
      if (allowedOrigins.some(allowed => allowed && origin.startsWith(allowed))) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Validazione globale con trasformazione automatica dei tipi
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,  // rimuove campi non definiti nei DTO
      forbidNonWhitelisted: true, // blocca campi non previsti nei DTO
      transform: true, // trasforma i payload nei tipi definiti nei DTO
      transformOptions: {
        enableImplicitConversion: true, // converte tipi primitivi automaticamente
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Resolv API')
    .setDescription('Documentazione automatica per i servizi REST di Resolv')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'Bearer Auth')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
    },
  });

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  // Log info ambiente
  logger.log(`${'='.repeat(50)}`);
  logger.log(`🚀 RESOLV Backend Started`);
  logger.log(`${'='.repeat(50)}`);
  logger.log(`🌍 Environment: ${nodeEnv}`);
  logger.log(`🔗 Running on: http://localhost:${port}`);
  logger.log(`📡 CORS Origins: ${allowedOrigins.filter(Boolean).join(', ')}`);
  logger.log(`📊 Database: ${configService.get('DB_HOST')}:${configService.get('DB_PORT')}`);
  logger.log(`${'='.repeat(50)}`);
}
bootstrap();
