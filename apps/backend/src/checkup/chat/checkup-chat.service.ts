import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckupChatMessage } from './checkup-chat-message.entity';
import { CheckupQuestionnaire } from '../questionnaires/checkup-questionnaire.entity';
import { SendMessageDto } from './dto/send-message.dto';
import { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';

@Injectable()
export class CheckupChatService {
  constructor(
    @InjectRepository(CheckupChatMessage)
    private chatRepository: Repository<CheckupChatMessage>,
    @InjectRepository(CheckupQuestionnaire)
    private questionnaireRepository: Repository<CheckupQuestionnaire>,
  ) {}

  private async verifyAccess(questionnaireId: string, user: CheckupCurrentUserData) {
    const questionnaire = await this.questionnaireRepository.findOne({
      where: { id: questionnaireId, attivo: true },
    });

    if (!questionnaire) {
      throw new NotFoundException('Questionario non trovato');
    }

    if (user.ruolo === 'cliente' && questionnaire.clienteUserId !== user.id) {
      throw new ForbiddenException('Non autorizzato');
    }

    return questionnaire;
  }

  async sendMessage(
    questionnaireId: string,
    sectionId: string,
    dto: SendMessageDto,
    user: CheckupCurrentUserData,
  ): Promise<CheckupChatMessage> {
    await this.verifyAccess(questionnaireId, user);

    const message = this.chatRepository.create({
      questionnaireId,
      sectionId,
      questionId: dto.questionId || null,
      userId: user.id,
      messaggio: dto.messaggio,
    });

    return this.chatRepository.save(message);
  }

  async getMessages(
    questionnaireId: string,
    sectionId: string,
    user: CheckupCurrentUserData,
  ): Promise<CheckupChatMessage[]> {
    await this.verifyAccess(questionnaireId, user);

    return this.chatRepository.find({
      where: { questionnaireId, sectionId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async markAsRead(id: string, user: CheckupCurrentUserData): Promise<void> {
    const message = await this.chatRepository.findOne({
      where: { id },
      relations: ['questionnaire'],
    });

    if (!message) {
      throw new NotFoundException('Messaggio non trovato');
    }

    // Only mark as read if the reader is not the sender
    if (message.userId !== user.id) {
      message.letto = true;
      await this.chatRepository.save(message);
    }
  }

  async getUnreadCounts(
    questionnaireId: string,
    user: CheckupCurrentUserData,
  ): Promise<{ sectionId: string; count: number }[]> {
    await this.verifyAccess(questionnaireId, user);

    const result = await this.chatRepository
      .createQueryBuilder('m')
      .select('m.sectionId', 'sectionId')
      .addSelect('COUNT(*)', 'count')
      .where('m.questionnaireId = :qId', { qId: questionnaireId })
      .andWhere('m.letto = :letto', { letto: false })
      .andWhere('m.userId != :userId', { userId: user.id })
      .groupBy('m.sectionId')
      .getRawMany();

    return result.map((r) => ({ sectionId: r.sectionId, count: parseInt(r.count, 10) }));
  }
}
