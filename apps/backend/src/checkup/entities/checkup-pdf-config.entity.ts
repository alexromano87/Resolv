import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';
import { PdfConfigDto } from '../dto/pdf-config.dto';

@Entity('checkup_pdf_config')
export class CheckupPdfConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'json' })
  config: PdfConfigDto;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true, type: 'varchar', length: 255 })
  updatedBy: string | null;
}
