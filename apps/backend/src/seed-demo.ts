// apps/backend/src/seed-demo.ts
//
// Crea (o riallinea) l'ambiente DEMO del Checkup: un licenziatario (area studio)
// e un sublicenziatario (cliente) con le rispettive utenze e un pre-assessment
// precompilato. Tutti i record sono marcati `isDemo`: restano isolati nel proprio
// ambiente e non compaiono negli elenchi superadmin (salvo ?includeDemo=true).
//
// Idempotente: rilanciarlo aggiorna i record e ripristina i dati demo.
// Con `--if-missing` non fa nulla se l'ambiente demo è già completo.
//
// Uso:
//   DEMO_STUDIO_PASSWORD=... DEMO_CLIENT_PASSWORD=... node dist/src/seed-demo.js [--if-missing]
// Senza env le password vengono generate e stampate una sola volta.
import { NestFactory } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { In, Repository } from 'typeorm';
import { AppModule } from './app.module';
import { CheckupStudio } from './checkup/studios/checkup-studio.entity';
import { CheckupClient } from './checkup/clients/checkup-client.entity';
import { CheckupLicense } from './checkup/licenses/checkup-license.entity';
import { CheckupSublicense } from './checkup/licenses/checkup-sublicense.entity';
import { CheckupUser } from './checkup/users/checkup-user.entity';
import { CheckupPreassessment } from './checkup/preassessment/checkup-preassessment.entity';
import { QuestionModel } from './checkup/entities/question-model.entity';
import { QuestionMacroArea } from './checkup/entities/question-macro-area.entity';

const STUDIO_EMAIL = 'demo.studio@resolv.legal';
const CLIENT_EMAIL = 'demo.cliente@resolv.legal';
const STUDIO_NAME = 'Studio Demo Resolv';
const LICENSE_NUMBER = 'DEMO-LIC-000001';
const SUBLICENSE_NUMBER = 'DEMO-SUB-000001';

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

