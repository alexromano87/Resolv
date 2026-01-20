# Guida Professionale a Git

Manuale pratico e approfondito per usare Git in modo sicuro ed efficiente in team.

---

## Indice

1. [Modello dei dati Git](#modello-dei-dati-git)
2. [Configurazione iniziale](#configurazione-iniziale)
3. [Flusso quotidiano](#flusso-quotidiano)
4. [Strategie di branching](#strategie-di-branching)
5. [Commit e messaggi](#commit-e-messaggi)
6. [Merge, rebase, cherry-pick](#merge-rebase-cherry-pick)
7. [Remoti, fetch, pull e push](#remoti-fetch-pull-e-push)
8. [Tag e release](#tag-e-release)
9. [Gestione file grandi e binari](#gestione-file-grandi-e-binari)
10. [Stash e lavoro temporaneo](#stash-e-lavoro-temporaneo)
11. [Ripristino e recovery](#ripristino-e-recovery)
12. [Debug con git bisect](#debug-con-git-bisect)
13. [Hook e automazioni](#hook-e-automazioni)
14. [Performance e manutenzione](#performance-e-manutenzione)
15. [Sicurezza e secret hygiene](#sicurezza-e-secret-hygiene)
16. [Troubleshooting rapido](#troubleshooting-rapido)
17. [Cheat sheet comandi](#cheat-sheet-comandi)

---

## Modello dei dati Git

- **Commit**: snapshot immutabile dello stato dei file + metadati (autore, data, messaggio, parent).
- **Branch/tag**: puntatori mobili (branch) o fissi (tag) a commit; `HEAD` punta al commit corrente o a un branch.
- **Index (staging area)**: zona intermedia tra working tree e commit; ciò che è in stage finisce nel prossimo commit.
- **Remote-tracking branch**: copie locali dei branch remoti (`origin/main`), aggiornate da `git fetch`.

---

## Configurazione iniziale

```bash
git config --global user.name "Nome Cognome"
git config --global user.email "email@dominio.com"
git config --global pull.ff only          # evita merge automatici
git config --global init.defaultBranch main
git config --global core.autocrlf input   # su macOS/Linux; su Windows valutare true
git config --global fetch.prune true      # pulizia remoti
```

Opzionali:

- Firma commit/tag: `git config --global commit.gpgsign true` + chiave GPG/SSH.
- Alias utili:
  ```bash
  git config --global alias.st "status -sb"
  git config --global alias.lg "log --oneline --graph --decorate"
  git config --global alias.co "checkout"
  git config --global alias.sw "switch"
  ```

---

## Flusso quotidiano

1. **Aggiorna base**: `git fetch` (o `git pull --ff-only` su branch personale).
2. **Nuovo lavoro**: `git switch -c feature/nome` (o `git switch feature/nome` se esiste).
3. **Sviluppo**: modifica file, controlla `git status`.
4. **Review locale**: `git diff` (working vs stage), `git diff --cached` (stage vs HEAD).
5. **Staging selettivo**: `git add -p file` per porzioni; evita `git add .` se ci sono file non desiderati.
6. **Commit piccolo e atomico**: uno scopo per commit.
7. **Allinea prima di push**: `git fetch origin && git rebase origin/main` (se branch personale) per ridurre conflitti.
8. **Push**: `git push -u origin feature/nome`.
9. **PR/MR**: apri una pull request con CI attiva e richiesta di review.

---

## Strategie di branching

- **Main**: sempre stabile; protetto (CI obbligatoria, almeno 1 review).
- **Develop** (opzionale): integrazione continua prima di main.
- **Feature branch**: `feature/<scopo>` brevi, 1-3 giorni di vita.
- **Hotfix**: da `main` o da branch di release, merge rapido + tag.
- **Release branch** (opzionale): `release/1.2.0` per hardening, poi merge in main e develop.

Consiglio: storia lineare sui branch personali tramite rebase; su main preferire merge fast-forward o merge commit controllati.

---

## Commit e messaggi

- Commit piccoli, coerenti, testati.
- Messaggi chiari (Conventional Commits consigliati):
  - `feat: aggiunge ricerca clienti`
  - `fix: gestisce token scaduto`
  - `chore: aggiorna dipendenze`
  - `docs: aggiunge guida deploy`
- Corpo del commit (opzionale) per spiegare *perché* e note di breaking change.
- Evita: commit con build generate, file grandi, segreti.

---

## Merge, rebase, cherry-pick

- **Merge**: conserva cronologia originale; usare quando più autori condividono branch.
- **Rebase**: riscrive la base; usare su branch personali per storia pulita. Non rebase su branch già pushato e usato da altri senza coordinamento.
- **Cherry-pick**: applica singolo commit altrove (es. hotfix da main verso release).
- Risoluzione conflitti: `git status` mostra file in conflitto; modifica, poi `git add <file>` e continua (`git merge --continue` o `git rebase --continue`).

---

## Remoti, fetch, pull e push

- `git remote -v` per elencare remoti (tipici: `origin`, `upstream` per fork).
- `git fetch` aggiorna riferimenti remoti senza toccare working tree.
- `git pull --ff-only` evita merge inattesi; se serve merge esplicito usa `git pull --no-ff` o rebase `git pull --rebase`.
- `git push -u origin feature/x` crea il branch remoto e imposta tracking.
- Pulizia branch remoti obsoleti: `git fetch --prune`.

---

## Tag e release

- Tag annotati per release: `git tag -a v1.2.0 -m "release 1.2.0"` sul commit build-verified.
- Pubblica tag: `git push origin v1.2.0` (o `git push --tags` per tutti).
- SemVer: MAJOR.MINOR.PATCH; includi changelog generato da tag/commit.

---

## Gestione file grandi e binari

- Evita committare build artefacts e asset pesanti; aggiungi a `.gitignore`.
- Usa **Git LFS** per binari >50MB:
  ```bash
  git lfs install
  git lfs track "*.mp4"
  git add .gitattributes
  ```
- Per dipendenze esterne versionate, valuta submodule o vendoring controllato.

---

## Stash e lavoro temporaneo

- Salva stato non committato: `git stash push -m "wip api"` (include tracked; usa `-u` per untracked).
- Ripristina: `git stash pop` (rimuove dallo stash) o `git stash apply` (mantiene).
- Lista: `git stash list`; dettaglio: `git stash show -p stash@{0}`.
- Non lasciare stash vecchi: confliggono e si dimenticano.

---

## Ripristino e recovery

- **Undo sicuri**:
  - `git revert <sha>` crea commit opposto (scelta su branch condivisi).
  - `git restore <file>` annulla modifiche locali non stage.
  - `git restore --staged <file>` rimuove dallo stage.
- **Reset** (cauto):
  - `git reset --soft <sha>`: sposta HEAD, mantiene stage+working.
  - `git reset --mixed <sha>` (default): mantiene working, svuota stage.
  - `git reset --hard <sha>`: distruttivo, elimina modifiche locali.
- **Reflog** per recupero: `git reflog` mostra movimenti di HEAD/branch; puoi riposizionarti su un commit perso.

---

## Debug con git bisect

1. `git bisect start`
2. `git bisect bad` (sul commit che contiene il bug)
3. `git bisect good <sha_buono>`
4. Git checkout intermedio; esegui test; marca con `git bisect good` o `git bisect bad`.
5. Ripeti finché Git identifica il commit colpevole.
6. `git bisect reset` per tornare al branch originario.

Automatizza con test script: `git bisect run npm test`.

---

## Hook e automazioni

- Hook lato client (`.git/hooks`): `pre-commit` per lint/format/test rapidi, `commit-msg` per validare messaggi.
- Usa framework come **pre-commit** o **Husky** per gestione portabile.
- CI: esegui lint/test/build su ogni push/PR; blocca merge se falliscono.

---

## Performance e manutenzione

- `.gitignore` curato riduce repo gonfie.
- Pulizia oggetti orfani: `git gc` (raramente serve `--aggressive`).
- Rimuovi file grandi accidentalmente committati con `git filter-repo` (non riscrivere storia pubblica senza coordinamento).
- `git clean -xdf` pulisce file non tracciati/ignorati (distruttivo: usa con cautela).

---

## Sicurezza e secret hygiene

- Non committare `.env`, chiavi, token; usa `.gitignore` + secret manager.
- Per credenziali già committate: ruota i segreti, rimuovi con `git filter-repo`, invalida chiavi esposte.
- Abilita 2FA sugli account Git hosting; limita access token (scopes minimi, TTL).
- Branch protetti e review obbligatorie riducono rischio di push non validati.

---

## Troubleshooting rapido

- Vedo conflitti a ogni pull: probabilmente pull con merge automatici; usa `git pull --ff-only` o rebase.
- Branch remoto eliminato ma vedo ancora il riferimento: `git fetch --prune`.
- Ho resettato per errore: `git reflog`, identifica commit precedente, `git reset --hard <sha>`.
- File scomparsi dopo merge: controlla `git status`, `git log --stat`, recupera con `git checkout <sha> -- <file>` o `git restore`.
- Oggetti corrotti/cronologia rotta: `git fsck` per diagnosi.

---

## Cheat sheet comandi

```bash
# Stato e differenze
git status -sb
git diff                # working vs stage
git diff --cached       # stage vs HEAD

# Branching
git switch -c feature/x
git switch main
git branch -vv          # tracking info

# Integrazione
git fetch origin
git rebase origin/main
git merge main

# Stash
git stash push -m "wip"
git stash pop

# Ripristino
git revert <sha>
git restore <file>
git reset --soft <sha>

# Tag/release
git tag -a v1.2.0 -m "release 1.2.0"
git push origin v1.2.0

# Analisi
git log --oneline --graph --decorate -20
git blame percorso/file
git bisect start
```

---

## Checklist essenziale per il team

- Config utente e pull.ff impostati.
- `.gitignore` e `.gitattributes` definiti (newline, LFS se serve).
- Branch protetti con CI obbligatoria e almeno 1 review.
- Convenzione messaggi commit (es. Conventional Commits).
- Tag annotati per release + changelog.
- Nessun segreto in repo; 2FA attiva sugli account Git hosting.
- Processo di recovery noto (reflog, revert, backup).
