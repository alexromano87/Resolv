import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { Studio } from './studio.entity';
import { CreateStudioDto } from './dto/create-studio.dto';
import { UpdateStudioDto } from './dto/update-studio.dto';
import { BackupService } from './backup.service';
import { Cliente } from '../clienti/cliente.entity';
import { Debitore } from '../debitori/debitore.entity';
import { User } from '../users/user.entity';
import { Avvocato } from '../avvocati/avvocato.entity';
import { Pratica } from '../pratiche/pratica.entity';

@Injectable()
export class StudiService {
  private readonly logger = new Logger(StudiService.name);

  constructor(
    @InjectRepository(Studio)
    private studioRepository: Repository<Studio>,
    @InjectRepository(Cliente)
    private clientiRepository: Repository<Cliente>,
    @InjectRepository(Debitore)
    private debitoriRepository: Repository<Debitore>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Avvocato)
    private avvocatiRepository: Repository<Avvocato>,
    @InjectRepository(Pratica)
    private praticheRepository: Repository<Pratica>,
    private backupService: BackupService,
  ) {}

  async findAll(): Promise<Studio[]> {
    // Include anche gli studi soft-deleted per permettere il ripristino
    return this.studioRepository.find({
      order: { nome: 'ASC' },
      relations: ['users', 'pratiche'],
      withDeleted: true, // Mostra anche gli studi eliminati
    });
  }

  async findAllActive(): Promise<Studio[]> {
    // Soft-deleted records sono automaticamente esclusi da TypeORM
    return this.studioRepository.find({
      where: { attivo: true },
      order: { nome: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Studio> {
    // Soft-deleted records sono automaticamente esclusi da TypeORM
    const studio = await this.studioRepository.findOne({
      where: { id },
      relations: ['users', 'pratiche'],
    });

    if (!studio) {
      throw new NotFoundException('Studio non trovato');
    }

    return studio;
  }

  async create(createStudioDto: CreateStudioDto): Promise<Studio> {
    // Verifica se esiste già uno studio con lo stesso nome
    const existingStudio = await this.studioRepository.findOne({
      where: { nome: createStudioDto.nome },
    });

    if (existingStudio) {
      throw new ConflictException('Esiste già uno studio con questo nome');
    }

    const studio = this.studioRepository.create(createStudioDto);
    return this.studioRepository.save(studio);
  }

  async update(id: string, updateStudioDto: UpdateStudioDto): Promise<Studio> {
    const studio = await this.findOne(id);

    // Se viene aggiornato il nome, verifica che non sia già in uso
    if (updateStudioDto.nome && updateStudioDto.nome !== studio.nome) {
      const existingStudio = await this.studioRepository.findOne({
        where: { nome: updateStudioDto.nome },
      });

      if (existingStudio && existingStudio.id !== studio.id) {
        throw new ConflictException('Esiste già uno studio con questo nome');
      }
    }

    Object.assign(studio, updateStudioDto);
    return this.studioRepository.save(studio);
  }

  /**
   * Soft delete dello studio con backup automatico e disattivazione a cascata
   * Implementa soft delete invece di eliminazione permanente
   */
  async remove(id: string): Promise<void> {
    const studio = await this.findOne(id);

    this.logger.log(`Inizio soft delete dello studio ${studio.nome} (${id})`);

    try {
      await this.studioRepository.manager.transaction(async (manager) => {
        // STEP 1: Crea backup automatico prima dell'eliminazione
        this.logger.log('Creazione backup automatico...');
        const backupPath = await this.backupService.createStudioBackup(id);
        this.logger.log(`Backup creato: ${backupPath}`);

        // STEP 2: Disattiva tutti gli utenti dello studio
        await manager
          .createQueryBuilder()
          .update(User)
          .set({ attivo: false })
          .where('studioId = :studioId', { studioId: id })
          .execute();
        this.logger.log('Disattivati tutti gli utenti dello studio');

        // STEP 3: Disattiva tutti i clienti dello studio
        await manager
          .createQueryBuilder()
          .update(Cliente)
          .set({ attivo: false })
          .where('studioId = :studioId', { studioId: id })
          .execute();
        this.logger.log('Disattivati tutti i clienti dello studio');

        // STEP 4: Disattiva tutte le pratiche dello studio
        await manager
          .createQueryBuilder()
          .update(Pratica)
          .set({ attivo: false })
          .where('studioId = :studioId', { studioId: id })
          .execute();
        this.logger.log('Disattivate tutte le pratiche dello studio');

        // STEP 5: Disattiva tutti i debitori dello studio
        await manager
          .createQueryBuilder()
          .update(Debitore)
          .set({ attivo: false })
          .where('studioId = :studioId', { studioId: id })
          .execute();
        this.logger.log('Disattivati tutti i debitori dello studio');

        // STEP 6: Disattiva tutti gli avvocati dello studio
        await manager
          .createQueryBuilder()
          .update(Avvocato)
          .set({ attivo: false })
          .where('studioId = :studioId', { studioId: id })
          .execute();
        this.logger.log('Disattivati tutti gli avvocati dello studio');

        // STEP 7: Soft delete dello studio (imposta deletedAt e disattiva)
        await manager
          .createQueryBuilder()
          .update(Studio)
          .set({
            deletedAt: () => 'CURRENT_TIMESTAMP',
            attivo: false
          })
          .where('id = :id', { id })
          .execute();
        this.logger.log(`Studio ${studio.nome} eliminato con soft delete (backup: ${backupPath})`);
      });
    } catch (error) {
      this.logger.error(`Errore durante l'eliminazione dello studio ${studio.nome}:`, error);
      throw new ConflictException(
        `Errore durante l'eliminazione dello studio: ${error.message}`,
      );
    }
  }

  /**
   * Hard delete permanente dello studio e tutti i dati associati
   * Da usare solo per eliminazione definitiva (es. dopo periodo di retention)
   * Usa TypeORM QueryBuilder invece di raw SQL
   */
  async permanentDelete(id: string): Promise<void> {
    // Recupera anche gli studi soft-deleted
    const studio = await this.studioRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!studio) {
      throw new NotFoundException('Studio non trovato');
    }

    this.logger.log(`Inizio eliminazione permanente dello studio ${studio.nome} (${id})`);

    try {
      await this.studioRepository.manager.transaction(async (manager) => {
        // STEP 1: Trova tutti i clienti e pratiche dello studio
        const clienti = await manager
          .createQueryBuilder(Cliente, 'cliente')
          .select('cliente.id')
          .where('cliente.studioId = :studioId', { studioId: id })
          .getMany();
        const clientiIds = clienti.map(c => c.id);
        this.logger.log(`Trovati ${clientiIds.length} clienti da eliminare`);

        const pratiche = await manager
          .createQueryBuilder(Pratica, 'pratica')
          .select('pratica.id')
          .where('pratica.studioId = :studioId', { studioId: id })
          .getMany();
        const praticheIds = pratiche.map(p => p.id);
        this.logger.log(`Trovate ${praticheIds.length} pratiche da eliminare`);

        // STEP 2: Elimina relazioni many-to-many usando QueryBuilder
        if (praticheIds.length > 0) {
          await manager.query(
            'DELETE FROM pratiche_collaboratori WHERE praticaId IN (?)',
            [praticheIds],
          );
          this.logger.log('Eliminate relazioni pratiche_collaboratori');

          await manager.query(
            'DELETE FROM pratiche_avvocati WHERE praticaId IN (?)',
            [praticheIds],
          );
          this.logger.log('Eliminate relazioni pratiche_avvocati');

          // Elimina notifications
          await manager.query(
            'DELETE FROM notifications WHERE praticaId IN (?)',
            [praticheIds],
          );
          this.logger.log('Eliminate notifications');
        }

        if (clientiIds.length > 0) {
          await manager.query(
            'DELETE FROM clienti_debitori WHERE clienteId IN (?)',
            [clientiIds],
          );
          this.logger.log('Eliminate relazioni clienti_debitori');
        }

        // STEP 3: Elimina tickets, alerts, movimenti finanziari
        await manager
          .createQueryBuilder()
          .delete()
          .from('tickets')
          .where('studioId = :studioId', { studioId: id })
          .execute();
        this.logger.log('Eliminati tickets');

        await manager
          .createQueryBuilder()
          .delete()
          .from('alerts')
          .where('studioId = :studioId', { studioId: id })
          .execute();
        this.logger.log('Eliminati alerts');

        await manager
          .createQueryBuilder()
          .delete()
          .from('movimenti_finanziari')
          .where('studioId = :studioId', { studioId: id })
          .execute();
        this.logger.log('Eliminati movimenti_finanziari');

        // STEP 4: Elimina documenti e cartelle
        const cartelle = await manager.query(
          'SELECT id FROM cartelle WHERE studioId = ?',
          [id],
        );
        const cartelleIds = cartelle.map((c: any) => c.id);

        if (cartelleIds.length > 0) {
          await manager.query(
            'DELETE FROM cartelle_closure WHERE id_ancestor IN (?) OR id_descendant IN (?)',
            [cartelleIds, cartelleIds],
          );
          this.logger.log('Eliminate relazioni cartelle_closure');
        }

        await manager
          .createQueryBuilder()
          .delete()
          .from('documenti')
          .where('studioId = :studioId', { studioId: id })
          .execute();
        this.logger.log('Eliminati documenti');

        if (cartelleIds.length > 0) {
          await manager
            .createQueryBuilder()
            .delete()
            .from('cartelle')
            .where('studioId = :studioId', { studioId: id })
            .execute();
          this.logger.log('Eliminate cartelle');
        }

        // STEP 5: Elimina pratiche
        if (praticheIds.length > 0) {
          await manager
            .createQueryBuilder()
            .delete()
            .from(Pratica)
            .where('studioId = :studioId', { studioId: id })
            .execute();
          this.logger.log('Eliminate pratiche');
        }

        // STEP 6: Elimina debitori, clienti, avvocati
        await manager
          .createQueryBuilder()
          .delete()
          .from(Debitore)
          .where('studioId = :studioId', { studioId: id })
          .execute();
        this.logger.log('Eliminati debitori');

        if (clientiIds.length > 0) {
          await manager
            .createQueryBuilder()
            .delete()
            .from(Cliente)
            .where('studioId = :studioId', { studioId: id })
            .execute();
          this.logger.log('Eliminati clienti');
        }

        await manager
          .createQueryBuilder()
          .delete()
          .from(Avvocato)
          .where('studioId = :studioId', { studioId: id })
          .execute();
        this.logger.log('Eliminati avvocati');

        // STEP 7: Elimina audit logs e utenti
        await manager
          .createQueryBuilder()
          .delete()
          .from('audit_logs')
          .where('studioId = :studioId', { studioId: id })
          .execute();
        this.logger.log('Eliminati audit_logs');

        await manager
          .createQueryBuilder()
          .delete()
          .from(User)
          .where('studioId = :studioId', { studioId: id })
          .execute();
        this.logger.log('Eliminati users');

        // STEP 8: Elimina definitivamente lo studio (hard delete)
        await manager
          .createQueryBuilder()
          .delete()
          .from(Studio)
          .where('id = :id', { id })
          .execute();
        this.logger.log(`Studio ${studio.nome} eliminato permanentemente`);
      });

      this.logger.log(`Eliminazione permanente completata per studio ${studio.nome}`);
    } catch (error) {
      this.logger.error(`Errore durante l'eliminazione permanente dello studio ${studio.nome}:`, error);
      throw new ConflictException(
        `Errore durante l'eliminazione permanente dello studio: ${error.message}`,
      );
    }
  }

  /**
   * Ripristina uno studio soft-deleted e riattiva tutti i dati collegati
   */
  async restore(id: string): Promise<Studio> {
    const studio = await this.studioRepository.findOne({
      where: { id },
      withDeleted: true,
    });

    if (!studio) {
      throw new NotFoundException('Studio non trovato');
    }

    if (!studio.deletedAt) {
      throw new ConflictException('Lo studio non è stato eliminato');
    }

    this.logger.log(`Ripristino dello studio ${studio.nome} (${id})`);

    try {
      await this.studioRepository.manager.transaction(async (manager) => {
        // STEP 1: Ripristina lo studio (rimuove deletedAt e riattiva)
        await manager
          .createQueryBuilder()
          .update(Studio)
          .set({
            deletedAt: null,
            attivo: true
          })
          .where('id = :id', { id })
          .execute();
        this.logger.log(`Studio ${studio.nome} ripristinato`);

        // STEP 2: Riattiva tutti gli utenti dello studio
        await manager
          .createQueryBuilder()
          .update(User)
          .set({ attivo: true })
          .where('studioId = :studioId', { studioId: id })
          .execute();
        this.logger.log('Riattivati tutti gli utenti dello studio');

        // STEP 3: Riattiva tutti i clienti dello studio
        await manager
          .createQueryBuilder()
          .update(Cliente)
          .set({ attivo: true })
          .where('studioId = :studioId', { studioId: id })
          .execute();
        this.logger.log('Riattivati tutti i clienti dello studio');

        // STEP 4: Riattiva tutte le pratiche dello studio
        await manager
          .createQueryBuilder()
          .update(Pratica)
          .set({ attivo: true })
          .where('studioId = :studioId', { studioId: id })
          .execute();
        this.logger.log('Riattivate tutte le pratiche dello studio');

        // STEP 5: Riattiva tutti i debitori dello studio
        await manager
          .createQueryBuilder()
          .update(Debitore)
          .set({ attivo: true })
          .where('studioId = :studioId', { studioId: id })
          .execute();
        this.logger.log('Riattivati tutti i debitori dello studio');

        // STEP 6: Riattiva tutti gli avvocati dello studio
        await manager
          .createQueryBuilder()
          .update(Avvocato)
          .set({ attivo: true })
          .where('studioId = :studioId', { studioId: id })
          .execute();
        this.logger.log('Riattivati tutti gli avvocati dello studio');
      });

      return this.findOne(id);
    } catch (error) {
      this.logger.error(`Errore durante il ripristino dello studio ${studio.nome}:`, error);
      throw new ConflictException(
        `Errore durante il ripristino dello studio: ${error.message}`,
      );
    }
  }

  async toggleActive(id: string): Promise<Studio> {
    const studio = await this.findOne(id);
    studio.attivo = !studio.attivo;
    return this.studioRepository.save(studio);
  }

  async getStudioStats(id: string) {
    const studio = await this.studioRepository
      .createQueryBuilder('studio')
      .leftJoinAndSelect('studio.users', 'user')
      .leftJoinAndSelect('studio.pratiche', 'pratica', 'pratica.attivo = :attivo', { attivo: true })
      .leftJoinAndSelect('studio.clienti', 'cliente', 'cliente.attivo = :attivo', { attivo: true })
      .leftJoinAndSelect('studio.debitori', 'debitore', 'debitore.attivo = :attivo', { attivo: true })
      .leftJoinAndSelect('studio.avvocati', 'avvocato', 'avvocato.attivo = :attivo', { attivo: true })
      .leftJoinAndSelect('studio.documenti', 'documento', 'documento.attivo = :attivo', { attivo: true })
      .leftJoinAndSelect('studio.tickets', 'ticket', 'ticket.attivo = :attivo', { attivo: true })
      .leftJoinAndSelect('studio.alerts', 'alert', 'alert.attivo = :attivo', { attivo: true })
      .where('studio.id = :id', { id })
      .getOne();

    if (!studio) {
      throw new NotFoundException('Studio non trovato');
    }

    // Calcola statistiche pratiche
    const praticheAperte = studio.pratiche?.filter(p => p.aperta).length || 0;
    const praticheChiuse = studio.pratiche?.filter(p => !p.aperta).length || 0;

    // Calcola totali finanziari
    const capitaleAffidato = studio.pratiche?.reduce((sum, p) => sum + (p.capitale || 0), 0) || 0;
    const capitaleRecuperato = studio.pratiche?.reduce((sum, p) => sum + (p.importoRecuperatoCapitale || 0), 0) || 0;

    // Calcola spazio storage utilizzato (in MB)
    const storageUtilizzato = studio.documenti?.reduce((sum, d) => sum + (d.dimensione || 0), 0) || 0;
    const storageUtilizzatoMB = (storageUtilizzato / 1024 / 1024).toFixed(2);

    // Utenti per ruolo
    const utentiPerRuolo = studio.users?.reduce((acc, user) => {
      acc[user.ruolo] = (acc[user.ruolo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Alerts aperti
    const alertsAperti = studio.alerts?.filter(a => a.stato === 'in_gestione').length || 0;

    // Tickets aperti
    const ticketsAperti = studio.tickets?.filter(t => t.stato === 'aperto' || t.stato === 'in_gestione').length || 0;

    return {
      studio: {
        id: studio.id,
        nome: studio.nome,
        ragioneSociale: studio.ragioneSociale,
        email: studio.email,
        telefono: studio.telefono,
        attivo: studio.attivo,
        maxUtenti: studio.maxUtenti ?? null,
        createdAt: studio.createdAt,
        updatedAt: studio.updatedAt,
      },
      statistiche: {
        numeroUtenti: studio.users?.length || 0,
        utentiAttivi: studio.users?.filter(u => u.attivo).length || 0,
        utentiPerRuolo,
        numeroPratiche: studio.pratiche?.length || 0,
        praticheAperte,
        praticheChiuse,
        numeroClienti: studio.clienti?.length || 0,
        numeroDebitori: studio.debitori?.length || 0,
        numeroAvvocati: studio.avvocati?.length || 0,
        numeroDocumenti: studio.documenti?.length || 0,
        storageUtilizzatoMB: parseFloat(storageUtilizzatoMB),
        alertsAperti,
        ticketsAperti,
      },
      finanziari: {
        capitaleAffidato,
        capitaleRecuperato,
        percentualeRecupero: capitaleAffidato > 0 ? ((capitaleRecuperato / capitaleAffidato) * 100).toFixed(2) : '0.00',
      },
    };
  }

  async getOrphanedRecords() {
    const [clienti, debitori, allUsers, avvocati, pratiche] = await Promise.all([
      this.clientiRepository.find({
        where: { studioId: IsNull() },
        order: { createdAt: 'DESC' },
      }),
      this.debitoriRepository.find({
        where: { studioId: IsNull() },
        order: { createdAt: 'DESC' },
      }),
      this.usersRepository.find({
        where: { studioId: IsNull() },
        order: { createdAt: 'DESC' },
      }),
      this.avvocatiRepository.find({
        where: { studioId: IsNull() },
        order: { createdAt: 'DESC' },
      }),
      this.praticheRepository.find({
        where: { studioId: IsNull() },
        order: { createdAt: 'DESC' },
      }),
    ]);

    // Filtra admin@resolv.it dagli utenti orfani per evitare assegnazioni accidentali
    const users = allUsers.filter(user => user.email !== 'admin@resolv.it');

    return {
      clienti,
      debitori,
      users,
      avvocati,
      pratiche,
      totale: clienti.length + debitori.length + users.length + avvocati.length + pratiche.length,
    };
  }

  async assignOrphanedRecords(
    entityType: string,
    recordIds: string[],
    studioId: string,
  ) {
    // Verifica che lo studio esista
    const studio = await this.findOne(studioId);
    if (!studio) {
      throw new NotFoundException('Studio non trovato');
    }

    let repository: Repository<any>;
    switch (entityType) {
      case 'clienti':
        repository = this.clientiRepository;
        break;
      case 'debitori':
        repository = this.debitoriRepository;
        break;
      case 'users':
        repository = this.usersRepository;
        break;
      case 'avvocati':
        repository = this.avvocatiRepository;
        break;
      case 'pratiche':
        repository = this.praticheRepository;
        break;
      default:
        throw new ConflictException('Tipo di entità non supportato');
    }

    // Aggiorna i record assegnandoli allo studio
    const result = await repository
      .createQueryBuilder()
      .update()
      .set({ studioId })
      .whereInIds(recordIds)
      .execute();

    return {
      success: true,
      updated: result.affected || 0,
    };
  }

  async updateLogo(id: string, logoBase64: string) {
    const studio = await this.studioRepository.findOne({ where: { id } });
    if (!studio) {
      throw new NotFoundException('Studio non trovato');
    }

    studio.logo = logoBase64;
    await this.studioRepository.save(studio);

    return { success: true, message: 'Logo aggiornato con successo' };
  }

  async deleteLogo(id: string) {
    const studio = await this.studioRepository.findOne({ where: { id } });
    if (!studio) {
      throw new NotFoundException('Studio non trovato');
    }

    await this.studioRepository.update(id, { logo: null });

    return { success: true, message: 'Logo rimosso con successo' };
  }
}
