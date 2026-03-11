import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { CheckupDirectChatConversation } from './checkup-direct-chat-conversation.entity';
import { CheckupDirectChatMessage } from './checkup-direct-chat-message.entity';
import { CheckupUser } from '../users/checkup-user.entity';
import { CheckupCurrentUserData } from '../auth/checkup-current-user.decorator';
import { CheckupLicense } from '../licenses/checkup-license.entity';
import { CheckupSublicense } from '../licenses/checkup-sublicense.entity';
import { CreateDirectChatConversationDto } from './dto-create-direct-conversation.dto';
import { SendDirectChatMessageDto } from './dto-send-direct-message.dto';

@Injectable()
export class CheckupDirectChatService {
  constructor(
    @InjectRepository(CheckupDirectChatConversation)
    private readonly conversationRepository: Repository<CheckupDirectChatConversation>,
    @InjectRepository(CheckupDirectChatMessage)
    private readonly messageRepository: Repository<CheckupDirectChatMessage>,
    @InjectRepository(CheckupUser)
    private readonly userRepository: Repository<CheckupUser>,
    @InjectRepository(CheckupLicense)
    private readonly licenseRepository: Repository<CheckupLicense>,
    @InjectRepository(CheckupSublicense)
    private readonly sublicenseRepository: Repository<CheckupSublicense>,
  ) {}

  private normalizePair(userA: string, userB: string) {
    return [userA, userB].sort((a, b) => a.localeCompare(b)) as [string, string];
  }

  private async getCurrentStudioId(user: CheckupCurrentUserData): Promise<string | null> {
    if (user.studioId) return user.studioId;

    if (user.sublicenseId) {
      const sublicense = await this.sublicenseRepository.findOne({
        where: { id: user.sublicenseId },
        relations: ['license'],
      });
      if (sublicense?.license?.studioId) return sublicense.license.studioId;
    }

    if (user.clientId) {
      const sublicense = await this.sublicenseRepository.findOne({
        where: { clientId: user.clientId, attiva: true },
        relations: ['license'],
        order: { updatedAt: 'DESC' },
      });
      if (sublicense?.license?.studioId) return sublicense.license.studioId;
    }

    return null;
  }

  private async getAccessibleClientIdsForStaff(user: CheckupCurrentUserData) {
    if (user.ruolo === 'cliente') return [];
    const studioId = await this.getCurrentStudioId(user);
    if (!studioId) return [];
    const license = await this.licenseRepository.findOne({ where: { studioId } });
    if (!license) return [];
    const sublicenses = await this.sublicenseRepository.find({
      where: { licenseId: license.id, attiva: true },
      select: ['clientId'],
    });
    return Array.from(new Set(sublicenses.map((entry) => entry.clientId).filter((value): value is string => Boolean(value))));
  }

  private async ensureCanChatWith(currentUser: CheckupCurrentUserData, participant: CheckupUser) {
    if (!participant.attivo) {
      throw new BadRequestException('Utente non attivo');
    }
    if (participant.id === currentUser.id) {
      throw new BadRequestException('Seleziona un utente diverso dal tuo account');
    }

    if (currentUser.ruolo === 'cliente') {
      const studioId = await this.getCurrentStudioId(currentUser);
      if (!currentUser.clientId || !studioId) {
        throw new ForbiddenException('Non autorizzato');
      }
      if (participant.ruolo === 'cliente') {
        if (participant.clientId !== currentUser.clientId) {
          throw new ForbiddenException('Puoi aprire chat solo con i colleghi del tuo sublicenziatario');
        }
        return {
          studioId,
          clientId: currentUser.clientId,
        };
      }
      if (participant.studioId !== studioId) {
        throw new ForbiddenException('Utente non disponibile per la chat');
      }
      return {
        studioId,
        clientId: currentUser.clientId,
      };
    }

    const staffStudioId = await this.getCurrentStudioId(currentUser);
    if (!staffStudioId) {
      throw new ForbiddenException('Non autorizzato');
    }

    if (participant.ruolo === 'cliente') {
      const clientIds = await this.getAccessibleClientIdsForStaff(currentUser);
      if (!participant.clientId || !clientIds.includes(participant.clientId)) {
        throw new ForbiddenException('Sublicenziatario non disponibile per la chat');
      }
      return {
        studioId: staffStudioId,
        clientId: participant.clientId,
      };
    }

    if (participant.studioId !== staffStudioId) {
      throw new ForbiddenException('Utente studio non disponibile per la chat');
    }

    return {
      studioId: staffStudioId,
      clientId: null,
    };
  }

