/**
 * Lot M9b : compte et sauvegarde en ligne (GDD §14.3, décisions n°170 à n°173).
 *
 * - `planSync` : qui gagne entre ce navigateur et le compte.
 * - La somme de contrôle PHP du serveur (`api/lib/checksum.php`) est la même
 *   que celle du jeu, octet pour octet.
 * - L'API complète tourne sous `php -S` avec une base SQLite et des e-mails
 *   écrits dans un fichier : connexion par code, écriture, conflit, lecture,
 *   suppression, déconnexion. Ces deux derniers blocs sont sautés si PHP n'est
 *   pas installé.
 */
import { execFileSync, spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { checksumOf, envelopeChecksum } from '../src/logic/save';
import { peekEnvelope, planSync, slotOfKey, keyOfSlot } from '../src/logic/save/sync';

const API = resolve(import.meta.dirname, '..', 'api');
const FIXTURE = readFileSync(resolve(import.meta.dirname, 'fixtures', 'save-v1.json'), 'utf8');
const hasPhp = spawnSync('php', ['-r', 'echo extension_loaded("pdo_sqlite") ? "ok" : "no";'], { encoding: 'utf8' }).stdout === 'ok';

describe('planSync (n°172)', () => {
  const L = (checksum: string) => ({ checksum, savedAt: '2026-11-02T20:00:00.000Z' });
  const R = (checksum: string, rev: number) => ({ checksum, savedAt: '2026-11-02T20:00:00.000Z', rev });
  const B = (checksum: string, rev: number) => ({ checksum, rev });

  it('identiques ou vides : rien', () => {
    expect(planSync(null, null, null)).toBe('none');
    expect(planSync(L('a'), R('a', 3), null)).toBe('none');
  });
  it('un seul côté a changé depuis la dernière synchronisation : il gagne', () => {
    expect(planSync(L('b'), R('a', 3), B('a', 3))).toBe('push');
    expect(planSync(L('a'), R('c', 4), B('a', 3))).toBe('pull');
  });
  it('les deux ont changé, ou jamais synchronisés et différents : le joueur choisit', () => {
    expect(planSync(L('b'), R('c', 4), B('a', 3))).toBe('conflict');
    expect(planSync(L('b'), R('c', 1), null)).toBe('conflict');
  });
  it('un côté vide', () => {
    expect(planSync(L('a'), null, null)).toBe('push');
    expect(planSync(null, R('a', 1), null)).toBe('pull');
    // Supprimé ici depuis la dernière synchronisation, inchangé en ligne : on supprime en ligne.
    expect(planSync(null, R('a', 3), B('a', 3))).toBe('deleteRemote');
    // Supprimé ici, mais changé en ligne entre-temps : on reprend la version en ligne.
    expect(planSync(null, R('c', 4), B('a', 3))).toBe('pull');
    // Supprimé en ligne, inchangé ici : on supprime ici ; changé ici : on renvoie.
    expect(planSync(L('a'), null, B('a', 3))).toBe('deleteLocal');
    expect(planSync(L('b'), null, B('a', 3))).toBe('push');
  });
  it('clés et emplacements ; lecture rapide d’une enveloppe', () => {
    expect(slotOfKey('vaelmor:save:slot2')).toBe('slot2');
    expect(keyOfSlot('auto')).toBe('vaelmor:save:auto');
    expect(peekEnvelope(FIXTURE)).toEqual({ checksum: JSON.parse(FIXTURE).checksum, savedAt: '2026-11-02T20:00:00.000Z' });
    expect(peekEnvelope('{abîmé')).toBeNull();
    expect(peekEnvelope(null)).toBeNull();
  });
});

describe.skipIf(!hasPhp)('somme de contrôle du serveur (PHP)', () => {
  const php = (json: string): string =>
    execFileSync('php', ['-r', `require '${join(API, 'lib', 'checksum.php')}'; echo fnv1a32(canonical_json(json_decode(stream_get_contents(STDIN), false)));`], { input: json, encoding: 'utf8' });

  it('identique à celle du jeu, y compris accents, objets vides, nombres et caractères spéciaux', () => {
    const tricky = {
      z: 1,
      a: { vide: {}, liste: [], neg: -3, flottant: 520.5, petit: 0.000001, grand: 1e21, ent: 3600000 },
      texte: 'Ilmëa « Pierre-Cœur » — 🌙     "guillemets" \\ / <tag> \t\n',
      bool: [true, false, null],
    };
    expect(php(JSON.stringify(tricky))).toBe(checksumOf(tricky));
  });

  it('la sauvegarde figée v1 a la même somme des deux côtés', () => {
    const env = JSON.parse(FIXTURE) as Record<string, unknown>;
    const out = execFileSync('php', ['-r', `require '${join(API, 'lib', 'checksum.php')}'; echo envelope_checksum(json_decode(stream_get_contents(STDIN), false));`], { input: FIXTURE, encoding: 'utf8' });
    expect(out).toBe(envelopeChecksum(env));
    expect(out).toBe(env['checksum']);
  });
});

describe.skipIf(!hasPhp)('API du compte (php -S, SQLite)', () => {
  let server: ChildProcess;
  let base = '';
  let journal = '';
  let cookie = '';

  /** Schéma MySQL de production adapté à SQLite (index et moteur retirés). */
  function sqliteSchema(): string {
    return readFileSync(join(API, 'schema.sql'), 'utf8')
      .replace(/\) ENGINE=[^;]*;/g, ');')
      .replace(/UNIQUE KEY \w+ \((\w+)\)/g, 'UNIQUE ($1)')
      .split('\n')
      .filter((line) => !/^\s*KEY /.test(line))
      .join('\n')
      .replace(/,(\s*\n\))/g, '$1');
  }

  beforeAll(async () => {
    const dir = mkdtempSync(join(tmpdir(), 'vaelmor-api-'));
    const db = join(dir, 'vaelmor.sqlite');
    journal = join(dir, 'mails.txt');
    writeFileSync(join(dir, 'schema.sql'), sqliteSchema());
    execFileSync('php', ['-r', `$p = new PDO('sqlite:${db}'); $p->exec(file_get_contents('${join(dir, 'schema.sql')}'));`]);
    const config = join(dir, 'config.php');
    writeFileSync(
      config,
      `<?php return ['db_dsn' => 'sqlite:${db}', 'secret' => '${'s'.repeat(40)}', 'mail_driver' => 'journal', 'mail_journal' => '${journal}', 'mail_from' => 'no-reply@umbratech.fr'];`,
    );
    const port = 18000 + Math.floor(Math.random() * 1000);
    base = `http://127.0.0.1:${port}`;
    server = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', resolve(API, '..')], { env: { ...process.env, VAELMOR_API_CONFIG: config }, stdio: 'ignore' });
    for (let i = 0; i < 50; i++) {
      try {
        await fetch(`${base}/api/index.php?r=auth/me`);
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  }, 15000);

  afterAll(() => {
    server?.kill();
  });

  async function api(route: string, body?: Record<string, unknown>, query = ''): Promise<{ status: number; data: Record<string, unknown> }> {
    const res = await fetch(`${base}/api/index.php?r=${route}${query}`, {
      method: body ? 'POST' : 'GET',
      headers: { ...(body ? { 'Content-Type': 'application/json', 'X-Vaelmor': '1' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0] ?? '';
    return { status: res.status, data: (await res.json()) as Record<string, unknown> };
  }

  const lastCode = (): string => /\b(\d{6})\b/.exec(readFileSync(journal, 'utf8').split('\n').reverse().join('\n'))?.[1] ?? '';

  it('connexion par code, sauvegardes, conflit, suppression, déconnexion', async () => {
    expect((await api('auth/me')).data).toEqual({ user: null });
    expect((await api('saves/list')).status).toBe(401);

    // Code envoyé (dans le journal), mauvais code refusé, bon code accepté.
    expect((await api('auth/request', { email: 'Joueur@Exemple.fr ' })).status).toBe(200);
    const code = lastCode();
    expect(code).toMatch(/^\d{6}$/);
    expect((await api('auth/request', { email: 'joueur@exemple.fr' })).data['error']).toBe('cooldown');
    expect((await api('auth/verify', { email: 'joueur@exemple.fr', code: code === '000000' ? '111111' : '000000' })).status).toBe(400);
    const ok = await api('auth/verify', { email: 'joueur@exemple.fr', code });
    expect(ok.status).toBe(200);
    expect(cookie).toMatch(/^vaelmor_session=/);
    expect((await api('auth/me')).data).toEqual({ user: { email: 'joueur@exemple.fr' } });
    // Le code ne sert qu'une fois.
    expect((await api('auth/verify', { email: 'joueur@exemple.fr', code })).status).toBe(400);

    // Écriture, conflit, lecture.
    const put = await api('saves/put', { slot: 'auto', envelope: FIXTURE, baseRev: 0 });
    expect(put).toMatchObject({ status: 200, data: { rev: 1 } });
    const conflict = await api('saves/put', { slot: 'auto', envelope: FIXTURE, baseRev: 0 });
    expect(conflict).toMatchObject({ status: 409, data: { error: 'conflict', rev: 1 } });
    expect((await api('saves/put', { slot: 'auto', envelope: FIXTURE, baseRev: 1 })).data['rev']).toBe(2);
    const list = await api('saves/list');
    expect(list.data['saves']).toEqual([{ slot: 'auto', checksum: JSON.parse(FIXTURE).checksum, savedAt: '2026-11-02T20:00:00.000Z', meta: JSON.parse(FIXTURE).meta, size: Buffer.byteLength(FIXTURE), rev: 2 }]);
    expect((await api('saves/get', undefined, '&slot=auto')).data).toEqual({ slot: 'auto', envelope: FIXTURE, rev: 2 });
    expect((await api('saves/get', undefined, '&slot=slot3')).status).toBe(404);

    // Contrôles du serveur : somme, enveloppe, emplacement, taille (n°173).
    const tampered = JSON.parse(FIXTURE) as { meta: { gold: number } };
    tampered.meta.gold = 99999;
    expect((await api('saves/put', { slot: 'slot1', envelope: JSON.stringify(tampered), baseRev: 0 })).data['error']).toBe('checksum');
    expect((await api('saves/put', { slot: 'slot1', envelope: '{"game":"autre"}', baseRev: 0 })).data['error']).toBe('envelope');
    expect((await api('saves/put', { slot: 'slot9', envelope: FIXTURE, baseRev: 0 })).data['error']).toBe('slot');
    expect((await api('saves/put', { slot: 'slot1', envelope: 'x'.repeat(210 * 1024), baseRev: 0 })).status).toBe(413);

    // Sans l'en-tête maison, une écriture est refusée (CSRF).
    const csrf = await fetch(`${base}/api/index.php?r=saves/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: '{"slot":"auto"}' });
    expect(csrf.status).toBe(403);

    // Suppression avec contrôle de révision, puis déconnexion.
    expect((await api('saves/delete', { slot: 'auto', baseRev: 1 })).status).toBe(409);
    expect((await api('saves/delete', { slot: 'auto', baseRev: 2 })).status).toBe(200);
    expect((await api('saves/list')).data['saves']).toEqual([]);
    expect((await api('auth/logout', {})).status).toBe(200);
    expect((await api('auth/me')).data).toEqual({ user: null });
  }, 20000);
});
