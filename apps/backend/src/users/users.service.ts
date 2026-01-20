// apps/backend/src/users/users.service.ts
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Studio } from '../studi/studio.entity';
import * as bcrypt from 'bcrypt';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import { normalizePagination, type PaginationOptions } from '../common/pagination';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Studio)
    private studioRepository: Repository<Studio>,
  ) {}

  async findAll(
    filters?: {
      studioId?: string;
      ruolo?: string;
      attivo?: boolean;
    },
    pagination?: PaginationOptions,
  ): Promise<User[]> {
    const query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.studio', 'studio')
      .orderBy('user.createdAt', 'DESC');

    // Applica filtri
    if (filters) {
      if (filters.studioId !== undefined) {
        query.andWhere('user.studioId = :studioId', { studioId: filters.studioId });
      }

      if (filters.ruolo) {
        query.andWhere('user.ruolo = :ruolo', { ruolo: filters.ruolo });
      }

      if (filters.attivo !== undefined) {
        query.andWhere('user.attivo = :attivo', { attivo: filters.attivo });
      }
    }

    const page = normalizePagination(pagination?.page, pagination?.limit);
    if (page) {
      query.skip(page.skip).take(page.take);
    }
    const users = await query.getMany();

    // Rimuovi password dai risultati
    return users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Verifica che email sia presente
    if (!createUserDto.email) {
      throw new ConflictException('Email è obbligatoria');
    }
    if (createUserDto.ruolo === 'titolare_studio' && !createUserDto.studioId) {
      throw new ConflictException('Studio obbligatorio per il titolare');
    }

    // Normalizza email in lowercase
    const normalizedEmail = createUserDto.email.toLowerCase().trim();

    // Verifica se email già esiste
    const existingUser = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('Email già registrata');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.userRepository.create({
      ...createUserDto,
      email: normalizedEmail,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(user);
    const { password, ...userWithoutPassword } = savedUser;
    return userWithoutPassword as User;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }
    if (updateUserDto.ruolo === 'titolare_studio' && !updateUserDto.studioId) {
      throw new ConflictException('Studio obbligatorio per il titolare');
    }

    // Se viene aggiornata l'email, normalizzala e verifica che non sia già in uso
    if (updateUserDto.email) {
      const normalizedEmail = updateUserDto.email.toLowerCase().trim();

      if (normalizedEmail !== user.email) {
        const existingUser = await this.userRepository.findOne({
          where: { email: normalizedEmail },
        });
        if (existingUser) {
          throw new ConflictException('Email già in uso');
        }
      }

      updateUserDto.email = normalizedEmail;
    }

    // Se viene aggiornata la password, hashala
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    Object.assign(user, updateUserDto);
    const updatedUser = await this.userRepository.save(user);

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword as User;
  }

  async remove(id: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    await this.userRepository.remove(user);
  }

  async toggleActive(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    user.attivo = !user.attivo;
    const updatedUser = await this.userRepository.save(user);

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword as User;
  }

  async resetPassword(id: string, newPassword: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    const updatedUser = await this.userRepository.save(user);

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword as User;
  }

  async updateStudi(userId: string, studiIds: string[]): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['studi'],
    });

    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    // Verifica che l'utente sia un avvocato
    if (user.ruolo !== 'avvocato') {
      throw new BadRequestException('Solo gli avvocati possono essere associati a più studi');
    }

    // Carica gli studi
    const studi = await this.studioRepository.findByIds(studiIds);

    if (studi.length !== studiIds.length) {
      throw new BadRequestException('Uno o più studi non trovati');
    }

    // Aggiorna la relazione many-to-many
    user.studi = studi;

    // Se l'avvocato ha almeno uno studio e non ha uno studio primario, imposta il primo
    if (studi.length > 0 && !user.studioId) {
      user.studioId = studi[0].id;
    }

    // Se lo studio primario non è più tra gli studi associati, aggiornalo
    if (user.studioId && !studiIds.includes(user.studioId)) {
      user.studioId = studi.length > 0 ? studi[0].id : null;
    }

    const updatedUser = await this.userRepository.save(user);

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword as User;
  }

  async getStudi(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['studi'],
    });

    if (!user) {
      throw new NotFoundException('Utente non trovato');
    }

    return user.studi || [];
  }
}
