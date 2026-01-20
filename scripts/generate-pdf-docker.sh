#!/bin/bash
# Script per generare PDF della Guida Utente usando Docker
# Non richiede installazione di pandoc o LaTeX sul sistema locale

set -e

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}  Generazione PDF - Guida Utente Resolv${NC}"
echo -e "${GREEN}  (usando Docker - nessuna installazione locale richiesta)${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""

# Verifica che Docker sia installato
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Errore: Docker non è installato${NC}"
    echo ""
    echo "Installa Docker da: https://www.docker.com/get-started"
    echo ""
    exit 1
fi

# Directory di lavoro
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
INPUT_FILE="guide/GUIDA_UTENTE.md"
OUTPUT_DIR="docs"
OUTPUT_FILE="Guida_Utente_Resolv.pdf"

# Verifica che il file di input esista
if [ ! -f "$PROJECT_ROOT/$INPUT_FILE" ]; then
    echo -e "${RED}❌ Errore: File $INPUT_FILE non trovato${NC}"
    echo -e "${YELLOW}Cercato in: $PROJECT_ROOT/$INPUT_FILE${NC}"
    exit 1
fi

# Crea directory output se non esiste
mkdir -p "$PROJECT_ROOT/$OUTPUT_DIR"

echo -e "${YELLOW}📄 File di input: $INPUT_FILE${NC}"
echo -e "${YELLOW}📁 Directory output: $OUTPUT_DIR${NC}"
echo ""

echo -e "${GREEN}🔨 Generazione PDF in corso con Docker...${NC}"
echo -e "${YELLOW}⏳ Potrebbe richiedere qualche minuto al primo avvio (download immagine Docker)${NC}"
echo ""

# Configurazione metadata
TITLE="Guida Utente Resolv"
SUBTITLE="Sistema di Gestione Recupero Crediti"
AUTHOR="Resolv Development Team"
DATE=$(date +"%d/%m/%Y")

# Genera PDF usando immagine Docker pandoc/latex
docker run --rm \
    -v "$PROJECT_ROOT:/data" \
    -u $(id -u):$(id -g) \
    pandoc/latex:latest \
    "/data/$INPUT_FILE" \
    --from=markdown+hard_line_breaks+pipe_tables+backtick_code_blocks \
    --to=pdf \
    --pdf-engine=xelatex \
    --toc \
    --toc-depth=3 \
    --number-sections \
    --highlight-style=tango \
    --variable=geometry:margin=2.5cm \
    --variable=papersize:a4 \
    --variable=fontsize:11pt \
    --variable=documentclass:article \
    --variable=colorlinks:true \
    --variable=linkcolor:blue \
    --variable=urlcolor:blue \
    --variable=toccolor:black \
    --variable=lang:it-IT \
    --metadata title="$TITLE" \
    --metadata subtitle="$SUBTITLE" \
    --metadata author="$AUTHOR" \
    --metadata date="$DATE" \
    --output="/data/$OUTPUT_DIR/$OUTPUT_FILE"

# Verifica che il PDF sia stato creato
if [ -f "$PROJECT_ROOT/$OUTPUT_DIR/$OUTPUT_FILE" ]; then
    FILE_SIZE=$(du -h "$PROJECT_ROOT/$OUTPUT_DIR/$OUTPUT_FILE" | cut -f1)
    echo ""
    echo -e "${GREEN}✅ PDF generato con successo!${NC}"
    echo ""
    echo -e "${GREEN}📄 File: $OUTPUT_DIR/$OUTPUT_FILE${NC}"
    echo -e "${GREEN}📊 Dimensione: $FILE_SIZE${NC}"
    echo ""
    echo -e "${YELLOW}Per aprire il PDF:${NC}"
    echo -e "  open \"$PROJECT_ROOT/$OUTPUT_DIR/$OUTPUT_FILE\""
    echo ""
else
    echo -e "${RED}❌ Errore durante la generazione del PDF${NC}"
    exit 1
fi

echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}  Completato!${NC}"
echo -e "${GREEN}==================================================${NC}"
