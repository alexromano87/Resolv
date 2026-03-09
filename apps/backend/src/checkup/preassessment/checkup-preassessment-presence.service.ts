import { Injectable, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckupPreassessment } from './checkup-preassessment.entity';
import { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import { CheckupClient } from '../clients/checkup-client.entity';

/** Hard cap on the number of preassessment IDs tracked simultaneously in memory. */
const PRESENCE_MAP_SIZE_CAP = 10_000;

type PresenceEntry = { userId: string; name: string; expiresAt: number };

/**
 * Manages in-memory field-level collaborative presence for pre-assessments.
 *
 * Responsibility: who is currently editing which field of a given preassessment.
 * Completely independent of business logic (validation, data updates, etc.).
 */
@Injectable()
export class CheckupPreassessmentPresenceService {
  private readonly logger = new Logger(CheckupPreassessmentPresenceService.name);

  /** preassessmentId → fieldId → PresenceEntry */
  private readonly presenceByPreassessment = new Map<string, Map<string, PresenceEntry>>();

  /** Per-field async mutex to avoid race conditions on setPresenceActive. */
  private readonly presenceMutexes = new Map<string, Promise<void>>();

  constructor(
    @InjectRepository(CheckupPreassessment)
    private readonly preassessmentRepository: Repository<CheckupPreassessment>,
    @InjectRepository(CheckupClient)
    private readonly clientRepository: Repository<CheckupClient>,
    @InjectRepository(CheckupLicense)
    private readonly licenseRepository: Repository<CheckupLicense>,
    @InjectRepository(CheckupSublicense)
    private readonly sublicenseRepository: Repository<CheckupSublicense>,
  ) {}

  // ── Async mutex ────────────────────────────────────────────────────────────

  private async withPresenceLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    let release!: () => void;
    const lock = new Promise<void>((resolve) => { release = resolve; });
    const prev = this.presenceMutexes.get(key) ?? Promise.resolve();
    this.presenceMutexes.set(key, prev.then(() => lock));
    await prev;
    try {
      return await fn();
    } finally {
      release();
      if (this.presenceMutexes.get(key) === lock) {
        this.presenceMutexes.delete(key);
      }
    }
  }

  // ── Authorization helpers (self-contained, no circular dependency) ─────────

  private async checkAccess(currentUser: CheckupCurrentUserData, clientId: string): Promise<void> {
    if (currentUser.clientId && currentUser.clientId === clientId) return;
    if (!currentUser.studioId) {
      throw new ForbiddenException('Non autorizzato');
    }
    const license = await this.licenseRepository.findOne({ where: { studioId: currentUser.studioId } });
    if (license) {
      const sublicense = await this.sublicenseRepository.findOne({
        where: { licenseId: license.id, clientId, attiva: true },
      });
      if (sublicense) return;
    }
    throw new ForbiddenException('Non autorizzato');
  }

  private async checkAccessByPreassessmentId(
    currentUser: CheckupCurrentUserData,
    preassessmentId: string,
  ): Promise<{ preassessment: CheckupPreassessment; client: CheckupClient }> {
    const preassessment = await this.preassessmentRepository.findOne({ where: { id: preassessmentId } });
    if (!preassessment) throw new NotFoundException('Checkup non trovato');
    const client = await this.clientRepository.findOne({ where: { id: preassessment.clientId } });
    if (!client) throw new NotFoundException('Cliente non trovato');
    await this.checkAccess(currentUser, client.id);
    return { preassessment, client };
  }

  // ── In-memory cleanup ──────────────────────────────────────────────────────

  private cleanupPresence(preassessmentId: string): void {
    const map = this.presenceByPreassessment.get(preassessmentId);
    if (!map) return;
    const now = Date.now();
    for (const [fieldId, entry] of map.entries()) {
      if (entry.expiresAt < now) map.delete(fieldId);
    }
    if (map.size === 0) this.presenceByPreassessment.delete(preassessmentId);
  }

  /**
   * Global presence cleanup — runs every 5 minutes.
   * Prevents unbounded memory growth over long server uptime.
   */
  @Cron('*/5 * * * *')
  cleanupAllPresence(): void {
    const now = Date.now();
    let removed = 0;
    for (const [preassessmentId, map] of this.presenceByPreassessment.entries()) {
      for (const [fieldId, entry] of map.entries()) {
        if (entry.expiresAt < now) {
          map.delete(fieldId);
          removed++;
        }
      }
      if (map.size === 0) this.presenceByPreassessment.delete(preassessmentId);
    }
    if (removed > 0) {
      this.logger.debug(
        `Presence cleanup: removed ${removed} expired entries. Active preassessments: ${this.presenceByPreassessment.size}`,
      );
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async getPresence(preassessmentId: string, currentUser: CheckupCurrentUserData) {
    await this.checkAccessByPreassessmentId(currentUser, preassessmentId);
    this.cleanupPresence(preassessmentId);
    const map = this.presenceByPreassessment.get(preassessmentId);
    const fields = map
      ? Array.from(map.entries()).map(([fieldId, entry]) => ({
          fieldId,
          userId: entry.userId,
          name: entry.name,
        }))
      : [];
    return { fields };
  }

  async getOnline(currentUser: CheckupCurrentUserData) {
    const now = Date.now();
    const activeIds = Array.from(this.presenceByPreassessment.entries())
      .filter(([, map]) => Array.from(map.values()).some((v) => v.expiresAt > now))
      .map(([id]) => id);
    if (activeIds.length === 0) return { preassessmentIds: [] };

    if (currentUser.ruolo === 'cliente') {
      if (!currentUser.clientId) return { preassessmentIds: [] };
      const mine = await this.preassessmentRepository.findOne({ where: { clientId: currentUser.clientId } });
      return { preassessmentIds: mine ? [mine.id] : [] };
    }

    if (!currentUser.studioId) return { preassessmentIds: [] };
    const license = await this.licenseRepository.findOne({ where: { studioId: currentUser.studioId } });
    if (!license) return { preassessmentIds: [] };
    const sublicenses = await this.sublicenseRepository.find({
      where: { licenseId: license.id, attiva: true },
    });
    const clientIds = new Set(sublicenses.map((s) => s.clientId).filter(Boolean) as string[]);
    if (clientIds.size === 0) return { preassessmentIds: [] };

    const preassessments = await this.preassessmentRepository.find({
      where: activeIds.map((id) => ({ id })),
    });
    const filtered = preassessments.filter((p) => clientIds.has(p.clientId)).map((p) => p.id);
    return { preassessmentIds: filtered };
  }

  async setPresenceActive(
    preassessmentId: string,
    fieldId: string,
    currentUser: CheckupCurrentUserData,
  ) {
    const { preassessment } = await this.checkAccessByPreassessmentId(currentUser, preassessmentId);
    const isOwner = currentUser.clientId && currentUser.clientId === preassessment.clientId;
    const canEdit = !!isOwner || preassessment.studioCanEdit;
    if (!canEdit) throw new ForbiddenException('Modifiche non autorizzate');

    // Guard against unbounded map growth
    if (
      !this.presenceByPreassessment.has(preassessmentId) &&
      this.presenceByPreassessment.size >= PRESENCE_MAP_SIZE_CAP
    ) {
      this.logger.warn(
        `Presence map size cap reached (${PRESENCE_MAP_SIZE_CAP}). Ignoring setPresenceActive for preassessment ${preassessmentId}`,
      );
      return { ok: true };
    }

    const lockKey = `${preassessmentId}:${fieldId}`;
    return this.withPresenceLock(lockKey, async () => {
      const map = this.presenceByPreassessment.get(preassessmentId) || new Map<string, PresenceEntry>();
      const now = Date.now();
      const existing = map.get(fieldId);
      if (existing && existing.userId !== currentUser.id && existing.expiresAt > now) {
        throw new ForbiddenException('Campo in modifica da altro utente');
      }
      map.set(fieldId, {
        userId: currentUser.id,
        name: `${currentUser.nome} ${currentUser.cognome}`.trim() || currentUser.email,
        expiresAt: now + 30_000, // 30 s
      });
      this.presenceByPreassessment.set(preassessmentId, map);
      return { ok: true };
    });
  }

  async setPresenceInactive(
    preassessmentId: string,
    fieldId: string,
    currentUser: CheckupCurrentUserData,
  ) {
    await this.checkAccessByPreassessmentId(currentUser, preassessmentId);
    const map = this.presenceByPreassessment.get(preassessmentId);
    const entry = map?.get(fieldId);
    if (entry && entry.userId === currentUser.id) map?.delete(fieldId);
    this.cleanupPresence(preassessmentId);
    return { ok: true };
  }
}
