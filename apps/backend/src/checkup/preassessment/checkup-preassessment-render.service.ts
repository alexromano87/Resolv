import { Injectable } from '@nestjs/common';
import puppeteer from 'puppeteer';
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class CheckupPreassessmentRenderService {
  sanitizeHtmlForPdf(html: string): string {
    return sanitizeHtml(html, {
      allowedTags: [
        'html', 'head', 'body', 'meta', 'style',
        'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'strong', 'em', 'b', 'i', 'u', 'small', 'sup', 'sub',
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
        'ul', 'ol', 'li', 'br', 'hr',
        'img',
      ],
      allowedAttributes: {
        '*': ['class', 'style'],
        img: ['src', 'alt', 'width', 'height'],
        meta: ['charset', 'name', 'content'],
      },
      allowedSchemes: ['data'],
      allowProtocolRelative: false,
      allowedStyles: {
        '*': {
          'font-family': [/.*/],
          'font-size': [/.*/],
          'font-weight': [/.*/],
          'font-style': [/.*/],
          'line-height': [/.*/],
          'letter-spacing': [/.*/],
          'text-transform': [/.*/],
          'text-align': [/.*/],
          'vertical-align': [/.*/],
          'white-space': [/.*/],
          'word-break': [/.*/],
          'overflow-wrap': [/.*/],
          'color': [/.*/],
          'background': [/.*/],
          'background-color': [/.*/],
          'background-image': [/.*/],
          'border': [/.*/],
          'border-top': [/.*/],
          'border-right': [/.*/],
          'border-bottom': [/.*/],
          'border-left': [/.*/],
          'border-radius': [/.*/],
          'padding': [/.*/],
          'padding-top': [/.*/],
          'padding-right': [/.*/],
          'padding-bottom': [/.*/],
          'padding-left': [/.*/],
          'margin': [/.*/],
          'margin-top': [/.*/],
          'margin-right': [/.*/],
          'margin-bottom': [/.*/],
          'margin-left': [/.*/],
          'width': [/.*/],
          'min-width': [/.*/],
          'max-width': [/.*/],
          'height': [/.*/],
          'min-height': [/.*/],
          'max-height': [/.*/],
          'display': [/.*/],
          'position': [/.*/],
          'top': [/.*/],
          'right': [/.*/],
          'bottom': [/.*/],
          'left': [/.*/],
          'opacity': [/.*/],
          'box-shadow': [/.*/],
          'text-decoration': [/.*/],
          'list-style': [/.*/],
          'border-collapse': [/.*/],
          'table-layout': [/.*/],
          'overflow': [/.*/],
          'flex': [/.*/],
          'flex-direction': [/.*/],
          'align-items': [/.*/],
          'justify-content': [/.*/],
          'gap': [/.*/],
          'page-break-after': [/.*/],
          'page-break-before': [/.*/],
          'page-break-inside': [/.*/],
        },
      },
      disallowedTagsMode: 'discard',
    });
  }

  async renderHtmlToPdf(html: string): Promise<Buffer> {
    const safeHtml = this.sanitizeHtmlForPdf(html);
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-sync',
        '--metrics-recording-only',
        '--no-first-run',
      ],
    });
    try {
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        const url = req.url();
        if (url.startsWith('data:') || resourceType === 'document') {
          req.continue();
        } else {
          req.abort();
        }
      });

      await page.setContent(safeHtml, { waitUntil: 'domcontentloaded' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
