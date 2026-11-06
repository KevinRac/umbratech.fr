import { describe, expect, it } from 'vitest';
import type { JournalEntry, JournalKind } from '../src/logic/testkit/journal';
import { STALL_MS, checkSession, mergeJournal } from '../src/logic/testkit/sessionCheck';

function line(k: JournalKind, m: string, t: number, d?: JournalEntry['d'], s = 1, n?: number): JournalEntry {
  return { t, s, k, m, ...(d ? { d } : {}), ...(n ? { n } : {}) };
}
const perf = (t: number, fps = 60, s = 1): JournalEntry => line('perf', `${fps} ips`, t, { fps, pire: 20, lente: 0.1, tas: 80 }, s);

describe('checkSession : le verdict du banc automatique (n°279)', () => {
  it('une session propre passe, avec ses comptes', () => {
    const entries = [
      line('session', 'démarrage', 0, { precedente: 'aucune' }),
      line('save', 'sauvegarde auto : écrite (Haut-Gué)', 1000, { ok: true, slot: 'auto' }),
      line('combat', 'début : x', 5000, { ev: 'debut', enc: 'x' }),
      line('combat', 'fin : victoire en 4 tours (x)', 60000, { ev: 'fin', issue: 'victoire' }),
      perf(20000),
      perf(40000),
      perf(60000),
    ];
    const verdict = checkSession(entries, { sessionEnds: { 1: 65000 } });
    expect(verdict.ok).toBe(true);
    expect(verdict.counts).toMatchObject({ errors: 0, savesOk: 1, savesFailed: 0, battlesStarted: 1, victories: 1, defeats: 0 });
    expect(verdict.perf.samples).toBe(3);
  });

  it('échoue sur toute ligne erreur, regroupée par message', () => {
    const verdict = checkSession([
      line('session', 'démarrage', 0, { precedente: 'aucune' }),
      line('erreur', 'TypeError : x est indéfini', 3000),
      line('erreur', 'TypeError : x est indéfini', 9000, undefined, 1, 2),
      line('erreur', 'promesse rejetée : boum', 12000),
    ]);
    expect(verdict.ok).toBe(false);
    const errors = verdict.findings.filter((f) => f.kind === 'erreur');
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatchObject({ message: 'TypeError : x est indéfini', count: 3, t: 3000 });
    expect(verdict.counts.errors).toBe(4);
  });

  it('échoue sur une sauvegarde en échec (ok:false ou ÉCHEC dans le texte)', () => {
    const verdict = checkSession([
      line('session', 'démarrage', 0, { precedente: 'aucune' }),
      line('save', 'sauvegarde slot1 : écrite (Haut-Gué)', 1000, { ok: true, slot: 'slot1' }),
      line('save', 'sauvegarde slot2 : ÉCHEC — quota dépassé', 2000, { ok: false, slot: 'slot2' }),
      line('save', 'sauvegarde slot3 : ÉCHEC — refusée', 3000),
    ]);
    expect(verdict.ok).toBe(false);
    expect(verdict.counts).toMatchObject({ savesOk: 1, savesFailed: 2 });
    expect(verdict.findings.filter((f) => f.kind === 'sauvegarde')).toHaveLength(2);
  });

  it('échoue sur un blocage : un trou de mesures de fluidité', () => {
    const verdict = checkSession([line('session', 'démarrage', 0, { precedente: 'aucune' }), perf(20000), perf(20000 + STALL_MS + 1000), perf(20000 + STALL_MS + 21000)]);
    expect(verdict.ok).toBe(false);
    expect(verdict.findings).toHaveLength(1);
    expect(verdict.findings[0]).toMatchObject({ kind: 'blocage', t: 20000 });
  });

  it('un trou au tout début de la session compte aussi (le jeu ne démarre jamais)', () => {
    const verdict = checkSession([line('session', 'démarrage', 0, { precedente: 'aucune' }), perf(STALL_MS + 5000)]);
    expect(verdict.findings.map((f) => f.kind)).toEqual(['blocage']);
  });

  it('échoue sur un jeu figé à la fin de la session', () => {
    const entries = [line('session', 'démarrage', 0, { precedente: 'aucune' }), perf(20000), perf(40000)];
    expect(checkSession(entries, { sessionEnds: { 1: 50000 } }).ok).toBe(true);
    const frozen = checkSession(entries, { sessionEnds: { 1: 40000 + STALL_MS + 1000 } });
    expect(frozen.ok).toBe(false);
    expect(frozen.findings[0]?.kind).toBe('blocage');
  });

  it('les sessions se jugent chacune : un rechargement ne fait pas un trou', () => {
    const verdict = checkSession(
      [
        line('session', 'démarrage', 0, { precedente: 'aucune' }),
        perf(20000, 15, 1),
        line('fin', 'fermeture de la page', 30000, undefined, 1),
        line('session', 'démarrage', 0, { precedente: 'propre' }, 2),
        perf(20000, 15, 2),
      ],
      { sessionEnds: { 1: 30000, 2: 25000 }, plannedReloads: [1] },
    );
    expect(verdict.ok).toBe(true);
    expect(verdict.counts.sessions).toBe(2);
  });

  it('les avertissements, la baisse de qualité et une fermeture manquante sont des notes, pas des échecs', () => {
    const verdict = checkSession(
      [
        line('session', 'démarrage', 0, { precedente: 'aucune' }),
        line('avert', 'Texture manquante', 2000),
        line('perf', 'qualité automatique baissée : low', 6000, { baisse: 'low' }),
        perf(20000, 15),
        line('session', 'démarrage', 0, { precedente: 'interrompue' }, 2),
        perf(20000, 15, 2),
      ],
      { plannedReloads: [1] },
    );
    expect(verdict.ok).toBe(true);
    expect(verdict.notes.some((n) => n.includes('Texture manquante'))).toBe(true);
    expect(verdict.notes.some((n) => n.includes('qualité automatique baissée 1 fois'))).toBe(true);
    expect(verdict.notes.some((n) => n.includes('rechargement voulu'))).toBe(true);
    expect(verdict.counts.warnings).toBe(1);
  });

  it('résume la fluidité et le tas', () => {
    const verdict = checkSession([line('session', 'démarrage', 0, { precedente: 'aucune' }), perf(20000, 10), perf(40000, 20), perf(60000, 30)]);
    expect(verdict.perf).toMatchObject({ samples: 3, fpsMin: 10, fpsMedian: 20, fpsMax: 30, heapFirstMb: 80, heapMaxMb: 80 });
  });
});

