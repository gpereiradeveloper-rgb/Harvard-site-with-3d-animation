import {defineConfig} from 'vite';

// Public models are loaded by Three.js at runtime. Prefix their literal URLs
// after JSX compilation as well as Vite's normal HTML/CSS asset handling.
const base = process.env.HARVARD_BASE_PATH || '/';
if (!base.startsWith('/') || !base.endsWith('/')) throw new Error('HARVARD_BASE_PATH must start and end with /');

export default defineConfig({
  base,
  plugins: [{
    name: 'harvard-public-model-base',
    enforce: 'post',
    transform(code, id) {
      if (base === '/' || !/\/src\/.*\.[jt]sx?(?:\?|$)/.test(id)) return null;
      return {code: code.replace(/(["'`])\/assets\//g, (_, quote) => `${quote}${base}assets/`), map: null};
    },
  }],
});
