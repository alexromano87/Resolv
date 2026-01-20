## Documentazione API REST

La documentazione live viene esposta automaticamente da NestJS tramite Swagger.
Una volta avviato il backend (`npm run start:dev` o `npm run start`), visita:

```
http://localhost:3000/api-docs
```

Il pannello riporta tutti gli endpoint (auth, clienti, pratiche, ticket, alert, ecc.)
con descrizioni, payload e errori possibili.

### Autenticazione

1. Ottieni un token `Bearer` con `/auth/login`.
2. Clicca su **Authorize** e incolla `Bearer <token>` nel campo della finestra pop-up.
3. Tutti gli endpoint protetti accettano ora il token per testare i flussi.

### Note aggiuntive

- Le DTO usano `class-validator`: Swagger riporta i vincoli di validazione (es. campi obbligatori).
- Per testare il refresh token usa `/auth/refresh` passando `userId` e `refreshToken` nel body.
- Il rate limiting globale e le protezioni non sono esposte direttamente su Swagger, ma
  l’errore `429 Too Many Requests` viene restituito quando superi il limite.
