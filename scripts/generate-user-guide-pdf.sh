#!/bin/bash
# Script per generare PDF della Guida Utente
# Utilizza pandoc per convertire Markdown in PDF

set -e

# Colori per output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}  Generazione PDF - Guida Utente Resolv${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""

# Verifica che pandoc sia installato
if ! command -v pandoc &> /dev/null; then
    echo -e "${RED}❌ Errore: pandoc non è installato${NC}"
    echo ""
    echo "Installa pandoc:"
    echo ""
    echo "macOS:"
    echo "  brew install pandoc"
    echo "  brew install --cask basictex  # Per LaTeX engine"
    echo ""
    echo "Ubuntu/Debian:"
    echo "  sudo apt-get update"
    echo "  sudo apt-get install pandoc texlive-latex-base texlive-fonts-recommended texlive-latex-extra"
    echo ""
    echo "Windows:"
    echo "  choco install pandoc"
    echo "  choco install miktex"
    echo ""
    exit 1
fi

# Directory di lavoro
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
INPUT_FILE="$PROJECT_ROOT/GUIDA_UTENTE.md"
OUTPUT_DIR="$PROJECT_ROOT/docs"
OUTPUT_FILE="$OUTPUT_DIR/Guida_Utente_Resolv.pdf"

# Verifica che il file di input esista
if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${RED}❌ Errore: File $INPUT_FILE non trovato${NC}"
    exit 1
fi

# Crea directory output se non esiste
mkdir -p "$OUTPUT_DIR"

echo -e "${YELLOW}📄 File di input: $INPUT_FILE${NC}"
echo -e "${YELLOW}📁 Directory output: $OUTPUT_DIR${NC}"
echo ""

# Configurazione PDF
TITLE="Guida Utente Resolv"
SUBTITLE="Sistema di Gestione Recupero Crediti"
AUTHOR="Resolv Development Team"
DATE=$(date +"%d/%m/%Y")

echo -e "${GREEN}🔨 Generazione PDF in corso...${NC}"
echo ""

# Genera PDF con pandoc
pandoc "$INPUT_FILE" \
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
    --variable=mainfont:"DejaVu Sans" \
    --variable=monofont:"DejaVu Sans Mono" \
    --variable=colorlinks:true \
    --variable=linkcolor:blue \
    --variable=urlcolor:blue \
    --variable=toccolor:black \
    --variable=lang:it-IT \
    --metadata title="$TITLE" \
    --metadata subtitle="$SUBTITLE" \
    --metadata author="$AUTHOR" \
    --metadata date="$DATE" \
    --output="$OUTPUT_FILE"

# Verifica che il PDF sia stato creato
if [ -f "$OUTPUT_FILE" ]; then
    FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
    echo -e "${GREEN}✅ PDF generato con successo!${NC}"
    echo ""
    echo -e "${GREEN}📄 File: $OUTPUT_FILE${NC}"
    echo -e "${GREEN}📊 Dimensione: $FILE_SIZE${NC}"
    echo ""
    echo -e "${YELLOW}Per aprire il PDF:${NC}"
    echo -e "  open \"$OUTPUT_FILE\""
    echo ""
else
    echo -e "${RED}❌ Errore durante la generazione del PDF${NC}"
    exit 1
fi

echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}  Completato!${NC}"
echo -e "${GREEN}==================================================${NC}"
