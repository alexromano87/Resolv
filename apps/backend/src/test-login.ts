// apps/backend/src/test-login.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuthService } from './auth/auth.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);

  try {
    console.log('🔐 Test login admin...');

    const result = await authService.login({
      email: 'admin@resolv.legal',
      password: 'admin123',
    });

    if ('access_token' in result && result.access_token) {
      console.log('✅ Login successful!');
      console.log('Token:', result.access_token.substring(0, 20) + '...');
      console.log('User:', result.user);
    } else {
      console.log('⚠️ 2FA required before issuing a token.');
      console.log('Channel:', result.channel);
      console.log('User ID:', result.userId);
    }
  } catch (error: any) {
    console.error('❌ Login failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await app.close();
  }
}

bootstrap();
