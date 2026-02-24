import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { StudiService } from './studi.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { SuperadminGuard } from '../auth/superadmin.guard';
import { CreateStudioDto } from './dto/create-studio.dto';
import { UpdateStudioDto } from './dto/update-studio.dto';
import { ProvisionStudioDto } from './dto/provision-studio.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { CurrentUserData } from '../auth/current-user.decorator';

@Controller('studi')
@UseGuards(JwtAuthGuard)
export class StudiController {
  constructor(private readonly studiService: StudiService) {}

  @Get()
  async findAll(@CurrentUser() user: CurrentUserData) {
    if (user.ruolo !== 'superadmin') {
      if (!user.studioId) {
        throw new ForbiddenException('Studio non assegnato');
      }
      return [await this.studiService.findOne(user.studioId)];
    }
    return this.studiService.findAll();
  }

  @Get('active')
  async findAllActive(@CurrentUser() user: CurrentUserData) {
    if (user.ruolo !== 'superadmin') {
      if (!user.studioId) {
        throw new ForbiddenException('Studio non assegnato');
      }
      const studio = await this.studiService.findOne(user.studioId);
      return studio.attivo ? [studio] : [];
    }
    return this.studiService.findAllActive();
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    if (user.ruolo !== 'superadmin' && user.studioId && user.studioId !== id) {
      throw new ForbiddenException('Accesso negato allo studio richiesto');
    }
    return this.studiService.findOne(id);
  }

  @Post()
  @UseGuards(SuperadminGuard)
  async create(@Body() createStudioDto: CreateStudioDto) {
    return this.studiService.create(createStudioDto);
  }

  @Post('provision')
  @UseGuards(SuperadminGuard)
  async provision(@Body() dto: ProvisionStudioDto) {
    return this.studiService.createWithAdmin(dto);
  }

  @Put(':id')
  @UseGuards(SuperadminGuard)
  async update(
    @Param('id') id: string,
    @Body() updateStudioDto: UpdateStudioDto,
  ) {
    return this.studiService.update(id, updateStudioDto);
  }

  @Delete(':id')
  @UseGuards(SuperadminGuard)
  async remove(@Param('id') id: string) {
    return this.studiService.remove(id);
  }

  @Delete(':id/permanent')
  @UseGuards(SuperadminGuard)
  async permanentDelete(@Param('id') id: string) {
    return this.studiService.permanentDelete(id);
  }

  @Post(':id/restore')
  @UseGuards(SuperadminGuard)
  async restore(@Param('id') id: string) {
    return this.studiService.restore(id);
  }

  @Put(':id/toggle-active')
  @UseGuards(SuperadminGuard)
  async toggleActive(@Param('id') id: string) {
    return this.studiService.toggleActive(id);
  }

  @Get(':id/stats')
  @UseGuards(AdminGuard)
  async getStudioStats(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    if (user.ruolo !== 'superadmin' && user.studioId && user.studioId !== id) {
      throw new ForbiddenException('Accesso negato allo studio richiesto');
    }
    return this.studiService.getStudioStats(id);
  }

  @Get('orphaned/records')
  @UseGuards(SuperadminGuard)
  async getOrphanedRecords() {
    return this.studiService.getOrphanedRecords();
  }

  @Post('orphaned/assign')
  @UseGuards(SuperadminGuard)
  async assignOrphanedRecords(
    @Body() dto: { entityType: string; recordIds: string[]; studioId: string },
  ) {
    return this.studiService.assignOrphanedRecords(
      dto.entityType,
      dto.recordIds,
      dto.studioId,
    );
  }

  @Put(':id/logo')
  async uploadLogo(
    @Param('id') id: string,
    @Body() body: { logo: string },
  ) {
    return this.studiService.updateLogo(id, body.logo);
  }

  @Delete(':id/logo')
  async deleteLogo(@Param('id') id: string) {
    return this.studiService.deleteLogo(id);
  }
}
