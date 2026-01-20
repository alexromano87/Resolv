# Checklist Go-Live (Resolv)

Usa questa lista per decidere se il software e pronto per la produzione.
Spunta ogni voce solo dopo verifica reale.

## 1) Applicazione e funzionalita
- [ ] Login/Logout funzionano (studio, cliente).
- [ ] Flusso pratiche completo (creazione, modifica, chiusura).
- [ ] Documenti: upload, download, permessi cliente/studio.
- [ ] Report PDF/CSV generati correttamente.
- [ ] Notifiche (documenti, ticket, alert) verificate.
- [ ] Errori UI gestiti (validation, messaggi chiari).

## 2) Configurazione produzione
- [ ] `.env` produzione completi (backend e frontend).
- [ ] JWT_SECRET e credenziali DB sicure.
- [ ] CORS configurato solo su domini produzione.
- [ ] Rate limiting attivo su API.
- [ ] HTTPS attivo con certificati validi.

## 3) Sicurezza base
- [ ] SSH solo con chiavi (no password).
- [ ] Firewall: aperti solo 80/443/22.
- [ ] Database non esposto pubblicamente.
- [ ] Aggiornamenti OS applicati.

## 4) Backup e ripristino
- [ ] Backup automatici DB configurati (giornalieri).
- [ ] Backup uploads configurati.
- [ ] Restore testato su staging.
- [ ] Retention definita (es. 7-30 giorni).

## 5) Monitoring e log
- [ ] Healthcheck servizi ok.
- [ ] Alert su down/5xx/CPU/RAM/Disco.
- [ ] Log con rotazione (non saturano disco).

## 6) Deploy e rollback
- [ ] Deploy ripetibile (script o CI/CD).
- [ ] Migrazioni DB controllate.
- [ ] Rollback previsto (immagini/versioni precedenti).

## 7) Staging (consigliato)
- [ ] Staging attivo e aggiornato.
- [ ] Test deploy in staging prima del prod.

---

### Decisione
- Se una voce critica e non spuntata, rimanda il go-live.
- Quando tutte le voci sono spuntate, puoi programmare la messa in produzione.
