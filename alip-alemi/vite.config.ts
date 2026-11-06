import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Собирает service worker со списком всех файлов сборки,
// чтобы скачанные уроки работали без интернета.
function offlineServiceWorker(): Plugin {
  return {
    name: 'offline-sw',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const publicDir = join(__dirname, 'public');
      const publicFiles: string[] = [];
      const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
          const full = join(dir, name);
          if (statSync(full).isDirectory()) walk(full);
          else if (name.startsWith('.')) {
            // GitHub Pages не отдаёт файлы с точкой в начале имени — такой файл сорвал бы установку обновления.
            throw new Error(`В public есть файл с точкой в начале имени: ${relative(publicDir, full)}`);
          } else publicFiles.push(relative(publicDir, full).split('\\').join('/'));
        }
      };
      walk(publicDir);
      const files = ['./', 'index.html', ...Object.keys(bundle), ...publicFiles].filter((f) => !f.endsWith('.map'));
      const version = Date.now().toString(36);
      const template = readFileSync(join(__dirname, 'sw-template.js'), 'utf8');
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template.replace('__VERSION__', version).replace('__FILES__', JSON.stringify(files)),
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), offlineServiceWorker()],
  build: { outDir: '../alip', emptyOutDir: true },
  test: { environment: 'node' },
} as never);
