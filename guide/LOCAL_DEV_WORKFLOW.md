# Local Dev Workflow (Safe vs Prod)

## Obiettivo
Sviluppare in locale con una configurazione il piu' possibile identica alla produzione, senza impattare il server. Il flusso non fa push o deploy senza conferma esplicita.

## Scelte
- Branch dedicato `dev` per il lavoro locale.
- `docker-compose.local-prod.yml` replica la produzione (build, env, nginx) ma senza SSL e con porte locali.
- File `.env.local` usato solo in locale (ignorato da git). Template versionato: `.env.local.example`.

## File coinvolti
- `docker-compose.local-prod.yml` = produzione-like locale
- `nginx.local.conf` = nginx locale (HTTP only)
- `.env.local` = variabili locali (non versionato)
- `.env.local.example` = template versionato

## Avvio locale (prod-like)
```bash
# 1) Crea .env.local dal template
cp .env.local.example .env.local

# 2) Avvia stack locale prod-like
docker compose -f docker-compose.local-prod.yml --env-file .env.local up -d --build

# 3) Verifica
docker compose -f docker-compose.local-prod.yml --env-file .env.local ps
```

## URL locali (prod-like)
- Frontend + API tramite nginx locale: http://localhost:8081
- API diretta (se serve): http://localhost:3000

## Stop / reset
```bash
docker compose -f docker-compose.local-prod.yml --env-file .env.local down
```

## Rilascio in produzione (manuale e controllato)
```bash
# Sul server
cd /opt/resolv

git pull

docker compose -f docker-compose.prod.yml build

docker compose -f docker-compose.prod.yml up -d
```

## Regola d'oro
Non pushare nulla in prod senza conferma esplicita.
