import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Not, IsNull, Repository } from 'typeorm';
import { CheckupMembership } from './checkup-membership.entity';
import { CheckupUser, CheckupUserRole } from '../users/checkup-user.entity';

/** Contesto operativo di un'appartenenza (ruolo + riferimenti). */
export interface MembershipContext {
  ruolo: CheckupUserRole;
  studioId?: string | null;
  clientId?: string | null;
  sublicenseId?: string | null;
  anagraficaId?: string | null;
  azienda?: string | null;
  macroAreaOwner?: string[] | null;
  macroAreaAssignments?: string[] | null;
  superOwner?: boolean;
}

/** Relazioni caricate per ricostruire il contesto operativo di un'appartenenza. */
const CONTEXT_RELATIONS = [
  'studio',
  'studio.license',
  'client',
  'client.sublicenses',
  'client.sublicenses.model',
  'client.sublicenses.license',
  'client.sublicenses.license.studio',
  'sublicense',
  'sublicense.model',
  'anagrafica',
];

export interface MembershipSummary {
  id: string;
  ruolo: string;
  isPrimary: boolean;
  attiva: boolean;
  studioId: string | null;
  studioNome: string | null;
  studioTipo: string | null;
  clientId: string | null;
  clientNome: string | null;
  anagraficaId: string | null;
  anagraficaNome: string | null;
  /** Etichetta leggibile per il selettore di contesto. */
  label: string;
}

@Injectable()
export class CheckupMembershipsService {
  constructor(
    @InjectRepository(CheckupMembership)
    private readonly membershipRepo: Repository<CheckupMembership>,
  ) {}

