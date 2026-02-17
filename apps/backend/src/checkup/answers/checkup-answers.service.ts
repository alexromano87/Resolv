import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckupAnswer } from './checkup-answer.entity';
import { CheckupQuestionnaire } from '../questionnaires/checkup-questionnaire.entity';
import { CheckupQuestion } from '../templates/checkup-question.entity';
import { BulkSaveAnswersDto } from './dto/save-answer.dto';
import { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';

@Injectable()
export class CheckupAnswersService {
  private presenceByQuestionnaire = new Map<
    string,
    Map<string, Map<string, { name: string; expiresAt: number }>>
  >();

  constructor(
    @InjectRepository(CheckupAnswer)
    private answerRepository: Repository<CheckupAnswer>,
    @InjectRepository(CheckupQuestionnaire)
    private questionnaireRepository: Repository<CheckupQuestionnaire>,
    @InjectRepository(CheckupQuestion)
    private questionRepository: Repository<CheckupQuestion>,
  ) {}

  private async loadQuestionnaire(questionnaireId: string) {
    const questionnaire = await this.questionnaireRepository.findOne({
      where: { id: questionnaireId, attivo: true },
      relations: ['cliente'],
    });

    if (!questionnaire) {
      throw new NotFoundException('Questionario non trovato');
    }

    return questionnaire;
  }

  private canAccess(questionnaire: CheckupQuestionnaire, user: CheckupCurrentUserData) {
    if (user.ruolo !== 'cliente') return true;
    if (questionnaire.clienteUserId === user.id) return true;
    if (user.clientId && questionnaire.cliente?.clientId === user.clientId) return true;
    return false;
  }

  private canEdit(questionnaire: CheckupQuestionnaire, user: CheckupCurrentUserData) {
    if (user.ruolo !== 'cliente') return false;
    if (questionnaire.clienteUserId === user.id) return true;
    if (user.clientId && questionnaire.cliente?.clientId === user.clientId) return true;
    return false;
  }

  private cleanupPresence(questionnaireId: string) {
    const map = this.presenceByQuestionnaire.get(questionnaireId);
    if (!map) return;
    const now = Date.now();
    for (const [fieldId, users] of map.entries()) {
      for (const [userId, entry] of users.entries()) {
        if (entry.expiresAt < now) {
          users.delete(userId);
        }
      }
      if (users.size === 0) {
        map.delete(fieldId);
      }
    }
    if (map.size === 0) {
      this.presenceByQuestionnaire.delete(questionnaireId);
    }
  }

  private removeUserFromOtherFields(
    questionnaireId: string,
    userId: string,
    keepFieldId: string,
  ) {
    const map = this.presenceByQuestionnaire.get(questionnaireId);
    if (!map) return;
    for (const [fieldId, users] of map.entries()) {
      if (fieldId === keepFieldId) continue;
      if (users.delete(userId) && users.size === 0) {
        map.delete(fieldId);
      }
    }
  }

  async saveAnswers(
    questionnaireId: string,
    dto: BulkSaveAnswersDto,
    user: CheckupCurrentUserData,
  ) {
    const questionnaire = await this.loadQuestionnaire(questionnaireId);

    if (!this.canEdit(questionnaire, user)) {
      throw new ForbiddenException('Solo il cliente assegnato può compilare le risposte');
    }

    // Upsert answers
    for (const answerDto of dto.answers) {
      let answer = await this.answerRepository.findOne({
        where: { questionnaireId, questionId: answerDto.questionId },
      });

      if (answer) {
        if (answerDto.valore !== undefined) answer.valore = answerDto.valore;
        if (answerDto.note !== undefined) answer.note = answerDto.note;
        if (answerDto.richiesto !== undefined) answer.richiesto = answerDto.richiesto;
        if (answerDto.evaso !== undefined) answer.evaso = answerDto.evaso;
        answer.updatedBy = user.id;
      } else {
        answer = this.answerRepository.create({
          questionnaireId,
          questionId: answerDto.questionId,
          valore: answerDto.valore || null,
          note: answerDto.note || null,
          richiesto: answerDto.richiesto || false,
          evaso: answerDto.evaso || false,
          updatedBy: user.id,
        });
      }

      await this.answerRepository.save(answer);
    }

    // Update stato to in_compilazione if bozza
    if (questionnaire.stato === 'bozza') {
      questionnaire.stato = 'in_compilazione';
    }

    // Recalculate completion percentage
    const totalQuestions = await this.questionRepository.count({
      where: { section: { templateId: questionnaire.templateId }, attivo: true },
      relations: ['section'],
    });

    const answeredCount = await this.answerRepository
      .createQueryBuilder('a')
      .where('a.questionnaireId = :qId', { qId: questionnaireId })
      .andWhere('a.valore IS NOT NULL')
      .andWhere("a.valore != ''")
      .getCount();

    questionnaire.percentualeCompletamento =
      totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

    await this.questionnaireRepository.save(questionnaire);

    return {
      percentualeCompletamento: questionnaire.percentualeCompletamento,
      stato: questionnaire.stato,
    };
  }

  async getAnswers(
    questionnaireId: string,
    user: CheckupCurrentUserData,
    sectionId?: string,
  ) {
    const questionnaire = await this.loadQuestionnaire(questionnaireId);

    if (!this.canAccess(questionnaire, user)) {
      throw new ForbiddenException('Non autorizzato');
    }

    const qb = this.answerRepository
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.question', 'question')
      .leftJoinAndSelect('a.documents', 'documents', 'documents.attivo = :docAttivo', { docAttivo: true })
      .leftJoinAndSelect('a.updatedByUser', 'updatedByUser')
      .where('a.questionnaireId = :qId', { qId: questionnaireId });

    if (sectionId) {
      qb.andWhere('question.sectionId = :sectionId', { sectionId });
    }

    qb.orderBy('question.ordine', 'ASC');

    return qb.getMany();
  }

  async getPresence(questionnaireId: string, user: CheckupCurrentUserData) {
    const questionnaire = await this.loadQuestionnaire(questionnaireId);
    if (!this.canAccess(questionnaire, user)) {
      throw new ForbiddenException('Non autorizzato');
    }
    this.cleanupPresence(questionnaireId);
    const map = this.presenceByQuestionnaire.get(questionnaireId);
    const fields = map
      ? Array.from(map.entries()).map(([fieldId, users]) => ({
        fieldId,
        users: Array.from(users.entries()).map(([userId, entry]) => ({
          userId,
          name: entry.name,
        })),
      }))
      : [];
    return { fields };
  }

  async setPresenceActive(questionnaireId: string, fieldId: string, user: CheckupCurrentUserData) {
    const questionnaire = await this.loadQuestionnaire(questionnaireId);
    if (!this.canAccess(questionnaire, user)) {
      throw new ForbiddenException('Non autorizzato');
    }

    this.cleanupPresence(questionnaireId);
    this.removeUserFromOtherFields(questionnaireId, user.id, fieldId);

    const map = this.presenceByQuestionnaire.get(questionnaireId) || new Map();
    const users = map.get(fieldId) || new Map();
    const now = Date.now();
    users.set(user.id, {
      name: `${user.nome} ${user.cognome}`.trim() || user.email,
      expiresAt: now + 10000,
    });
    map.set(fieldId, users);
    this.presenceByQuestionnaire.set(questionnaireId, map);
    return { ok: true };
  }

  async setPresenceInactive(questionnaireId: string, fieldId: string, user: CheckupCurrentUserData) {
    const questionnaire = await this.loadQuestionnaire(questionnaireId);
    if (!this.canAccess(questionnaire, user)) {
      throw new ForbiddenException('Non autorizzato');
    }

    const map = this.presenceByQuestionnaire.get(questionnaireId);
    const users = map?.get(fieldId);
    if (users?.delete(user.id) && users.size === 0) {
      map?.delete(fieldId);
    }
    this.cleanupPresence(questionnaireId);
    return { ok: true };
  }
}
