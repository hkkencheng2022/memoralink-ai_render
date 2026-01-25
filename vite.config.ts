
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    base: './',
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env.DEEPSEEK_API_KEY': JSON.stringify(env.DEEPSEEK_API_KEY),
      'process.env.APP_PASSWORD': JSON.stringify(env.APP_PASSWORD),
    }
  };
});
