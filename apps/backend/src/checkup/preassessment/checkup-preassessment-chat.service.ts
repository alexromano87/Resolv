import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckupPreassessment } from './checkup-preassessment.entity';
import { CheckupPreassessmentMessage } from './checkup-preassessment-message.entity';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { SendPreassessmentMessageDto } from './dto/send-preassessment-message.dto';

@Injectable()
export class CheckupPreassessmentChatService {
  constructor(
    @InjectRepository(CheckupPreassessment)
    private preassessmentRepository: Repository<CheckupPreassessment>,
    @InjectRepository(CheckupPreassessmentMessage)
    private messageRepository: Repository<CheckupPreassessmentMessage>,
    @InjectRepository(CheckupUser)
    private userRepository: Repository<CheckupUser>,
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
      if (pre.userId !== user.id) throw new ForbiddenException('Non autorizzato');
      return pre;
    }

    if (!user.studioId) {
      throw new ForbiddenException('Non autorizzato');
    }
    const client = await this.userRepository.findOne({
      where: { id: pre.userId, attivo: true },
      relations: ['client'],
    });
    if (!client || !client.clientId) {
      throw new ForbiddenException('Non autorizzato');
    }
    const license = await this.licenseRepository.findOne({ where: { studioId: user.studioId } });
    if (!license) {
      throw new ForbiddenException('Non autorizzato');
    }
    const sublicense = await this.sublicenseRepository.findOne({
      where: { licenseId: license.id, clientId: client.clientId, attiva: true },
    });
    if (!sublicense) {
      throw new ForbiddenException('Non autorizzato');
    }

    return pre;
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

    if (user.ruolo !== 'cliente' && user.ruolo !== 'collaboratore') {
      throw new ForbiddenException('Solo il cliente o il collaboratore possono inviare messaggi');
    }

    const msg = this.messageRepository.create({
      preassessmentId,
      sectionId,
      userId: user.id,
      messaggio: dto.messaggio,
    });

    return this.messageRepository.save(msg);
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
