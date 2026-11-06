import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { CLIPS, ALL_ITEMS } from './index';

const dir = new URL('../../public/audio/kk/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', dir), 'utf8'));

describe('озвучка', () => {
  it('каждая фраза собирается из существующих записей', () => {
    const missing: string[] = [];
    for (const c of Object.values(CLIPS)) {
      for (const p of c.parts ?? [c.id]) {
        if (!CLIPS[p]) missing.push(`${c.id}: нет фразы ${p}`);
        else if (CLIPS[p].parts) missing.push(`${c.id}: вложенная составная ${p}`);
        else if (!manifest.files[p] || !existsSync(new URL(manifest.files[p], dir))) missing.push(`${c.id}: нет файла ${p}`);
      }
    }
    expect(missing).toEqual([]);
  });
  it('у всех символов есть имя, и в папке нет лишних и скрытых файлов', () => {
    for (const i of ALL_ITEMS) if (i.status !== 'stub') expect(i.nameClip && CLIPS[i.nameClip], i.id).toBeTruthy();
    const files = readdirSync(dir);
    expect(files.filter((f) => f.startsWith('.'))).toEqual([]);
    const used = new Set(Object.values(manifest.files));
    expect(files.filter((f) => f.endsWith('.mp3') && !used.has(f))).toEqual([]);
    for (const n of manifest.native) expect(manifest.files[n]).toBeTruthy();
  });
});
