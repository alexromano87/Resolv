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
  constructor(
    @InjectRepository(CheckupAnswer)
    private answerRepository: Repository<CheckupAnswer>,
    @InjectRepository(CheckupQuestionnaire)
    private questionnaireRepository: Repository<CheckupQuestionnaire>,
    @InjectRepository(CheckupQuestion)
    private questionRepository: Repository<CheckupQuestion>,
  ) {}

  async saveAnswers(
    questionnaireId: string,
    dto: BulkSaveAnswersDto,
    user: CheckupCurrentUserData,
  ) {
    const questionnaire = await this.questionnaireRepository.findOne({
      where: { id: questionnaireId, attivo: true },
    });

    if (!questionnaire) {
      throw new NotFoundException('Questionario non trovato');
    }

    // Solo il cliente assegnato può compilare le risposte
    if (user.ruolo !== 'cliente' || questionnaire.clienteUserId !== user.id) {
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
    const questionnaire = await this.questionnaireRepository.findOne({
      where: { id: questionnaireId, attivo: true },
    });

    if (!questionnaire) {
      throw new NotFoundException('Questionario non trovato');
    }

    if (user.ruolo === 'cliente' && questionnaire.clienteUserId !== user.id) {
      throw new ForbiddenException('Non autorizzato');
    }

    const qb = this.answerRepository
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.question', 'question')
      .leftJoinAndSelect('a.documents', 'documents', 'documents.attivo = :docAttivo', { docAttivo: true })
      .where('a.questionnaireId = :qId', { qId: questionnaireId });

    if (sectionId) {
      qb.andWhere('question.sectionId = :sectionId', { sectionId });
    }

    qb.orderBy('question.ordine', 'ASC');

    return qb.getMany();
  }
}