  private async getConversationForUser(conversationId: string, user: CheckupCurrentUserData) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['userOne', 'userOne.client', 'userOne.studio', 'userTwo', 'userTwo.client', 'userTwo.studio'],
    });
    if (!conversation) {
      throw new NotFoundException('Chat non trovata');
    }
    if (conversation.userOneId !== user.id && conversation.userTwoId !== user.id) {
      throw new ForbiddenException('Non autorizzato');
    }
    return conversation;
  }

  private buildParticipant(currentUserId: string, conversation: CheckupDirectChatConversation) {
    const other = conversation.userOneId === currentUserId ? conversation.userTwo : conversation.userOne;
    return {
      id: other.id,
      nome: other.nome,
      cognome: other.cognome,
      email: other.email,
      ruolo: other.ruolo,
      azienda:
        other.ruolo === 'cliente'
          ? other.client?.ragioneSociale || other.azienda || other.client?.nome || null
          : other.studio?.nome || other.azienda || null,
      clientId: other.clientId ?? null,
      studioId: other.studioId ?? null,
    };
  }

  async createConversation(dto: CreateDirectChatConversationDto, user: CheckupCurrentUserData) {
    const participant = await this.userRepository.findOne({
      where: { id: dto.participantUserId },
      relations: ['client', 'studio'],
    });
    if (!participant) {
      throw new NotFoundException('Utente non trovato');
    }

    const scope = await this.ensureCanChatWith(user, participant);
    const [userOneId, userTwoId] = this.normalizePair(user.id, participant.id);
    let conversation = await this.conversationRepository.findOne({
      where: { userOneId, userTwoId },
      relations: ['userOne', 'userOne.client', 'userOne.studio', 'userTwo', 'userTwo.client', 'userTwo.studio'],
    });
    if (!conversation) {
      conversation = this.conversationRepository.create({
        userOneId,
        userTwoId,
        studioId: scope.studioId,
        clientId: scope.clientId,
        createdById: user.id,
        lastMessageAt: null,
      });
      conversation = await this.conversationRepository.save(conversation);
      conversation = await this.conversationRepository.findOneOrFail({
        where: { id: conversation.id },
        relations: ['userOne', 'userOne.client', 'userOne.studio', 'userTwo', 'userTwo.client', 'userTwo.studio'],
      });
    }
    return {
      id: conversation.id,
      participant: this.buildParticipant(user.id, conversation),
      clientId: conversation.clientId,
      studioId: conversation.studioId,
      lastMessageAt: conversation.lastMessageAt,
    };
  }

  async listRecipients(user: CheckupCurrentUserData, search?: string) {
    const normalizedSearch = search?.trim().toLowerCase();
    if (user.ruolo === 'cliente') {
      const studioId = await this.getCurrentStudioId(user);
      if (!studioId) {
        throw new ForbiddenException('Non autorizzato');
      }
      const [studioUsers, colleagueUsers] = await Promise.all([
        this.userRepository.find({
          where: { studioId, attivo: true },
          relations: ['studio'],
          order: { cognome: 'ASC', nome: 'ASC' },
        }),
        user.clientId
          ? this.userRepository.find({
              where: { clientId: user.clientId, ruolo: 'cliente', attivo: true },
              relations: ['client'],
              order: { cognome: 'ASC', nome: 'ASC' },
            })
          : Promise.resolve([]),
      ]);
      return {
        clients: [],
        colleagueUsers: colleagueUsers
          .filter((entry) => entry.id !== user.id)
          .map((entry) => ({
            id: entry.id,
            nome: entry.nome,
            cognome: entry.cognome,
            email: entry.email,
            ruolo: entry.ruolo,
            azienda: entry.client?.ragioneSociale || entry.azienda || entry.client?.nome || null,
          }))
          .filter((entry) => {
            if (!normalizedSearch) return true;
            return `${entry.nome} ${entry.cognome} ${entry.email} ${entry.azienda || ''}`.toLowerCase().includes(normalizedSearch);
          }),
        studioUsers: studioUsers
          .filter((entry) => entry.id !== user.id && entry.ruolo !== 'cliente')
          .map((entry) => ({
            id: entry.id,
            nome: entry.nome,
            cognome: entry.cognome,
            email: entry.email,
            ruolo: entry.ruolo,
            azienda: entry.studio?.nome || entry.azienda || null,
          }))
          .filter((entry) => {
            if (!normalizedSearch) return true;
            return `${entry.nome} ${entry.cognome} ${entry.email} ${entry.azienda || ''}`.toLowerCase().includes(normalizedSearch);
          }),
      };
    }

    const studioId = await this.getCurrentStudioId(user);
    if (!studioId) {
      throw new ForbiddenException('Non autorizzato');
    }
    const clientIds = await this.getAccessibleClientIdsForStaff(user);
    const [studioUsers, clientUsers] = await Promise.all([
      this.userRepository.find({
        where: { studioId, attivo: true },
        relations: ['studio'],
        order: { cognome: 'ASC', nome: 'ASC' },
      }),
      clientIds.length
        ? this.userRepository.find({
            where: { clientId: In(clientIds), ruolo: 'cliente', attivo: true },
            relations: ['client'],
            order: { cognome: 'ASC', nome: 'ASC' },
          })
        : Promise.resolve([]),
    ]);

    const groupedClients = new Map<string, {
      id: string;
      label: string;
      subtitle: string;
      users: Array<{
        id: string;
        nome: string;
        cognome: string;
        email: string;
        ruolo: string;
        azienda: string | null;
      }>;
    }>();

    clientUsers.forEach((entry) => {
      if (!entry.clientId) return;
      const label = entry.client?.ragioneSociale || entry.client?.nome || entry.azienda || 'Sublicenziatario';
      const subtitle = entry.client?.ragioneSociale || entry.client?.nome || entry.email;
      const bucket = groupedClients.get(entry.clientId) || {
        id: entry.clientId,
        label,
        subtitle,
        users: [],
      };
      bucket.users.push({
        id: entry.id,
        nome: entry.nome,
        cognome: entry.cognome,
        email: entry.email,
        ruolo: entry.ruolo,
        azienda: entry.client?.ragioneSociale || entry.azienda || entry.client?.nome || null,
      });
      groupedClients.set(entry.clientId, bucket);
    });

    const clients = Array.from(groupedClients.values()).filter((entry) => {
      if (!normalizedSearch) return true;
      if (`${entry.label} ${entry.subtitle}`.toLowerCase().includes(normalizedSearch)) return true;
      return entry.users.some((userEntry) =>
        `${userEntry.nome} ${userEntry.cognome} ${userEntry.email} ${userEntry.azienda || ''}`.toLowerCase().includes(normalizedSearch),
      );
    });

    return {
      clients,
      colleagueUsers: [],
      studioUsers: studioUsers
        .filter((entry) => entry.id !== user.id && entry.ruolo !== 'cliente')
        .map((entry) => ({
          id: entry.id,
          nome: entry.nome,
          cognome: entry.cognome,
          email: entry.email,
          ruolo: entry.ruolo,
          azienda: entry.studio?.nome || entry.azienda || null,
        }))
        .filter((entry) => {
          if (!normalizedSearch) return true;
          return `${entry.nome} ${entry.cognome} ${entry.email} ${entry.azienda || ''}`.toLowerCase().includes(normalizedSearch);
        }),
    };
  }

  async listConversations(user: CheckupCurrentUserData, search?: string) {
    const qb = this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.userOne', 'userOne')
      .leftJoinAndSelect('userOne.client', 'userOneClient')
      .leftJoinAndSelect('userOne.studio', 'userOneStudio')
      .leftJoinAndSelect('conversation.userTwo', 'userTwo')
      .leftJoinAndSelect('userTwo.client', 'userTwoClient')
      .leftJoinAndSelect('userTwo.studio', 'userTwoStudio')
      .where(new Brackets((sub) => {
        sub.where('conversation.userOneId = :userId', { userId: user.id })
          .orWhere('conversation.userTwoId = :userId', { userId: user.id });
      }))
      .orderBy('COALESCE(conversation.lastMessageAt, conversation.createdAt)', 'DESC');

    const conversations = await qb.getMany();
    const normalizedSearch = search?.trim().toLowerCase();
    const conversationIds = conversations.map((entry) => entry.id);
    const [latestMessages, unreadRows] = await Promise.all([
      conversationIds.length
        ? this.messageRepository
            .createQueryBuilder('message')
            .leftJoinAndSelect('message.user', 'user')
            .where('message.conversationId IN (:...conversationIds)', { conversationIds })
            .orderBy('message.createdAt', 'DESC')
            .getMany()
        : Promise.resolve([]),
      conversationIds.length
        ? this.messageRepository
            .createQueryBuilder('message')
            .select('message.conversationId', 'conversationId')
            .addSelect('COUNT(*)', 'count')
            .where('message.conversationId IN (:...conversationIds)', { conversationIds })
            .andWhere('message.userId != :userId', { userId: user.id })
            .andWhere('message.letto = false')
            .groupBy('message.conversationId')
            .getRawMany<{ conversationId: string; count: string }>()
        : Promise.resolve([]),
    ]);

    const latestMessageByConversation = new Map<string, CheckupDirectChatMessage>();
    latestMessages.forEach((message) => {
      if (!latestMessageByConversation.has(message.conversationId)) {
        latestMessageByConversation.set(message.conversationId, message);
      }
    });
    const unreadByConversation = new Map(unreadRows.map((row) => [row.conversationId, Number(row.count)]));

    return conversations
      .map((conversation) => {
        const participant = this.buildParticipant(user.id, conversation);
        const companyLabel = participant.azienda || participant.email;
        const payload = {
          id: conversation.id,
          participant,
          lastMessage: (() => {
            const message = latestMessageByConversation.get(conversation.id);
            if (!message) return null;
            return {
              id: message.id,
              messaggio: message.messaggio,
              createdAt: message.createdAt,
              user: {
                id: message.user.id,
                nome: message.user.nome,
                cognome: message.user.cognome,
                ruolo: message.user.ruolo,
              },
            };
          })(),
          unreadCount: unreadByConversation.get(conversation.id) ?? 0,
          clientId: conversation.clientId,
        };
        if (!normalizedSearch) return payload;
        const haystack = `${participant.nome} ${participant.cognome} ${participant.email} ${companyLabel}`.toLowerCase();
        return haystack.includes(normalizedSearch) ? payload : null;
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }

  async getMessages(conversationId: string, user: CheckupCurrentUserData) {
    await this.getConversationForUser(conversationId, user);
    return this.messageRepository.find({
      where: { conversationId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });
  }

  async sendMessage(conversationId: string, dto: SendDirectChatMessageDto, user: CheckupCurrentUserData) {
    const conversation = await this.getConversationForUser(conversationId, user);
    const message = this.messageRepository.create({
      conversationId,
      userId: user.id,
      messaggio: dto.messaggio,
    });
    const saved = await this.messageRepository.save(message);
    conversation.lastMessageAt = saved.createdAt;
    await this.conversationRepository.save(conversation);
    return this.messageRepository.findOneOrFail({ where: { id: saved.id }, relations: ['user'] });
  }

  async markAsRead(messageId: string, user: CheckupCurrentUserData) {
    const message = await this.messageRepository.findOne({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Messaggio non trovato');
    await this.getConversationForUser(message.conversationId, user);
    if (message.userId === user.id || message.letto) return { ok: true };
    message.letto = true;
    await this.messageRepository.save(message);
    return { ok: true };
  }

  async getUnreadCount(user: CheckupCurrentUserData) {
    const conversations = await this.conversationRepository.find({
      select: ['id'],
      where: [{ userOneId: user.id }, { userTwoId: user.id }],
    });
    if (!conversations.length) return { unread: 0 };
    const count = await this.messageRepository.count({
      where: {
        conversationId: In(conversations.map((entry) => entry.id)),
        letto: false,
      },
    });
    const ownMessages = await this.messageRepository.count({
      where: {
        conversationId: In(conversations.map((entry) => entry.id)),
        letto: false,
        userId: user.id,
      },
    });
    return { unread: Math.max(0, count - ownMessages) };
  }
}
