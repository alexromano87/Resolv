import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckupPreassessment } from './checkup-preassessment.entity';
import { CheckupPreassessmentMessage } from './checkup-preassessment-message.entity';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { SendPreassessmentMessageDto } from './dto/send-preassessment-message.dto';

@Injectable()
export class CheckupPreassessmentChatService {
  private typingByPreassessment = new Map<
    string,
    Map<string, Map<string, { name: string; ruolo: string; expiresAt: number }>>
  >();
  constructor(
    @InjectRepository(CheckupPreassessment)
    private preassessmentRepository: Repository<CheckupPreassessment>,
    @InjectRepository(CheckupPreassessmentMessage)
    private messageRepository: Repository<CheckupPreassessmentMessage>,
    @InjectRepository(CheckupLicense)
    private licenseRepository: Repository<CheckupLicense>,
    @InjectRepository(CheckupSublicense)
    private sublicenseRepository: Repository<CheckupSublicense>,
  ) {}

  private async verifyAccess(preassessmentId: string, user: CheckupCurrentUserData) {
    const pre = await this.preassessmentRepository.findOne({
      where: { id: preassessmentId },
    });
    if (!pre) throw new NotFoundException('Checkup non trovato');

    if (user.ruolo === 'cliente') {
      if (!user.clientId || pre.clientId !== user.clientId) throw new ForbiddenException('Non autorizzato');
      return pre;
    }

    if (!user.studioId) {
      throw new ForbiddenException('Non autorizzato');
    }
    const license = await this.licenseRepository.findOne({ where: { studioId: user.studioId } });
    if (!license) {
      throw new ForbiddenException('Non autorizzato');
    }
    const sublicense = await this.sublicenseRepository.findOne({
      where: { licenseId: license.id, clientId: pre.clientId, attiva: true },
    });
    if (!sublicense) {
      throw new ForbiddenException('Non autorizzato');
    }

    return pre;
  }

  private cleanupTyping(preassessmentId: string, sectionId: string) {
    const bySection = this.typingByPreassessment.get(preassessmentId);
    if (!bySection) return;
    const map = bySection.get(sectionId);
    if (!map) return;
    const now = Date.now();
    for (const [userId, entry] of map.entries()) {
      if (entry.expiresAt < now) {
        map.delete(userId);
      }
    }
    if (map.size === 0) {
      bySection.delete(sectionId);
    }
    if (bySection.size === 0) {
      this.typingByPreassessment.delete(preassessmentId);
    }
  }

  async getMessages(preassessmentId: string, sectionId: string, user: CheckupCurrentUserData) {
    await this.verifyAccess(preassessmentId, user);

    return this.messageRepository.find({
      where: { preassessmentId, sectionId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async sendMessage(
    preassessmentId: string,
    sectionId: string,
    dto: SendPreassessmentMessageDto,
    user: CheckupCurrentUserData,
  ) {
    await this.verifyAccess(preassessmentId, user);

    if (user.ruolo === 'cliente' || user.ruolo === 'collaboratore' || user.ruolo === 'admin_studio' || user.ruolo === 'segreteria') {
      // allowed
    } else {
      throw new ForbiddenException('Utente non autorizzato a inviare messaggi');
    }

    const msg = this.messageRepository.create({
      preassessmentId,
      sectionId,
      userId: user.id,
      messaggio: dto.messaggio,
    });

    return this.messageRepository.save(msg);
  }

  async getTyping(preassessmentId: string, sectionId: string, user: CheckupCurrentUserData) {
    await this.verifyAccess(preassessmentId, user);
    this.cleanupTyping(preassessmentId, sectionId);
    const bySection = this.typingByPreassessment.get(preassessmentId);
    const map = bySection?.get(sectionId);
    const users = map
      ? Array.from(map.entries()).map(([userId, entry]) => ({
        userId,
        name: entry.name,
        ruolo: entry.ruolo,
      }))
      : [];
    return { users };
  }

  async setTyping(preassessmentId: string, sectionId: string, active: boolean, user: CheckupCurrentUserData) {
    await this.verifyAccess(preassessmentId, user);
    const bySection = this.typingByPreassessment.get(preassessmentId) || new Map();
    const map = bySection.get(sectionId) || new Map();
    if (!active) {
      map.delete(user.id);
    } else {
      const name = `${user.nome} ${user.cognome}`.trim() || user.email;
      map.set(user.id, {
        name,
        ruolo: user.ruolo,
        expiresAt: Date.now() + 8000,
      });
    }
    if (map.size > 0) {
      bySection.set(sectionId, map);
      this.typingByPreassessment.set(preassessmentId, bySection);
    } else {
      bySection.delete(sectionId);
      if (bySection.size === 0) {
        this.typingByPreassessment.delete(preassessmentId);
      }
    }
    return { ok: true };
  }

  async markAsRead(id: string, user: CheckupCurrentUserData) {
    const msg = await this.messageRepository.findOne({ where: { id }, relations: ['preassessment'] });
    if (!msg) throw new NotFoundException('Messaggio non trovato');

    await this.verifyAccess(msg.preassessmentId, user);

    if (msg.userId !== user.id) {
      msg.letto = true;
      await this.messageRepository.save(msg);
    }
  }
}
