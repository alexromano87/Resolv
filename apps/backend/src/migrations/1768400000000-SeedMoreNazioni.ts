import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedMoreNazioni1768400000000 implements MigrationInterface {
  private readonly countries: Array<{ code: string; name: string }> = [
    // Europa
    { code: 'AL', name: 'Albania' },
    { code: 'AD', name: 'Andorra' },
    { code: 'AT', name: 'Austria' },
    { code: 'BE', name: 'Belgio' },
    { code: 'BA', name: 'Bosnia ed Erzegovina' },
    { code: 'BG', name: 'Bulgaria' },
    { code: 'HR', name: 'Croazia' },
    { code: 'CY', name: 'Cipro' },
    { code: 'CZ', name: 'Cechia' },
    { code: 'DK', name: 'Danimarca' },
    { code: 'EE', name: 'Estonia' },
    { code: 'FI', name: 'Finlandia' },
    { code: 'FR', name: 'Francia' },
    { code: 'DE', name: 'Germania' },
    { code: 'GR', name: 'Grecia' },
    { code: 'HU', name: 'Ungheria' },
    { code: 'IS', name: 'Islanda' },
    { code: 'IE', name: 'Irlanda' },
    { code: 'IT', name: 'Italia' },
    { code: 'LV', name: 'Lettonia' },
    { code: 'LI', name: 'Liechtenstein' },
    { code: 'LT', name: 'Lituania' },
    { code: 'LU', name: 'Lussemburgo' },
    { code: 'MT', name: 'Malta' },
    { code: 'MD', name: 'Moldavia' },
    { code: 'MC', name: 'Monaco' },
    { code: 'ME', name: 'Montenegro' },
    { code: 'NL', name: 'Paesi Bassi' },
    { code: 'MK', name: 'Macedonia del Nord' },
    { code: 'NO', name: 'Norvegia' },
    { code: 'PL', name: 'Polonia' },
    { code: 'PT', name: 'Portogallo' },
    { code: 'RO', name: 'Romania' },
    { code: 'RU', name: 'Russia' },
    { code: 'SM', name: 'San Marino' },
    { code: 'RS', name: 'Serbia' },
    { code: 'SK', name: 'Slovacchia' },
    { code: 'SI', name: 'Slovenia' },
    { code: 'ES', name: 'Spagna' },
    { code: 'SE', name: 'Svezia' },
    { code: 'CH', name: 'Svizzera' },
    { code: 'TR', name: 'Turchia' },
    { code: 'UA', name: 'Ucraina' },
    { code: 'GB', name: 'Regno Unito' },
    { code: 'VA', name: 'Citta del Vaticano' },

    // Americhe
    { code: 'US', name: 'Stati Uniti' },
    { code: 'CA', name: 'Canada' },
    { code: 'MX', name: 'Messico' },
    { code: 'BR', name: 'Brasile' },
    { code: 'AR', name: 'Argentina' },
    { code: 'CL', name: 'Cile' },
    { code: 'CO', name: 'Colombia' },
    { code: 'PE', name: 'Peru' },
    { code: 'VE', name: 'Venezuela' },
    { code: 'EC', name: 'Ecuador' },
    { code: 'BO', name: 'Bolivia' },
    { code: 'PY', name: 'Paraguay' },
    { code: 'UY', name: 'Uruguay' },
    { code: 'CR', name: 'Costa Rica' },
    { code: 'PA', name: 'Panama' },
    { code: 'GT', name: 'Guatemala' },
    { code: 'HN', name: 'Honduras' },
    { code: 'SV', name: 'El Salvador' },
    { code: 'NI', name: 'Nicaragua' },
    { code: 'CU', name: 'Cuba' },
    { code: 'DO', name: 'Repubblica Dominicana' },
    { code: 'HT', name: 'Haiti' },
    { code: 'JM', name: 'Giamaica' },

    // Asia
    { code: 'CN', name: 'Cina' },
    { code: 'JP', name: 'Giappone' },
    { code: 'KR', name: 'Corea del Sud' },
    { code: 'IN', name: 'India' },
    { code: 'PK', name: 'Pakistan' },
    { code: 'BD', name: 'Bangladesh' },
    { code: 'LK', name: 'Sri Lanka' },
    { code: 'NP', name: 'Nepal' },
    { code: 'MM', name: 'Myanmar' },
    { code: 'TH', name: 'Thailandia' },
    { code: 'VN', name: 'Vietnam' },
    { code: 'LA', name: 'Laos' },
    { code: 'KH', name: 'Cambogia' },
    { code: 'MY', name: 'Malesia' },
    { code: 'SG', name: 'Singapore' },
    { code: 'ID', name: 'Indonesia' },
    { code: 'PH', name: 'Filippine' },
    { code: 'TW', name: 'Taiwan' },
    { code: 'HK', name: 'Hong Kong' },
    { code: 'AE', name: 'Emirati Arabi Uniti' },
    { code: 'SA', name: 'Arabia Saudita' },
    { code: 'QA', name: 'Qatar' },
    { code: 'KW', name: 'Kuwait' },
    { code: 'BH', name: 'Bahrein' },
    { code: 'OM', name: 'Oman' },
    { code: 'IL', name: 'Israele' },
    { code: 'JO', name: 'Giordania' },
    { code: 'LB', name: 'Libano' },
    { code: 'IQ', name: 'Iraq' },
    { code: 'IR', name: 'Iran' },
    { code: 'AF', name: 'Afghanistan' },

    // Africa (principali)
    { code: 'ZA', name: 'Sudafrica' },
    { code: 'EG', name: 'Egitto' },
    { code: 'NG', name: 'Nigeria' },
    { code: 'KE', name: 'Kenya' },
    { code: 'DZ', name: 'Algeria' },
    { code: 'MA', name: 'Marocco' },
    { code: 'TN', name: 'Tunisia' },
    { code: 'GH', name: 'Ghana' },
    { code: 'CI', name: "Costa d'Avorio" },
    { code: 'SN', name: 'Senegal' },
    { code: 'ET', name: 'Etiopia' },
    { code: 'TZ', name: 'Tanzania' },
    { code: 'UG', name: 'Uganda' },
    { code: 'CM', name: 'Camerun' },
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const country of this.countries) {
      await queryRunner.query(
        `INSERT INTO nazioni (codice, nome, attiva, createdAt, updatedAt)
         VALUES (?, ?, 1, NOW(), NOW())
         ON DUPLICATE KEY UPDATE nome = VALUES(nome), attiva = 1`,
        [country.code, country.name],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const codes = this.countries.map((country) => country.code);
    if (codes.length === 0) return;
    const placeholders = codes.map(() => '?').join(',');
    await queryRunner.query(`DELETE FROM nazioni WHERE codice IN (${placeholders})`, codes);
  }
}
