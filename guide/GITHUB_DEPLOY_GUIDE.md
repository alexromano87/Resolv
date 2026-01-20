# 🚀 Deploy rapido via GitHub Actions (SSH)

> **Obiettivo:** aggiornare il server automaticamente ad ogni push su `main`
> **Metodo:** GitHub Actions + SSH + `docker-compose up -d --build`

---

## ✅ Cosa fa il workflow

- Quando fai push su `main`, GitHub si collega al server via SSH.
- Fa `git reset --hard` su `origin/main` nella cartella di deploy.
- Esegue `docker-compose up -d --build` per aggiornare i container.

Il workflow è in: `.github/workflows/deploy.yml`

---

## 1) Prerequisiti sul server

1. **Repo già clonato** nel path di deploy:
   ```bash
   cd /opt/resolv
   git clone git@github.com:TUO_ORG/resolv.git .
   ```

2. **Docker e docker-compose installati**
3. **File `.env` compilato** nel server

---

## 2) Genera chiave SSH per GitHub Actions

Sul tuo PC:
```bash
ssh-keygen -t ed25519 -C "resolv-deploy" -f ~/.ssh/resolv_deploy
```

Output:
- Chiave privata: `~/.ssh/resolv_deploy`
- Chiave pubblica: `~/.ssh/resolv_deploy.pub`

---

## 3) Aggiungi la chiave pubblica al server

```bash
ssh-copy-id -i ~/.ssh/resolv_deploy.pub deploy@IP_DEL_SERVER
```

Oppure manualmente in:
`~/.ssh/authorized_keys`

---

## 4) Aggiungi i Secrets su GitHub

GitHub → **Settings** → **Secrets and variables** → **Actions**

Inserisci:

- `SSH_HOST` = IP del server
- `SSH_USER` = utente SSH (es. `deploy`)
- `SSH_KEY` = **contenuto** della chiave privata `~/.ssh/resolv_deploy`
- `SSH_PORT` = `22` (opzionale)
- `DEPLOY_PATH` = `/opt/resolv`

---

## 5) Test veloce

Fai un commit qualsiasi su `main` e verifica:

- GitHub Actions → workflow "Deploy" deve risultare verde
- Sul server: i container vengono aggiornati

---

## 6) Note utili

- Se il repo è privato, il server deve avere accesso SSH a GitHub.
- Se usi `sudo` per docker, assicurati che l’utente SSH sia nel gruppo `docker`.

---

## ✅ Esempio di comando locale di deploy manuale

```bash
ssh deploy@IP_DEL_SERVER "cd /opt/resolv && git pull && docker-compose up -d --build"
```
