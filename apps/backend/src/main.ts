import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

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
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';

  // [H-03] Trust proxy: Express calcola request.ip usando il socket reale +
  // 1 hop di proxy fidato (nginx). Impedisce a client esterni di iniettare
  // X-Forwarded-For arbitrari per aggirare il rate limiting.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.use(cookieParser());
  app.use(helmet({
    // crossOriginEmbedderPolicy disabled — needed for embedded iframes / PDF viewer
    crossOriginEmbedderPolicy: false,
    // CSP: strict in production, relaxed in development to allow Swagger UI
    contentSecurityPolicy: isProduction ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    } : false,
    // X-Frame-Options: DENY — prevents clickjacking
    frameguard: { action: 'deny' },
    // HSTS: 1 year in production + preload (HTTP Strict Transport Security)
    hsts: isProduction ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false,
    // X-Content-Type-Options: nosniff — prevents MIME-type sniffing
    noSniff: true,
    // Referrer-Policy: no-referrer — no referrer information leaked
    referrerPolicy: { policy: 'no-referrer' },
    // xPoweredBy: not specified → Helmet default removes X-Powered-By header
  }));

  // Limita dimensioni dei payload JSON/form
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ limit: '2mb', extended: true }));

  // Header di sicurezza base e sanitizzazione input
  app.use((req, res, next) => {
    // Sanitize body/query/params (shallow)
    sanitizeObject(req.body);
    sanitizeObject(req.query);
    sanitizeObject(req.params);

    next();
  });

  // Configurazione CORS da variabile d'ambiente
  const corsOriginsEnv = configService.get<string>('CORS_ORIGINS', '');

  // Parse CORS_ORIGINS (comma-separated)
  const allowedOrigins = corsOriginsEnv
    ? corsOriginsEnv.split(',').map(origin => origin.trim()).filter(Boolean)
    : [
        // Defaults per development locale
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:8081',
        'http://localhost',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:8081',
        'http://127.0.0.1',
      ];

  app.enableCors({
    origin: (origin, callback) => {
      // Permetti richieste senza origin (Postman, curl, etc.)
      if (!origin) return callback(null, true);

      // Controlla se origin è nella lista (confronto esatto per evitare bypass)
      if (allowedOrigins.some(allowed => allowed && origin === allowed)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked origin: ${origin}`);
        callback(null, false);
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

  // Swagger solo in development (non esporre API docs in produzione)
  if (!isProduction) {
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
  }

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  // Allinea i timeout del server Node con nginx per evitare errori sporadici
  // su connessioni keep-alive rimaste aperte troppo a lungo dal proxy.
  const httpServer = app.getHttpServer() as {
    keepAliveTimeout?: number;
    headersTimeout?: number;
    requestTimeout?: number;
  };
  httpServer.keepAliveTimeout = 65_000;
  httpServer.headersTimeout = 66_000;
  httpServer.requestTimeout = 300_000;

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
