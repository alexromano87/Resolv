import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckupQuestionnaire } from './checkup-questionnaire.entity';
import { CheckupAnswer } from '../answers/checkup-answer.entity';
import { CheckupQuestion } from '../templates/checkup-question.entity';
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto';
import { UpdateQuestionnaireStatoDto } from './dto/update-questionnaire.dto';
import { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';

@Injectable()
export class CheckupQuestionnairesService {
  constructor(
    @InjectRepository(CheckupQuestionnaire)
    private questionnaireRepository: Repository<CheckupQuestionnaire>,
    @InjectRepository(CheckupAnswer)
    private answerRepository: Repository<CheckupAnswer>,
    @InjectRepository(CheckupQuestion)
    private questionRepository: Repository<CheckupQuestion>,
  ) {}

  async create(dto: CreateQuestionnaireDto, operatoreId: string): Promise<CheckupQuestionnaire> {
    const questionnaire = this.questionnaireRepository.create({
      templateId: dto.templateId,
      clienteUserId: dto.clienteUserId,
      assegnatoDaId: operatoreId,
      stato: 'bozza',
      dataAssegnazione: new Date(),
      note: dto.note || null,
    });

    const saved = await this.questionnaireRepository.save(questionnaire);

    // Pre-create answer rows for all active questions in the template
    const questions = await this.questionRepository.find({
      where: { section: { templateId: dto.templateId }, attivo: true },
      relations: ['section'],
    });

    if (questions.length > 0) {
      const answers = questions.map((q) =>
        this.answerRepository.create({
          questionnaireId: saved.id,
          questionId: q.id,
          valore: null,
          richiesto: false,
          evaso: false,
        }),
      );
      await this.answerRepository.save(answers);
    }

    return saved;
  }

  async findAll(user: CheckupCurrentUserData): Promise<CheckupQuestionnaire[]> {
    const qb = this.questionnaireRepository
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.template', 'template')
      .leftJoinAndSelect('q.cliente', 'cliente')
      .leftJoinAndSelect('q.assegnatoDa', 'assegnatoDa')
      .where('q.attivo = :attivo', { attivo: true });

    if (user.ruolo === 'cliente') {
      if (user.clientId) {
        qb.andWhere('cliente.clientId = :clientId', { clientId: user.clientId });
      } else {
        qb.andWhere('q.clienteUserId = :userId', { userId: user.id });
      }
    }

    qb.orderBy('q.createdAt', 'DESC');

    return qb.getMany();
  }

  async findOne(id: string, user: CheckupCurrentUserData): Promise<CheckupQuestionnaire> {
    const questionnaire = await this.questionnaireRepository.findOne({
      where: { id, attivo: true },
      relations: [
        'template',
        'template.sections',
        'template.sections.questions',
        'cliente',
        'assegnatoDa',
        'answers',
        'answers.question',
        'answers.updatedByUser',
      ],
    });

    if (!questionnaire) {
      throw new NotFoundException('Questionario non trovato');
    }

    if (user.ruolo === 'cliente' && questionnaire.clienteUserId !== user.id) {
      const sameClient = !!user.clientId && questionnaire.cliente?.clientId === user.clientId;
      if (!sameClient) {
        throw new ForbiddenException('Non autorizzato');
      }
    }

    // Sort sections and questions by ordine
    if (questionnaire.template?.sections) {
      questionnaire.template.sections.sort((a, b) => a.ordine - b.ordine);
      questionnaire.template.sections.forEach((s) => {
        if (s.questions) {
          s.questions = s.questions.filter((q) => q.attivo);
          s.questions.sort((a, b) => a.ordine - b.ordine);
        }
      });
      questionnaire.template.sections = questionnaire.template.sections.filter((s) => s.attivo);
    }

    return questionnaire;
  }

  async updateStato(
    id: string,
    dto: UpdateQuestionnaireStatoDto,
    user: CheckupCurrentUserData,
  ): Promise<CheckupQuestionnaire> {
    const questionnaire = await this.questionnaireRepository.findOne({
      where: { id, attivo: true },
      relations: ['cliente'],
    });

    if (!questionnaire) {
      throw new NotFoundException('Questionario non trovato');
    }

    // Admin studio: può solo impostare 'revisionato'
    if (user.ruolo === 'admin_studio') {
      if (dto.stato !== 'revisionato') {
        throw new ForbiddenException("L'amministratore può solo impostare lo stato 'revisionato'");
      }
    } else if (user.ruolo === 'cliente') {
      const sameClient = questionnaire.clienteUserId === user.id
        || (!!user.clientId && questionnaire.cliente?.clientId === user.clientId);
      if (!sameClient) {
        throw new ForbiddenException('Non autorizzato');
      }
    }

    questionnaire.stato = dto.stato;
    if (dto.note !== undefined) {
      questionnaire.note = dto.note;
    }

    if (dto.stato === 'completato') {
      questionnaire.dataCompletamento = new Date();
      questionnaire.percentualeCompletamento = 100;
    }

    return this.questionnaireRepository.save(questionnaire);
  }
}
