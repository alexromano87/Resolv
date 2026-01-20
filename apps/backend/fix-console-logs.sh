#!/bin/bash

echo "Rimozione console.log dal backend..."

# File da fixare manualmente (già fatto main.ts)
FILES_TO_FIX=(
  "src/pratiche/pratiche.service.ts"
  "src/tickets/tickets.service.ts"
  "src/export/export.controller.ts"
  "src/documenti/documenti.service.ts"
  "src/utilita/utilita.service.ts"
  "src/backup/backup.controller.ts"
)

# Sostituisci console.error con logger.error
for file in "${FILES_TO_FIX[@]}"; do
  if [ -f "$file" ]; then
    echo "Fixing $file..."
    # Sostituisci console.error con this.logger.error (per services/controllers)
    sed -i.bak 's/console\.error(/this.logger.error(/g' "$file"
    sed -i.bak 's/console\.warn(/this.logger.warn(/g' "$file"
    sed -i.bak 's/console\.log(/this.logger.log(/g' "$file"
    rm -f "$file.bak"
  fi
done

echo "✅ Console.log rimossi dai file principali"
echo "⚠️  Controlla manualmente:"
echo "   - src/seed-admin.ts (script di seed, OK lasciare console.log)"
echo "   - src/test-login.ts (script di test, OK lasciare console.log)"
echo "   - src/migrations/*.ts (migrations, OK lasciare console.log)"

