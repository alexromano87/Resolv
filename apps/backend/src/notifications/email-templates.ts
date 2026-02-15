import { LOGO_RESOLV_DEFAULT } from '../report/report-pdf-new.service';

type TwoFactorEmailOptions = {
  code: string;
  product?: 'Resolv' | 'Checkup';
};

const LOGO_SRC = `data:image/png;base64,${LOGO_RESOLV_DEFAULT}`;

export function buildTwoFactorEmailText(options: TwoFactorEmailOptions): string {
  const product = options.product || 'Resolv';
  return [
    `Hai richiesto un codice di verifica per ${product}.`,
    `Il tuo codice 2FA è: ${options.code}`,
    'Il codice scade tra 5 minuti.',
    'Se non hai richiesto il codice, ignora questa email.',
    'RESOLV',
  ].join('\n');
}

export function buildTwoFactorEmailHtml(options: TwoFactorEmailOptions): string {
  const product = options.product || 'Resolv';
  return `
<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Codice 2FA</title>
  </head>
  <body style="margin:0;padding:0;background:#eef1f7;font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef1f7;padding:24px 0;">
      <tr>
        <td align="center" style="padding:0 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:16px;box-shadow:0 16px 40px rgba(15,23,42,0.12);overflow:hidden;">
            <tr>
              <td style="padding:24px 28px 0;">
                <img src="${LOGO_SRC}" alt="Resolv" width="96" style="display:block;height:auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 0;">
                <div style="font-size:18px;font-weight:700;letter-spacing:0.2px;">Codice di verifica 2FA</div>
                <div style="margin-top:8px;font-size:14px;color:#475569;">
                  Hai richiesto un codice di verifica per <strong>${product}</strong>.
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;">
                <div style="background:#f1f5ff;border:1px solid #d7e2ff;border-radius:12px;padding:16px 12px;text-align:center;font-size:28px;letter-spacing:6px;font-weight:700;color:#1d4ed8;">
                  ${options.code}
                </div>
                <div style="margin-top:12px;font-size:12px;color:#64748b;">
                  Il codice scade tra 5 minuti.
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 20px;">
                <div style="font-size:12px;color:#64748b;">
                  Se non hai richiesto il codice, ignora questa email.
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 24px;border-top:1px solid #eef2f7;">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding-right:12px;vertical-align:middle;">
                      <img src="${LOGO_SRC}" alt="Resolv" width="32" style="display:block;height:auto;" />
                    </td>
                    <td style="font-size:12px;color:#475569;vertical-align:middle;">
                      RESOLV &middot; Security Team<br />
                      support@resolv.legal
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}
