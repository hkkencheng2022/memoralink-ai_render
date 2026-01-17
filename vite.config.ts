import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    base: './', // Ensures assets load correctly on GitHub Pages or relative paths
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // SECURITY UPDATE: Removed hardcoded key. 
      // You must set DEEPSEEK_API_KEY in your GitHub Secrets or Streamlit Secrets.
      'process.env.DEEPSEEK_API_KEY': JSON.stringify(env.DEEPSEEK_API_KEY)
    }
  };
});