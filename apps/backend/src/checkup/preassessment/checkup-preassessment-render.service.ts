import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer';
import sanitizeHtml from 'sanitize-html';

/**
 * Shared Puppeteer launch options.
 * Headless mode required for Docker/server environments with --no-sandbox.
 */
const BROWSER_LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-sync',
  '--metrics-recording-only',
  '--no-first-run',
];

@Injectable()
export class CheckupPreassessmentRenderService implements OnModuleDestroy {
  private readonly logger = new Logger(CheckupPreassessmentRenderService.name);

  /** Singleton browser instance — reused across PDF requests. */
  private browser: Browser | null = null;

  /** Serialise browser (re-)launch to avoid race conditions. */
  private launchPromise: Promise<Browser> | null = null;

  sanitizeHtmlForPdf(html: string): string {
    return sanitizeHtml(html, {
      allowVulnerableTags: true,
      allowedTags: [
        'html', 'head', 'body', 'meta', 'style',
        'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'strong', 'em', 'b', 'i', 'u', 'small', 'sup', 'sub',
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
        'ul', 'ol', 'li', 'br', 'hr',
        'img',
        // SVG support for cover wave shapes
        'svg', 'rect', 'path', 'circle', 'ellipse', 'polygon', 'polyline',
        'line', 'g', 'defs', 'use', 'symbol', 'clipPath', 'linearGradient',
        'radialGradient', 'stop',
      ],
      allowedAttributes: {
        '*': ['class', 'style'],
        img: ['src', 'alt', 'width', 'height'],
        meta: ['charset', 'name', 'content'],
        // SVG element attributes
        svg: ['viewBox', 'xmlns', 'preserveAspectRatio', 'width', 'height', 'class'],
        rect: ['width', 'height', 'x', 'y', 'fill', 'stroke', 'stroke-width', 'rx', 'ry', 'opacity'],
        path: ['d', 'fill', 'stroke', 'stroke-width', 'opacity', 'fill-rule'],
        circle: ['cx', 'cy', 'r', 'fill', 'stroke', 'stroke-width', 'opacity'],
        ellipse: ['cx', 'cy', 'rx', 'ry', 'fill', 'stroke', 'stroke-width', 'opacity'],
        polygon: ['points', 'fill', 'stroke', 'stroke-width', 'opacity'],
        line: ['x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width', 'opacity'],
        g: ['fill', 'stroke', 'opacity', 'transform'],
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

  /**
   * Returns the shared singleton browser, launching it if necessary.
   * If the existing browser has crashed, it relaunches automatically.
   */
  private async getBrowser(): Promise<Browser> {
    if (this.browser?.connected) return this.browser;

    // Serialise concurrent callers so we launch only once
    if (this.launchPromise) return this.launchPromise;

    this.launchPromise = puppeteer
      .launch({ headless: true, args: BROWSER_LAUNCH_ARGS })
      .then((b) => {
        this.browser = b;
        this.launchPromise = null;

        // Auto-reconnect on unexpected crash
        b.on('disconnected', () => {
          this.logger.warn('Puppeteer browser disconnected — will relaunch on next request');
          this.browser = null;
        });

        return b;
      })
      .catch((err) => {
        this.launchPromise = null;
        throw err;
      });

    return this.launchPromise;
  }

  async renderHtmlToPdf(
    html: string,
    options?: {
      displayHeaderFooter?: boolean;
      headerTemplate?: string;
      footerTemplate?: string;
      margin?: { top?: string; bottom?: string; left?: string; right?: string };
      preferCSSPageSize?: boolean;
    },
  ): Promise<Buffer> {
    const safeHtml = this.sanitizeHtmlForPdf(html);
    const browser = await this.getBrowser();

    const page = await browser.newPage();
    try {
      // Block all external network requests — only allow data: URIs and the
      // initial document load so the PDF renderer never makes outbound calls.
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
        displayHeaderFooter: options?.displayHeaderFooter ?? false,
        headerTemplate: options?.headerTemplate ?? '<div></div>',
        footerTemplate: options?.footerTemplate ?? '<div></div>',
        preferCSSPageSize: options?.preferCSSPageSize ?? false,
        margin: {
          top: options?.margin?.top ?? '0mm',
          bottom: options?.margin?.bottom ?? '0mm',
          left: options?.margin?.left ?? '0mm',
          right: options?.margin?.right ?? '0mm',
        },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close().catch(() => { /* ignore close errors */ });
    }
  }

  /** Cleanly shuts down the browser when the NestJS module is destroyed. */
  async onModuleDestroy(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (err: any) {
        this.logger.warn(`Error closing Puppeteer browser on shutdown: ${err.message}`);
      }
      this.browser = null;
    }
  }
}
