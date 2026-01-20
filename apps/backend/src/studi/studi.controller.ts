import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { StudiService } from './studi.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CreateStudioDto } from './dto/create-studio.dto';
import { UpdateStudioDto } from './dto/update-studio.dto';

@Controller('studi')
@UseGuards(JwtAuthGuard)
export class StudiController {
  constructor(private readonly studiService: StudiService) {}

  @Get()
  async findAll() {
    return this.studiService.findAll();
  }

  @Get('active')
  async findAllActive() {
    return this.studiService.findAllActive();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.studiService.findOne(id);
  }

  @Post()
  @UseGuards(AdminGuard)
  async create(@Body() createStudioDto: CreateStudioDto) {
    return this.studiService.create(createStudioDto);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  async update(
    @Param('id') id: string,
    @Body() updateStudioDto: UpdateStudioDto,
  ) {
    return this.studiService.update(id, updateStudioDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async remove(@Param('id') id: string) {
    return this.studiService.remove(id);
  }

  @Delete(':id/permanent')
  @UseGuards(AdminGuard)
  async permanentDelete(@Param('id') id: string) {
    return this.studiService.permanentDelete(id);
  }

  @Post(':id/restore')
  @UseGuards(AdminGuard)
  async restore(@Param('id') id: string) {
    return this.studiService.restore(id);
  }

  @Put(':id/toggle-active')
  @UseGuards(AdminGuard)
  async toggleActive(@Param('id') id: string) {
    return this.studiService.toggleActive(id);
  }

  @Get(':id/stats')
  @UseGuards(AdminGuard)
  async getStudioStats(@Param('id') id: string) {
    return this.studiService.getStudioStats(id);
  }

  @Get('orphaned/records')
  @UseGuards(AdminGuard)
  async getOrphanedRecords() {
    return this.studiService.getOrphanedRecords();
  }

  @Post('orphaned/assign')
  @UseGuards(AdminGuard)
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
