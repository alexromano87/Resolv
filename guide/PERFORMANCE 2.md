# Performance & Robustness Guide

## Backend Ottimizzazioni Implementate

### 1. Pagination
- **Implementata** su tutti gli endpoint di listing (Pratiche, Clienti, Debitori, ecc.)
- Parametri query: `?page=1&limit=20`
- Default: 20 items per pagina
- Massimo: 100 items per pagina
- Formato risposta include metadata: `{ data: [], meta: { page, limit, total, totalPages, hasNext, hasPrevious } }`

### 2. Redis Caching
- **CacheService** implementato per:
  - **Sessioni utente** (TTL: 1 ora)
  - **Lookup data** (dropdown, liste statiche - TTL: 5 minuti)
  - **User data** (TTL: 10 minuti)
  - **List caching** (TTL: 1 minuto)

**Utilizzo:**
```typescript
// In un service
constructor(private readonly cacheService: CacheService) {}

// Cache lookup data
async getFasi() {
  const cached = await this.cacheService.getLookup('fasi');
  if (cached) return cached;

  const fasi = await this.fasiRepo.find();
  await this.cacheService.setLookup('fasi', fasi);
  return fasi;
}

// Invalidate cache on updates
async update(id: string, dto: UpdateDto) {
  const result = await this.repo.update(id, dto);
  await this.cacheService.invalidateLookup('fasi');
  return result;
}
```

### 3. Rate Limiting
- **Configurato** a 1000 req/min per evitare problemi con E2E tests
- Personalizzabile per endpoint usando decorator `@RateLimit()`
- Store in-memory con auto-reset

### 4. Health Checks
- **GET /health** - Controlla database, Redis, memoria, uptime
- **GET /health/ready** - Kubernetes readiness probe
- **GET /health/live** - Kubernetes liveness probe

## Frontend Ottimizzazioni Implementate

### 1. Code Splitting
- **Vendor chunks** separati:
  - `vendor-react`: React core libraries
  - `vendor-ui`: UI components (lucide-react)
  - `vendor-charts`: Chart libraries (recharts)
  - `vendor-forms`: Form handling (react-hook-form)

### 2. Lazy Loading
- Tutte le pagine già lazy-loaded con `React.lazy()`
- ErrorBoundary e Suspense per gestione errori

### 3. Build Optimization
- Minification con Terser
- Console.log rimossi in production
- Source maps disabilitate in production

## Raccomandazioni per Monitoraggio

### Backend Monitoring (da implementare in futuro)

#### 1. Application Performance Monitoring (APM)
- **Sentry** per error tracking:
```typescript
// apps/backend/src/main.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

#### 2. Metrics Collection
- **Prometheus** + **Grafana** per metriche:
  - Request latency
  - Error rates
  - Database query performance
  - Redis hit/miss rates
  - Memory usage

#### 3. Logging
- **Winston** o **Pino** per structured logging
- Log levels: error, warn, info, debug
- Log aggregation con **ELK Stack** o **Loki**

### Frontend Monitoring (da implementare in futuro)

#### 1. Real User Monitoring (RUM)
- **Sentry** per React:
```typescript
// apps/frontend/src/main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 0.1,
});
```

#### 2. Web Vitals
- Core Web Vitals tracking:
  - LCP (Largest Contentful Paint)
  - FID (First Input Delay)
  - CLS (Cumulative Layout Shift)

#### 3. Bundle Analysis
- `npm run build` genera report di analisi bundle
- Monitorare size dei chunks regolarmente

## Database Ottimizzazioni (già implementate)

### 1. Indexes
- Primary keys su tutte le tabelle
- Foreign keys indicizzate
- Composite indexes su query comuni

### 2. Query Optimization
- Utilizzare `.select()` per ridurre dati trasferiti
- Eager loading con `relations: []` solo quando necessario
- Pagination su tutte le liste

## Checklist Deployment Production

### Pre-Deploy
- [ ] Run `npm run build` su frontend e backend
- [ ] Verificare health checks: `curl http://localhost:3000/health`
- [ ] Testare E2E: `npm run e2e`
- [ ] Verificare dimensione bundle: controllare file `stats.html`
- [ ] Aggiornare variabili environment in `.env`

### Post-Deploy
- [ ] Verificare uptime su `/health/live`
- [ ] Monitorare logs per errori
- [ ] Verificare performance database (slow query log)
- [ ] Controllare memoria Redis
- [ ] Testare funzionalità critiche manualmente

### Monitoring Continuo
- [ ] Setup alerts per:
  - API error rate > 5%
  - Response time > 2s (p95)
  - Database connections > 80%
  - Redis memory > 80%
  - Disk space > 80%

## Performance Targets

### Backend
- **Response Time**: < 200ms (p95) per API semplici
- **Response Time**: < 500ms (p95) per API complesse
- **Throughput**: > 100 req/s
- **Error Rate**: < 1%

### Frontend
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **Total Bundle Size**: < 500KB (gzipped)
- **Page Load Time**: < 2s

### Database
- **Query Time**: < 50ms (p95)
- **Connection Pool**: < 80% usage
- **Cache Hit Rate**: > 70% (Redis)

## Troubleshooting

### Backend Slow
1. Check `/health` endpoint per status database/Redis
2. Analizzare slow query log MySQL
3. Verificare cache hit rate
4. Aumentare pool connections se necessario

### Frontend Slow
1. Analizzare bundle size in `stats.html`
2. Verificare network waterfall in DevTools
3. Controllare unnecessary re-renders con React DevTools
4. Ottimizzare images e assets

### High Memory Usage
1. Backend: Verificare cache size Redis
2. Frontend: Controllare memory leaks con Chrome DevTools
3. Database: Ottimizzare query e indexes
