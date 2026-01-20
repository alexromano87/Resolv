#!/usr/bin/env node
/**
 * Script per generare PDF della Guida Utente
 * Utilizza markdown-pdf per convertire Markdown in PDF
 *
 * Prerequisiti:
 *   npm install -g markdown-pdf
 *
 * Oppure esegui direttamente:
 *   npx markdown-pdf guide/GUIDA_UTENTE.md -o docs/Guida_Utente_Resolv.pdf
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Colori per console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.error(`${colors.red}❌ ${msg}${colors.reset}`),
};

async function main() {
  console.log(`${colors.green}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.green}  Generazione PDF - Guida Utente Resolv${colors.reset}`);
  console.log(`${colors.green}${'='.repeat(60)}${colors.reset}\n`);

  const projectRoot = path.resolve(__dirname, '..');
  const inputFile = path.join(projectRoot, 'guide', 'GUIDA_UTENTE.md');
  const outputDir = path.join(projectRoot, 'docs');
  const outputFile = path.join(outputDir, 'Guida_Utente_Resolv.pdf');

  // Verifica file di input
  if (!fs.existsSync(inputFile)) {
    log.error(`File non trovato: ${inputFile}`);
    process.exit(1);
  }

  log.info(`File di input: ${path.relative(projectRoot, inputFile)}`);
  log.info(`Directory output: ${path.relative(projectRoot, outputDir)}`);

  // Crea directory output
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    log.success(`Directory creata: ${path.relative(projectRoot, outputDir)}`);
  }

  console.log('');
  log.info('Verifica installazione markdown-pdf...');

  // Verifica se markdown-pdf è installato
  try {
    await execAsync('npx markdown-pdf --version');
  } catch (error) {
    log.warn('markdown-pdf non trovato, installazione in corso...');
    console.log('');
  }

  console.log('');
  log.info('Generazione PDF in corso...');
  log.warn('Questo potrebbe richiedere alcuni minuti...');
  console.log('');

  try {
    // Opzioni per markdown-pdf
    const cssStyle = `
      body {
        font-family: 'Arial', sans-serif;
        font-size: 11pt;
        line-height: 1.6;
        color: #333;
        max-width: 100%;
        margin: 0;
        padding: 20px;
      }
      h1 {
        color: #2c3e50;
        border-bottom: 3px solid #3498db;
        padding-bottom: 10px;
        margin-top: 30px;
      }
      h2 {
        color: #34495e;
        border-bottom: 2px solid #95a5a6;
        padding-bottom: 8px;
        margin-top: 25px;
      }
      h3 {
        color: #34495e;
        margin-top: 20px;
      }
      code {
        background-color: #f4f4f4;
        padding: 2px 6px;
        border-radius: 3px;
        font-family: 'Courier New', monospace;
        font-size: 10pt;
      }
      pre {
        background-color: #f4f4f4;
        padding: 15px;
        border-radius: 5px;
        border-left: 4px solid #3498db;
        overflow-x: auto;
      }
      pre code {
        background-color: transparent;
        padding: 0;
      }
      table {
        border-collapse: collapse;
        width: 100%;
        margin: 20px 0;
      }
      th, td {
        border: 1px solid #ddd;
        padding: 12px;
        text-align: left;
      }
      th {
        background-color: #3498db;
        color: white;
        font-weight: bold;
      }
      tr:nth-child(even) {
        background-color: #f9f9f9;
      }
      blockquote {
        border-left: 4px solid #3498db;
        padding-left: 20px;
        margin-left: 0;
        font-style: italic;
        color: #555;
      }
      a {
        color: #3498db;
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
      ul, ol {
        margin-left: 20px;
      }
      li {
        margin: 5px 0;
      }
      .emoji {
        font-size: 1.2em;
      }
    `;

    // Salva CSS temporaneo
    const cssFile = path.join(outputDir, 'temp-style.css');
    fs.writeFileSync(cssFile, cssStyle);

    // Comando markdown-pdf con opzioni
    const command = `npx markdown-pdf "${inputFile}" \
      --out "${outputFile}" \
      --css-path "${cssFile}" \
      --paper-format A4 \
      --paper-border 2cm \
      --render-delay 1000`;

    await execAsync(command);

    // Rimuovi CSS temporaneo
    if (fs.existsSync(cssFile)) {
      fs.unlinkSync(cssFile);
    }

    // Verifica output
    if (fs.existsSync(outputFile)) {
      const stats = fs.statSync(outputFile);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      console.log('');
      log.success('PDF generato con successo!');
      console.log('');
      log.info(`File: ${path.relative(projectRoot, outputFile)}`);
      log.info(`Dimensione: ${fileSizeMB} MB`);
      console.log('');
      console.log(`${colors.yellow}Per aprire il PDF:${colors.reset}`);
      console.log(`  open "${outputFile}"`);
      console.log('');
    } else {
      throw new Error('File PDF non generato');
    }

  } catch (error) {
    console.log('');
    log.error('Errore durante la generazione del PDF');
    log.error(error.message);
    console.log('');
    log.info('Metodo alternativo: usa un servizio online di conversione MD->PDF');
    log.info('Oppure installa pandoc: brew install pandoc basictex');
    process.exit(1);
  }

  console.log(`${colors.green}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.green}  Completato!${colors.reset}`);
  console.log(`${colors.green}${'='.repeat(60)}${colors.reset}`);
}

main().catch((error) => {
  log.error(error.message);
  process.exit(1);
});
