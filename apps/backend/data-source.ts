import 'dotenv/config';
import { DataSource } from 'typeorm';

const isProd = process.env.NODE_ENV === 'production';

const AppDataSource = new DataSource({
  type: process.env.DB_USE_SQLITE === 'true' ? 'sqlite' : 'mysql',
  database: process.env.DB_USE_SQLITE === 'true' ? ':memory:' : process.env.DB_DATABASE || 'recupero_crediti',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3307),
  username: process.env.DB_USERNAME || 'rc_user',
  password: process.env.DB_PASSWORD || 'rc_pass',
  entities: isProd ? ['dist/**/*.entity.js'] : ['src/**/*.entity.ts'],
  migrationsTableName: 'typeorm_migrations',
  migrations: isProd ? ['dist/src/migrations/*.js'] : ['src/migrations/*.ts'],
  extra:
    process.env.DB_USE_SQLITE === 'true'
      ? {}
      : {
          multipleStatements: true, // necessario per la migrazione di bootstrap schema
        },
  synchronize: false,
});

export default AppDataSource;