  /**
   * Risolve l'appartenenza attiva per un utente.
   * - Se `membershipId` è fornito e valido (appartiene all'utente ed è attiva) usa quello.
   * - Altrimenti ricade sulla primaria; in mancanza, sulla prima attiva.
   */
  async resolveActive(userId: string, membershipId?: string | null): Promise<CheckupMembership | null> {
    if (membershipId) {
      const requested = await this.membershipRepo.findOne({
        where: { id: membershipId, userId, attiva: true },
        relations: CONTEXT_RELATIONS,
      });
      if (requested) return requested;
    }

    const primary = await this.membershipRepo.findOne({
      where: { userId, isPrimary: true, attiva: true },
      relations: CONTEXT_RELATIONS,
    });
    if (primary) return primary;

    return this.membershipRepo.findOne({
      where: { userId, attiva: true },
      relations: CONTEXT_RELATIONS,
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Sovrappone il contesto dell'appartenenza attiva sulle colonne "legacy"
   * dell'utente, così che guardie/servizi/payload esistenti continuino a
   * funzionare invariati leggendo `user.studioId`, `user.ruolo`, ecc.
   */
  applyToUser(user: CheckupUser, membership: CheckupMembership | null): CheckupUser {
    if (!membership) return user;
    user.ruolo = membership.ruolo;
    user.studioId = membership.studioId;
    user.clientId = membership.clientId;
    user.sublicenseId = membership.sublicenseId;
    user.anagraficaId = membership.anagraficaId;
    user.macroAreaOwner = membership.macroAreaOwner;
    user.macroAreaAssignments = membership.macroAreaAssignments;
    user.superOwner = membership.superOwner;
    if (membership.azienda != null) user.azienda = membership.azienda;
    user.studio = membership.studio ?? null;
    user.client = membership.client ?? null;
    (user as CheckupUser & { activeMembershipId?: string | null }).activeMembershipId = membership.id;
    return user;
  }

  /** Elenca le appartenenze attive dell'utente per il selettore di contesto. */
  async listForUser(userId: string): Promise<MembershipSummary[]> {
    const memberships = await this.membershipRepo.find({
      where: { userId, attiva: true },
      relations: ['studio', 'client', 'anagrafica'],
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });
    return memberships.map((m) => this.toSummary(m));
  }

  /** Conta le appartenenze attive dell'utente (per decidere se mostrare lo switcher). */
  async countActiveForUser(userId: string): Promise<number> {
    return this.membershipRepo.count({ where: { userId, attiva: true } });
  }

  private toSummary(m: CheckupMembership): MembershipSummary {
    const roleLabels: Record<string, string> = {
      admin_studio: 'Amministratore',
      segreteria: 'Segreteria',
      collaboratore: 'Collaboratore',
      cliente: 'Cliente',
    };
    const contextName =
      m.studio?.ragioneSociale ??
      m.studio?.nome ??
      m.client?.ragioneSociale ??
      m.client?.nome ??
      (m.anagrafica ? `${m.anagrafica.nome} ${m.anagrafica.cognome}`.trim() : null) ??
      'Contesto';
    const roleLabel = roleLabels[m.ruolo] ?? m.ruolo;
    return {
      id: m.id,
      ruolo: m.ruolo,
      isPrimary: m.isPrimary,
      attiva: m.attiva,
      studioId: m.studioId,
      studioNome: m.studio?.nome ?? null,
      studioTipo: m.studio?.tipo ?? null,
      clientId: m.clientId,
      clientNome: m.client?.nome ?? null,
      anagraficaId: m.anagraficaId,
      anagraficaNome: m.anagrafica ? `${m.anagrafica.nome} ${m.anagrafica.cognome}`.trim() : null,
      label: `${contextName} · ${roleLabel}`,
    };
  }

  /**
   * Crea un'appartenenza per un utente in un dato contesto.
   * Impedisce duplicati esatti (stesso userId + studioId + clientId + ruolo attivo).
   */
  async createForUser(
    userId: string,
    ctx: MembershipContext,
    opts: { isPrimary?: boolean } = {},
  ): Promise<CheckupMembership> {
    const duplicate = await this.membershipRepo.findOne({
      where: {
        userId,
        ruolo: ctx.ruolo,
        studioId: ctx.studioId ?? IsNull(),
        clientId: ctx.clientId ?? IsNull(),
        attiva: true,
      },
    });
    if (duplicate) {
      throw new ConflictException('L\'utente ha già questo ruolo in questo contesto');
    }
    const membership = this.membershipRepo.create({
      userId,
      ruolo: ctx.ruolo,
      studioId: ctx.studioId ?? null,
      clientId: ctx.clientId ?? null,
      sublicenseId: ctx.sublicenseId ?? null,
      anagraficaId: ctx.anagraficaId ?? null,
      azienda: ctx.azienda ?? null,
      macroAreaOwner: ctx.macroAreaOwner ?? null,
      macroAreaAssignments: ctx.macroAreaAssignments ?? null,
      superOwner: Boolean(ctx.superOwner),
      isPrimary: Boolean(opts.isPrimary),
      attiva: true,
    });
    return this.membershipRepo.save(membership);
  }

  /**
   * Mantiene allineata l'appartenenza primaria alle colonne "legacy" dell'utente.
   * Crea la primaria se assente (es. utenti antecedenti al backfill).
   */
  async syncPrimary(user: CheckupUser): Promise<void> {
    // Il superadmin opera a livello globale, senza appartenenza a un contesto.
    const validRoles = ['admin_studio', 'segreteria', 'collaboratore', 'cliente'];
    if (!validRoles.includes(user.ruolo)) return;
    const ctx: MembershipContext = {
      ruolo: user.ruolo,
      studioId: user.studioId,
      clientId: user.clientId,
      sublicenseId: user.sublicenseId,
      anagraficaId: user.anagraficaId,
      azienda: user.azienda,
      macroAreaOwner: user.macroAreaOwner,
      macroAreaAssignments: user.macroAreaAssignments,
      superOwner: user.superOwner,
    };
    const primary = await this.membershipRepo.findOne({ where: { userId: user.id, isPrimary: true } });
    if (primary) {
      Object.assign(primary, ctx, { attiva: user.attivo });
      await this.membershipRepo.save(primary);
    } else {
      await this.membershipRepo.save(
        this.membershipRepo.create({ userId: user.id, ...ctx, isPrimary: true, attiva: user.attivo }),
      );
    }
  }

  /**
   * Appartenenze attive in un contesto (studio o suoi clienti), indicizzate per
   * userId — usato per includere e mostrare correttamente gli utenti "associati"
   * (identità riusata) nella lista utenti di quel contesto.
   */
  async mapActiveInContext(
    studioId: string,
    clientIds: string[],
  ): Promise<Map<string, CheckupMembership>> {
    const qb = this.membershipRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.studio', 'studio')
      .leftJoinAndSelect('m.client', 'client')
      .leftJoinAndSelect('m.sublicense', 'sublicense')
      .where('m.attiva = :attiva', { attiva: true })
      .andWhere(
        new Brackets((sub) => {
          sub.where('m.studioId = :studioId', { studioId });
          if (clientIds.length) {
            sub.orWhere('m.clientId IN (:...clientIds)', { clientIds });
          }
        }),
      );
    const memberships = await qb.getMany();
    const map = new Map<string, CheckupMembership>();
    for (const m of memberships) {
      // Preferisce l'appartenenza legata allo studio corrente, se presente.
      const existing = map.get(m.userId);
      if (!existing || (m.studioId === studioId && existing.studioId !== studioId)) {
        map.set(m.userId, m);
      }
    }
    return map;
  }

  /**
   * Elenca le utenze (attive) associate a un'entità (studio o cliente) tramite
   * un'appartenenza attiva — usato per proporre l'import delle utenze quando si
   * riusa l'anagrafica aziendale di quell'entità.
   */
  async listUsersForEntity(target: { studioId?: string | null; clientId?: string | null }) {
    const qb = this.membershipRepo
      .createQueryBuilder('m')
      .innerJoinAndSelect('m.user', 'user')
      .where('m.attiva = :a', { a: true })
      .andWhere('user.attivo = :ua', { ua: true });
    if (target.studioId) {
      qb.andWhere('m.studioId = :sid', { sid: target.studioId });
    } else if (target.clientId) {
      qb.andWhere('m.clientId = :cid', { cid: target.clientId });
    } else {
      return [];
    }
    const memberships = await qb.orderBy('user.cognome', 'ASC').addOrderBy('user.nome', 'ASC').getMany();
    const roleLabels: Record<string, string> = {
      admin_studio: 'Amministratore',
      segreteria: 'Segreteria',
      collaboratore: 'Collaboratore',
      cliente: 'Cliente',
    };
    const seen = new Set<string>();
    const out: Array<{ userId: string; nome: string; cognome: string; email: string; ruolo: string; ruoloLabel: string }> = [];
    for (const m of memberships) {
      if (!m.user || seen.has(m.userId)) continue;
      seen.add(m.userId);
      out.push({
        userId: m.userId,
        nome: m.user.nome,
        cognome: m.user.cognome,
        email: m.user.email,
        ruolo: m.ruolo,
        ruoloLabel: roleLabels[m.ruolo] ?? m.ruolo,
      });
    }
    return out;
  }

  /**
   * Fra gli anagraficaId dati, restituisce quelli collegati ad almeno un'utenza
   * staff attiva tramite appartenenza (oltre al legame diretto user.anagraficaId).
   * Serve a includere fra i "consulenti" anche le anagrafiche le cui utenze sono
   * state importate/riusate (legame via membership, non sulla riga utente).
   */
  async anagraficaIdsWithActiveStaff(anagraficaIds: string[]): Promise<Set<string>> {
    if (!anagraficaIds.length) return new Set();
    const rows = await this.membershipRepo
      .createQueryBuilder('m')
      .innerJoin('m.user', 'user')
      .select('m.anagraficaId', 'anagraficaId')
      .where('m.anagraficaId IN (:...ids)', { ids: anagraficaIds })
      .andWhere('m.attiva = :a', { a: true })
      .andWhere('user.attivo = :ua', { ua: true })
      .andWhere("m.ruolo IN ('admin_studio','segreteria','collaboratore')")
      .getRawMany<{ anagraficaId: string }>();
    return new Set(rows.map((r) => r.anagraficaId).filter(Boolean));
  }

  /**
   * Fonte di verità unica per "chi appartiene a un contesto": restituisce gli
   * userId con un'appartenenza attiva (utente attivo) nel contesto dato,
   * includendo sia il contesto primario sia quelli riusati/associati.
   * Sostituisce le enumerazioni basate sulle colonne primarie dell'utente.
   */
  async activeUserIdsForContext(target: {
    studioId?: string | null;
    clientId?: string | null;
    sublicenseId?: string | null;
    ruoli?: CheckupUserRole[];
  }): Promise<string[]> {
    if (!target.studioId && !target.clientId && !target.sublicenseId) return [];
    const qb = this.membershipRepo
      .createQueryBuilder('m')
      .innerJoin('m.user', 'user')
      .select('DISTINCT m.userId', 'userId')
      .where('m.attiva = :a', { a: true })
      .andWhere('user.attivo = :ua', { ua: true });
    if (target.studioId) qb.andWhere('m.studioId = :sid', { sid: target.studioId });
    if (target.clientId) qb.andWhere('m.clientId = :cid', { cid: target.clientId });
    if (target.sublicenseId) qb.andWhere('m.sublicenseId = :subid', { subid: target.sublicenseId });
    if (target.ruoli?.length) qb.andWhere('m.ruolo IN (:...ruoli)', { ruoli: target.ruoli });
    const rows = await qb.getRawMany<{ userId: string }>();
    return rows.map((r) => r.userId).filter(Boolean);
  }

  /** Come countStudioSeats/countClientSeats ma con esclusione di un utente (percorsi di update). */
  async countContextSeats(
    target: { studioId?: string | null; sublicenseId?: string | null; ruoli?: CheckupUserRole[] },
    excludeUserId?: string,
  ): Promise<number> {
    const ids = await this.activeUserIdsForContext(target);
    const filtered = excludeUserId ? ids.filter((id) => id !== excludeUserId) : ids;
    return filtered.length;
  }

  /** Posti occupati (appartenenze staff attive) in uno studio licenziatario. */
  async countStudioSeats(studioId: string): Promise<number> {
    return this.membershipRepo.count({
      where: { studioId, ruolo: Not('cliente' as CheckupUserRole), attiva: true },
    });
  }

  /** Posti occupati (appartenenze cliente attive) su una sublicenza. */
  async countClientSeats(sublicenseId: string): Promise<number> {
    return this.membershipRepo.count({
      where: { sublicenseId: sublicenseId ?? IsNull(), attiva: true },
    });
  }

  /**
   * Costruisce il payload di conflitto "email già in uso" arricchito con i
   * contesti a cui l'utenza esistente già appartiene e una valutazione
   * `sameCompany` rispetto alla società di destinazione (match per P.IVA/CF o
   * collegamento tracciato linkedStudioId). Usato per proporre il riuso in modo
   * informato in fase di creazione utente.
   */
  async buildEmailConflict(
    existingUser: { id: string; nome: string; cognome: string; email: string },
    target: {
      studioId?: string | null;
      ragioneSociale?: string | null;
      partitaIva?: string | null;
      codiceFiscale?: string | null;
      linkedStudioId?: string | null;
    },
  ) {
    const memberships = await this.membershipRepo.find({
      where: { userId: existingUser.id, attiva: true },
      relations: ['studio', 'client', 'anagrafica'],
      order: { isPrimary: 'DESC', createdAt: 'ASC' },
    });

    const roleLabels: Record<string, string> = {
      admin_studio: 'Amministratore',
      segreteria: 'Segreteria',
      collaboratore: 'Collaboratore',
      cliente: 'Cliente',
    };

    const norm = (v?: string | null) => (v || '').trim().toLowerCase();
    const targetPiva = norm(target.partitaIva);
    const targetCf = norm(target.codiceFiscale);

    const existingContexts = memberships.map((m) => {
      const company = m.studio ?? m.client ?? null;
      const companyName =
        (company as { ragioneSociale?: string | null } | null)?.ragioneSociale ??
        (company as { nome?: string | null } | null)?.nome ??
        (m.anagrafica ? `${m.anagrafica.nome} ${m.anagrafica.cognome}`.trim() : null) ??
        null;
      return {
        ruolo: m.ruolo,
        ruoloLabel: roleLabels[m.ruolo] ?? m.ruolo,
        companyName,
        partitaIva: (company as { partitaIva?: string | null } | null)?.partitaIva ?? null,
        codiceFiscale: (company as { codiceFiscale?: string | null } | null)?.codiceFiscale ?? null,
        studioId: m.studioId,
        studioLinkedStudioId: m.studio?.linkedStudioId ?? null,
      };
    });

    const sameCompany = existingContexts.some((c) => {
      if (targetPiva && norm(c.partitaIva) === targetPiva) return true;
      if (targetCf && norm(c.codiceFiscale) === targetCf) return true;
      if (target.linkedStudioId && c.studioId && c.studioId === target.linkedStudioId) return true;
      if (c.studioLinkedStudioId && target.studioId && c.studioLinkedStudioId === target.studioId) return true;
      return false;
    });

    return {
      message: 'Email già in uso',
      code: 'EMAIL_EXISTS',
      canAssociate: true,
      sameCompany,
      existingUser: {
        id: existingUser.id,
        nome: existingUser.nome,
        cognome: existingUser.cognome,
        email: existingUser.email,
      },
      existingContexts: existingContexts.map(({ ruolo, ruoloLabel, companyName }) => ({
        ruolo,
        ruoloLabel,
        companyName,
      })),
      targetCompany: {
        name: target.ragioneSociale ?? null,
        partitaIva: target.partitaIva ?? null,
        codiceFiscale: target.codiceFiscale ?? null,
      },
    };
  }

  /**
   * Rimuove un'appartenenza (togliere un'utenza da un contesto) senza toccare
   * l'identità né gli altri contesti. Non consente di rimuovere l'appartenenza
   * primaria (il contesto principale dell'utenza). `restrictStudioId` limita
   * l'operazione alle appartenenze di quello studio (per admin_studio).
   */
  async removeMembership(
    membershipId: string,
    opts: { restrictStudioId?: string | null } = {},
  ): Promise<void> {
    const m = await this.membershipRepo.findOne({ where: { id: membershipId } });
    if (!m) {
      throw new NotFoundException('Appartenenza non trovata');
    }
    if (m.isPrimary) {
      throw new ConflictException(
        'Non puoi rimuovere l\'appartenenza primaria: è il contesto principale dell\'utenza. Disattiva l\'utenza dal suo contesto d\'origine.',
      );
    }
    if (opts.restrictStudioId && m.studioId !== opts.restrictStudioId) {
      throw new ForbiddenException('Non autorizzato su questa appartenenza');
    }
    await this.membershipRepo.delete(m.id);
  }

  /** Verifica che un'appartenenza appartenga all'utente (per lo switch di contesto). */
  async assertOwnedByUser(userId: string, membershipId: string): Promise<CheckupMembership> {
    const membership = await this.membershipRepo.findOne({
      where: { id: membershipId, userId, attiva: true },
    });
    if (!membership) {
      throw new NotFoundException('Contesto non disponibile per questo utente');
    }
    return membership;
  }
}
