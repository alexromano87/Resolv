# Resolv - Documentazione

Questa directory contiene la documentazione in formato PDF per l'applicazione Resolv.

## 📄 Documenti Disponibili

- **Guida_Utente_Resolv.pdf** - Guida completa per gli utenti finali
  - Tipologie di utenti e permessi
  - Flussi operativi completi
  - Gestione pratiche, clienti e debitori
  - FAQ e risoluzione problemi

## 🔨 Rigenerare i PDF

Se hai modificato i file Markdown e vuoi rigenerare i PDF, usa uno dei seguenti metodi:

### Metodo 1: Script Node.js (Consigliato)

```bash
# Dalla root del progetto
node scripts/generate-pdf.js
```

Questo metodo:
- ✅ Non richiede installazioni (usa npx)
- ✅ Funziona su tutte le piattaforme
- ✅ Genera PDF con stile personalizzato

### Metodo 2: Script Bash con Pandoc

Se hai pandoc installato:

```bash
# Dalla root del progetto
./scripts/generate-user-guide-pdf.sh
```

Installazione pandoc:
```bash
# macOS
brew install pandoc
brew install --cask basictex

# Ubuntu/Debian
sudo apt-get install pandoc texlive-latex-base texlive-fonts-recommended

# Windows
choco install pandoc miktex
```

### Metodo 3: Docker (Non funziona su Apple Silicon)

```bash
# Dalla root del progetto
./scripts/generate-pdf-docker.sh
```

**Nota:** Questo metodo non funziona su Mac con chip Apple Silicon (M1/M2/M3) a causa di limitazioni dell'immagine Docker.

## 📝 Sorgenti Markdown

I file sorgente si trovano in:
- `guide/GUIDA_UTENTE.md` - Guida utente completa

## 🎨 Personalizzazione

Per modificare lo stile del PDF, edita il file `scripts/generate-pdf.js` e modifica la sezione `cssStyle`.

## 📋 Formato Output

- **Formato**: PDF (A4)
- **Margini**: 2cm su tutti i lati
- **Font**: Arial (corpo), Courier New (codice)
- **Dimensione**: ~11pt
- **Indice**: Automaticamente generato
- **Evidenziazione codice**: Abilitata

## 🔍 Versioning

I PDF vengono generati dalla versione corrente dei file Markdown. Assicurati di:
1. Committare le modifiche ai file MD
2. Rigenerare i PDF
3. Committare i PDF aggiornati

## 📞 Supporto

Per problemi con la generazione dei PDF:
1. Verifica di avere Node.js installato (v14+)
2. Controlla i permessi di esecuzione degli script: `chmod +x scripts/*.sh`
3. Consulta la documentazione di markdown-pdf: https://www.npmjs.com/package/markdown-pdf

## 📦 Distribuzione

I PDF in questa directory possono essere distribuiti separatamente dall'applicazione per:
- Formazione utenti
- Documentazione offline
- Allegati email
- Knowledge base

---

**Ultima generazione:** $(date +"%d/%m/%Y %H:%M")
**Versione applicazione:** Consultare package.json
