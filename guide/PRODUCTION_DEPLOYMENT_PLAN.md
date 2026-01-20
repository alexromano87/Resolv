# Piano di messa online (proposta iniziale)

## Obiettivo
Mettere online Resolv in modo semplice, stabile e con margine di crescita, mantenendo costi bassi finche gli utenti sono sotto ~100.

## Scelta provider (mia proposta)
Consiglierei Hetzner per rapporto prezzo/prestazioni e per semplicita operativa.
- Pro: costi bassi, performance solide, rete stabile, storage affidabile.
- Contro: data center fuori Italia (se serve compliance nazionale, Aruba e piu adatta).

Se il requisito legale e avere dati in Italia, sceglierei Aruba Cloud.

## Architettura iniziale (fase 1: <100 utenti)
1 VM unica con Docker Compose.
- Nginx reverse proxy (SSL)
- Frontend (statico su nginx)
- Backend (Nest)
- MySQL
- Redis
- Volumi persistenti per database e uploads

Vantaggi: semplice, meno costi, deploy rapido.

## Staging (fase 1.1)
1 VM piccola separata per staging (stessa stack).
- Stesso docker-compose, configurazione piu leggera.
- Serve per test deploy e migrazioni prima della produzione.

## Storage upload (scelta iniziale)
Fase 1: volume locale su VM.
- Backup giornaliero di database + uploads.

Fase 2: storage S3 compatibile (Backblaze, Wasabi, Aruba Object Storage).
- Riduce rischio perdita dati.
- Facilita lo scaling futuro.

## DNS e domini (proposta)
- Frontend: app.resolv.it
- Backend: api.resolv.it
- SSL: Lets Encrypt con rinnovo automatico

## CI/CD (proposta minima)
- Build immagini Docker su CI (GitHub Actions o GitLab CI).
- Push su registry (Docker Hub o registry privato).
- Deploy via SSH con docker-compose pull/up -d.
- Migrazioni DB gestite in fase di deploy (controllate).

## Backup e ripristino
- Backup DB giornaliero (mysqldump) con retention 7-30 giorni.
- Backup uploads (rsync o snapshot).
- Verifica periodica del ripristino.

## Monitoring e log
- Base: docker logs + healthcheck.
- Avanzato: Grafana + Loki/Prometheus.
- Alert minimi: downtime backend, errori 5xx, spazio disco.

## Sicurezza minima
- Firewall: esporre solo 80/443/22.
- SSH con chiave, fail2ban.
- Env separati per staging/prod.
- CORS e rate limit attivi.
- Accesso DB non esposto pubblicamente.

## Taglia VM (esempio Hetzner)
- Produzione: 4 vCPU / 8 GB RAM / 80-160 GB SSD.
- Staging: 2 vCPU / 4 GB RAM / 40-80 GB SSD.

## Scalabilita futura (fase 2)
Quando il carico cresce:
- Separare DB in VM dedicata.
- Spostare uploads su S3.
- Aggiungere replica read-only del DB se necessario.
- Aggiungere caching strategico su Redis.

## Roadmap suggerita
1) VM prod + deploy baseline
2) VM staging
3) Backup automatizzati + test restore
4) Monitoring base + alert
5) Storage S3 per uploads
6) Separazione DB se necessario

## Decisione proposta (sintesi)
Io partirei con:
- Hetzner
- 1 VM prod + 1 VM staging
- Upload su volume locale + backup
- Passaggio a S3 quando iniziano a crescere file e traffico