const sampleValue = (type: string, label: string, options: string[] | null | undefined, i: number): string => {
  switch (type) {
    case 'select':
    case 'radio':
      return options?.length ? options[i % options.length] : '';
    case 'checkbox':
      return options?.length ? options[0] : '';
    case 'date':
      return '2025-03-15';
    case 'number':
      return String(10 + (i % 7) * 5);
    case 'textarea':
      return `Informazione dimostrativa per "${label.replace(/\s*\*+\s*$/, '')}". Contenuto fittizio a scopo di demo.`;
    default:
      return `Demo ${i + 1}`;
  }
};

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const repo = <T extends object>(e: new () => T) => app.get<Repository<T>>(getRepositoryToken(e));
  const studios = repo(CheckupStudio);
  const clients = repo(CheckupClient);
  const licenses = repo(CheckupLicense);
  const sublicenses = repo(CheckupSublicense);
  const users = repo(CheckupUser);
  const preassessments = repo(CheckupPreassessment);
  const models = repo(QuestionModel);
  const macros = repo(QuestionMacroArea);

  try {
    // `--if-missing`: se l'ambiente demo è già completo non tocca nulla (usato dal deploy).
    // I record eliminati (soft-delete) contano come mancanti e vengono ripristinati.
    if (process.argv.includes('--if-missing')) {
      const demoClient = await clients.findOne({ where: { isDemo: true } });
      const [demoUsers, demoStudios, demoLicenses, demoSublicenses, demoPreassessments] = await Promise.all([
        users.count({ where: { isDemo: true, email: In([STUDIO_EMAIL, CLIENT_EMAIL]) } }),
        studios.count({ where: { nome: STUDIO_NAME, isDemo: true } }),
        licenses.count({ where: { numeroLicenza: LICENSE_NUMBER } }),
        sublicenses.count({ where: { numeroSublicenza: SUBLICENSE_NUMBER } }),
        demoClient ? preassessments.count({ where: { clientId: demoClient.id, isLatest: true } }) : Promise.resolve(0),
      ]);
      if (demoUsers === 2 && demoStudios === 1 && demoClient && demoLicenses === 1 && demoSublicenses === 1 && demoPreassessments >= 1) {
        console.log('ℹ️  Ambiente demo già presente: seed saltato');
        return;
      }
      console.log('ℹ️  Ambiente demo assente o incompleto: lo creo');
    }

    const generated: Record<string, string> = {};
    const pick = (envName: string, key: string) => {
      const fromEnv = process.env[envName]?.trim();
      if (fromEnv) return fromEnv;
      generated[key] = randomBytes(9).toString('base64url');
      return generated[key];
    };
    const studioPassword = pick('DEMO_STUDIO_PASSWORD', STUDIO_EMAIL);
    const clientPassword = pick('DEMO_CLIENT_PASSWORD', CLIENT_EMAIL);

    // Modello: preferisce il questionario standard, altrimenti il primo disponibile.
    const model =
      (await models.findOne({ where: { code: 'preassessment' } })) ?? (await models.find({ take: 1 }))[0];
    if (!model) throw new Error('Nessun modello di questionario trovato: esegui prima il seed delle domande.');

    const today = new Date();
    const nextYear = new Date(today);
    nextYear.setFullYear(today.getFullYear() + 1);

    // ── Licenziatario (area studio) ────────────────────────────────────────────
    let studio = await studios.findOne({ where: { nome: STUDIO_NAME }, withDeleted: true });
    studio = studios.create({
      ...(studio ?? {}),
      nome: STUDIO_NAME,
      tipo: 'licenziatario',
      ragioneSociale: 'Studio Demo Resolv S.t.p.',
      partitaIva: '00000000000',
      codiceFiscale: '00000000000',
      indirizzo: 'Via Roma 1',
      citta: 'Milano',
      provincia: 'MI',
      cap: '20100',
      paese: 'Italia',
      email: STUDIO_EMAIL,
      attivo: true,
      isDemo: true,
      deletedAt: null,
    });
    studio = await studios.save(studio);

    let license = await licenses.findOne({ where: { numeroLicenza: LICENSE_NUMBER } });
    license = await licenses.save(
      licenses.create({
        ...(license ?? {}),
        studioId: studio.id,
        intestatario: STUDIO_NAME,
        tipo: 'Demo',
        numeroUtenze: 10,
        numeroSottolicenze: 1,
        numeroLicenza: LICENSE_NUMBER,
        dataInizioValidita: isoDate(today),
        dataScadenza: isoDate(nextYear),
      }),
    );

    // ── Sublicenziatario (cliente) ─────────────────────────────────────────────
    let client = (await clients.find({ where: { isDemo: true }, withDeleted: true, take: 1 }))[0];
    client = await clients.save(
      clients.create({
        ...(client ?? {}),
        nome: 'Azienda Demo',
        ragioneSociale: 'Azienda Demo S.r.l.',
        partitaIva: '11111111111',
        codiceFiscale: '11111111111',
        indirizzo: 'Via Garibaldi 10',
        citta: 'Torino',
        provincia: 'TO',
        cap: '10100',
        paese: 'Italia',
        email: CLIENT_EMAIL,
        attivo: true,
        isDemo: true,
        deletedAt: null,
      }),
    );

    let sublicense = await sublicenses.findOne({ where: { numeroSublicenza: SUBLICENSE_NUMBER } });
    sublicense = await sublicenses.save(
      sublicenses.create({
        ...(sublicense ?? {}),
        licenseId: license.id,
        modelId: model.id,
        clientId: client.id,
        clienteStudioId: null,
        numeroSublicenza: SUBLICENSE_NUMBER,
        tipo: 'Demo',
        numeroUtenze: 5,
        dataInizioValidita: isoDate(today),
        dataScadenza: isoDate(nextYear),
        attiva: true,
        allowDocuments: true,
      }),
    );

    // ── Utenze ─────────────────────────────────────────────────────────────────
    const upsertUser = async (email: string, plain: string, patch: Partial<CheckupUser>) => {
      const existing = await users.findOne({ where: { email }, withDeleted: true });
      const base = existing ?? users.create();
      Object.assign(base, patch, {
        email,
        password: await bcrypt.hash(plain, 10),
        attivo: true,
        isDemo: true,
        mustChangePassword: false,
        twoFactorEnabled: false,
        deletedAt: null,
      });
      return users.save(base);
    };

    await upsertUser(STUDIO_EMAIL, studioPassword, {
      nome: 'Demo',
      cognome: 'Studio',
      ruolo: 'admin_studio',
      studioId: studio.id,
      clientId: null,
      sublicenseId: null,
      macroAreaOwner: null,
      macroAreaAssignments: null,
      superOwner: false,
    });
    const clientUser = await upsertUser(CLIENT_EMAIL, clientPassword, {
      nome: 'Demo',
      cognome: 'Cliente',
      ruolo: 'cliente',
      studioId: null,
      clientId: client.id,
      sublicenseId: sublicense.id,
      macroAreaOwner: [],
      macroAreaAssignments: [],
      superOwner: true,
    });

    // ── Pre-assessment precompilato ────────────────────────────────────────────
    const structure = await macros.find({
      where: { modelId: model.id },
      relations: ['sections', 'sections.fields'],
      order: { sortOrder: 'ASC', id: 'ASC' },
    });
    const data: Record<string, string> = {};
    const sectionValidations: CheckupPreassessment['sectionValidations'] = {};
    const by = { id: clientUser.id, name: 'Demo Cliente', ruolo: 'cliente' };
    let counter = 0;
    structure.forEach((macro, mi) => {
      // Prime due macro aree compilate per intero e validate, le altre a metà.
      const fullyFilled = mi < 2;
      [...(macro.sections ?? [])]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .forEach((section) => {
          const fields = [...(section.fields ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
          fields.forEach((field, fi) => {
            if (!fullyFilled && fi % 2 === 1) return;
            counter += 1;
            data[field.fieldId] = sampleValue(field.type, field.label, field.options, counter);
          });
          if (fullyFilled) sectionValidations![section.code] = { by, at: new Date().toISOString() };
        });
    });

    let record = await preassessments.findOne({ where: { clientId: client.id, isLatest: true } });
    record = await preassessments.save(
      preassessments.create({
        ...(record ?? {}),
        userId: clientUser.id,
        clientId: client.id,
        data,
        notes: {},
        fieldNotes: {},
        userFieldNotes: {},
        naFields: {},
        macroValidations: {},
        sectionValidations,
        status: 'in_progress',
        studioCanEdit: false,
        version: record?.version ?? 1,
        parentId: null,
        isLatest: true,
      }),
    );

    console.log('✅ Ambiente demo pronto');
    console.log(`   Modello:      ${model.label} (${model.code})`);
    console.log(`   Licenziatario: ${STUDIO_NAME}  → ${STUDIO_EMAIL}`);
    console.log(`   Cliente:       ${client.ragioneSociale}  → ${CLIENT_EMAIL}`);
    console.log(`   Pre-assessment: ${Object.keys(data).length} campi compilati (id ${record.id})`);
    if (Object.keys(generated).length) {
      console.log('\n🔑 Password generate (mostrate una sola volta):');
      for (const [email, pwd] of Object.entries(generated)) console.log(`   ${email}  →  ${pwd}`);
    }
  } catch (error: any) {
    console.error('❌ Errore durante la creazione dell\'ambiente demo:', error?.message ?? error);
    process.exitCode = 1;
  } finally {
    await app.close();
    process.exit(process.exitCode ?? 0);
  }
}

bootstrap();
