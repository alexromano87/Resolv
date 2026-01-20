import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/setupTests.ts'],
    globals: true,
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: [
        'src/pages/LoginPage.tsx',
        'src/pages/PratichePage.tsx',
        'src/pages/DocumentiPage.tsx',
        'src/pages/DashboardCondivisaPage.tsx',
        'src/pages/ResetPasswordPage.tsx',
        'src/pages/SelectStudioPage.tsx',
        'src/components/ui/ConfirmDialog.tsx',
        'src/components/ui/ToastProvider.tsx',
        'src/components/ui/CustomSelect.tsx',
        'src/components/ui/BodyPortal.tsx',
        'src/components/ui/Logo.tsx',
      ],
      exclude: ['src/**/__tests__/**', 'src/setupTests.ts'],
      lines: 70,
      statements: 70,
      functions: 80,
      branches: 70,
    },
  },
});
