// apps/backend/src/seed-admin.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  try {
    console.log('🔐 Creazione utente admin...');

    const adminUser = await usersService.create({
      email: 'admin@resolv.it',
      password: 'admin123',
      nome: 'Admin',
      cognome: 'Resolv',
      ruolo: 'admin',
      clienteId: null,
    });

    console.log('✅ Utente admin creato con successo!');
    console.log('📧 Email: admin@resolv.it');
    console.log('🔑 Password: admin123');
    console.log('⚠️  Cambia la password dopo il primo accesso!');
    console.log('\nDettagli utente:', {
      id: adminUser.id,
      email: adminUser.email,
      nome: adminUser.nome,
      cognome: adminUser.cognome,
      ruolo: adminUser.ruolo,
    });
  } catch (error: any) {
    if (error.message?.includes('Email già registrata')) {
      console.log('ℹ️  Utente admin già esistente');
      console.log('📧 Email: admin@resolv.it');
      console.log('🔑 Password: admin123 (se non è stata cambiata)');
    } else {
      console.error('❌ Errore durante la creazione dell\'utente admin:', error.message);
    }
  } finally {
    await app.close();
    process.exit(0);
  }
}

bootstrap();