describe('mergeJournal : recueillir un journal circulaire par relevés successifs', () => {
  it('ajoute les nouvelles lignes sans doubler les anciennes', () => {
    const a = [line('session', 'démarrage', 0, { precedente: 'aucune' }), line('monde', 'lieu : Haut-Gué', 1000)];
    const b = [...a, line('combat', 'début : x', 5000, { ev: 'debut' })];
    const merged = mergeJournal(a, b);
    expect(merged).toHaveLength(3);
    expect(mergeJournal(merged, b)).toHaveLength(3);
  });

  it('garde les lignes que le tampon circulaire a déjà oubliées', () => {
    const early = [line('session', 'démarrage', 0, { precedente: 'aucune' }), line('erreur', 'ancienne erreur', 1000)];
    const late = [line('perf', '60 ips', 90000, { fps: 60 })];
    const merged = mergeJournal(early, late);
    expect(merged.map((e) => e.m)).toEqual(['démarrage', 'ancienne erreur', '60 ips']);
  });

  it('une ligne répétée avance au lieu de se dupliquer', () => {
    const first = [line('erreur', 'boucle', 1000)];
    const second = [line('erreur', 'boucle', 1800, undefined, 1, 4)];
    const merged = mergeJournal(first, second);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ t: 1800, n: 4 });
  });

  it('deux lignes de même texte à des heures différentes restent deux lignes', () => {
    const merged = mergeJournal([line('save', 'sauvegarde auto : écrite (Haut-Gué)', 1000, { ok: true })], [line('save', 'sauvegarde auto : écrite (Haut-Gué)', 600000, { ok: true })]);
    expect(merged).toHaveLength(2);
  });
});
