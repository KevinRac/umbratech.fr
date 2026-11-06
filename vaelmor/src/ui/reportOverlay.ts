/**
 * Écran F10 « Signaler un problème » (lot H de M10, décisions n°247, n°273 et n°276).
 *
 * C'est une superposition HTML posée exactement sur le canevas du jeu (même
 * taille, mêmes couleurs, mêmes polices pixel) et non une scène Phaser : le
 * testeur y tape un vrai texte (accents, collage, sélection), ce qu'un champ
 * dessiné dans le canevas ne sait pas faire de façon fiable. Le jeu est mis en
 * pause pendant que l'écran est ouvert (voir `reportLauncher.ts`) et les touches
 * et la souris n'atteignent pas le jeu.
 *
 * Trois vues : le formulaire, le signalement enregistré (avec le rapport exact
 * à copier ou télécharger) et l'export de fin de session. Rien n'est envoyé.
 */
import type Phaser from 'phaser';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../core/config';
import { clearTestkit, getNotebook, recordNote, sessionExportText } from '../core/testkit';
import { NOTE_KINDS, NOTE_KIND_HINT, NOTE_KIND_LABEL, NOTE_TEXT_MAX, SEVERITIES, SEVERITY_HINT, SEVERITY_LABEL, countByKind, type NoteKind, type Severity } from '../logic/testkit/notebook';
import { REPORT_TAIL, reportFileName } from '../logic/testkit/report';
import { PALETTE, toCss } from '../render/palette';

type View = 'form' | 'saved' | 'session';

/** Brouillon gardé tant que la page reste ouverte : fermer l'écran par erreur ne fait rien perdre. */
const draft: { kind: NoteKind; severity: Severity | null; text: string } = { kind: 'bug', severity: null, text: '' };

export interface OpenedReport {
  close(): void;
}

let current: OpenedReport | null = null;

export const isReportOpen = (): boolean => current !== null;

const STYLE_ID = 'vaelmor-report-style';

function css(): string {
  const c = (color: number): string => toCss(color);
  return `
#vaelmor-report { position: fixed; inset: 0; z-index: 30; background: ${c(PALETTE.nuit)}ee; color: ${c(PALETTE.parchemin)}; }
#vaelmor-report .vr-stage { position: absolute; width: ${CANVAS_WIDTH}px; height: ${CANVAS_HEIGHT}px; transform-origin: 0 0; font: 18.667px/1.15 "Vaelmor Jersey 10", Georgia, serif; }
#vaelmor-report .vr-panel { position: absolute; left: 36px; top: 16px; right: 36px; bottom: 16px; box-sizing: border-box; padding: 12px 22px 10px; display: flex; flex-direction: column; gap: 5px;
  background: ${c(0x14121f)}f0; border: 2px solid ${c(PALETTE.encre)}; box-shadow: inset 2px 2px 0 ${c(PALETTE.metalClair)}, inset -2px -2px 0 ${c(PALETTE.metal)}, inset 0 0 0 5px ${c(0x2a2540)}; }
#vaelmor-report h1 { margin: 0; text-align: center; font: 37.333px/1 "Vaelmor Jersey 10", Georgia, serif; color: ${c(PALETTE.lumiereDoree)}; text-shadow: 2px 2px 0 ${c(PALETTE.encre)}; font-weight: normal; }
#vaelmor-report .vr-sub { margin: 0 0 3px; text-align: center; color: ${c(PALETTE.metalClair)}; }
#vaelmor-report .vr-label { color: ${c(PALETTE.lumiereDoree)}; margin-top: 2px; }
#vaelmor-report .vr-row { display: flex; gap: 6px; flex-wrap: wrap; }
#vaelmor-report .vr-hint { color: ${c(PALETTE.metalClair)}; min-height: 1.15em; }
#vaelmor-report .vr-fine { color: ${c(PALETTE.metalClair)}; font: 16px/1.1 "Vaelmor Tiny5", monospace; }
#vaelmor-report button { font: inherit; color: ${c(PALETTE.parchemin)}; background: ${c(PALETTE.bleuNuit)}; border: 2px solid ${c(PALETTE.encre)}; box-shadow: inset 1px 1px 0 ${c(PALETTE.metalClair)}, inset -1px -1px 0 ${c(PALETTE.metal)};
  padding: 5px 12px 4px; cursor: pointer; border-radius: 0; }
#vaelmor-report button:hover { background: ${c(PALETTE.violetBrume)}; }
#vaelmor-report button:focus-visible, #vaelmor-report textarea:focus-visible { outline: 2px solid ${c(PALETTE.cyanEclat)}; outline-offset: 1px; }
#vaelmor-report button.on { background: ${c(PALETTE.violetBrume)}; color: ${c(PALETTE.lumiereDoree)}; box-shadow: inset 0 0 0 2px ${c(PALETTE.ambre)}; }
#vaelmor-report button.primary { background: ${c(PALETTE.vertProfond)}; color: ${c(PALETTE.parchemin)}; }
#vaelmor-report button.primary:hover { background: ${c(PALETTE.mousse)}; }
#vaelmor-report button.danger { background: ${c(PALETTE.brique)}; }
#vaelmor-report textarea { flex: 1 1 auto; min-height: 0; resize: none; box-sizing: border-box; width: 100%; padding: 6px 8px; font: inherit; color: ${c(PALETTE.parchemin)}; background: ${c(PALETTE.nuit)};
  border: 2px solid ${c(PALETTE.encre)}; box-shadow: inset 1px 1px 0 ${c(PALETTE.ombreViolette)}; border-radius: 0; }
#vaelmor-report textarea.mono { font: 15px/1.25 "Vaelmor Tiny5", ui-monospace, Consolas, monospace; letter-spacing: 0.02em; }
#vaelmor-report .vr-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 2px; }
#vaelmor-report .vr-spacer { flex: 1 1 auto; }
#vaelmor-report .vr-status { min-height: 1.15em; color: ${c(PALETTE.vertDore)}; }
#vaelmor-report .vr-status.err { color: ${c(PALETTE.braise)}; }
#vaelmor-report .vr-foot { text-align: center; color: ${c(PALETTE.desactive)}; font: 16px/1 "Vaelmor Tiny5", monospace; }
`;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function button(label: string, onClick: () => void, className = ''): HTMLButtonElement {
  const b = el('button', className, label);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

async function copyText(text: string, fallbackArea: HTMLTextAreaElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (!fallbackArea) return false;
    fallbackArea.focus();
    fallbackArea.select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    }
  }
}

function download(href: string, name: string): void {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
}

function downloadText(text: string, name: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  download(url, name);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Ouvre l'écran ; `capture` : image du jeu prise juste avant (ou null). `onClose` rend la main au jeu. */
export function openReportOverlay(game: Phaser.Game, capture: string | null, onClose: () => void): OpenedReport {
  current?.close();
  if (!document.getElementById(STYLE_ID)) {
    const style = el('style');
    style.id = STYLE_ID;
    style.textContent = css();
    document.head.append(style);
  }

  const root = el('div');
  root.id = 'vaelmor-report';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Signaler un problème');
  const stage = el('div', 'vr-stage');
  const panel = el('div', 'vr-panel');
  stage.append(panel);
  root.append(stage);

  // Le jeu ne doit rien recevoir de ce qui se passe ici (touches, souris, molette).
  const swallow = (event: Event): void => event.stopPropagation();
  for (const type of ['keydown', 'keyup', 'keypress', 'mousedown', 'mouseup', 'click', 'dblclick', 'pointerdown', 'pointerup', 'pointermove', 'wheel', 'contextmenu', 'touchstart', 'touchend']) {
    root.addEventListener(type, swallow);
  }
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' || event.key === 'F10') {
      event.preventDefault();
      close();
    }
  });

  const place = (): void => {
    const rect = game.canvas.getBoundingClientRect();
    const k = rect.width > 0 ? rect.width / CANVAS_WIDTH : 1;
    stage.style.left = `${rect.width > 0 ? rect.left : Math.max(0, (window.innerWidth - CANVAS_WIDTH) / 2)}px`;
    stage.style.top = `${rect.width > 0 ? rect.top : Math.max(0, (window.innerHeight - CANVAS_HEIGHT) / 2)}px`;
    stage.style.transform = `scale(${k})`;
  };
  place();
  window.addEventListener('resize', place);

  let view: View = 'form';
  let result: { id: number; report: string } | null = null;
  let exportText = '';
  let closed = false;

  function close(): void {
    if (closed) return;
    closed = true;
    window.removeEventListener('resize', place);
    root.remove();
    current = null;
    onClose();
  }

  function status(message: string, error = false): void {
    const line = panel.querySelector<HTMLElement>('.vr-status');
    if (!line) return;
    line.textContent = message;
    line.classList.toggle('err', error);
  }

  function render(): void {
    panel.replaceChildren();
    if (view === 'form') renderForm();
    else if (view === 'saved') renderSaved();
    else renderSession();
  }

  function renderForm(): void {
    panel.append(el('h1', '', 'Signaler un problème'), el('p', 'vr-sub', 'Rien n’est envoyé tout seul : tu enregistres, puis tu copies ou télécharges le rapport.'));

    panel.append(el('div', 'vr-label', 'Que veux-tu noter ?'));
    const kinds = el('div', 'vr-row');
    const hint = el('div', 'vr-hint', NOTE_KIND_HINT[draft.kind]);
    for (const kind of NOTE_KINDS) {
      const b = button(NOTE_KIND_LABEL[kind], () => {
        draft.kind = kind;
        render();
        panel.querySelector<HTMLTextAreaElement>('textarea')?.focus();
      }, kind === draft.kind ? 'on' : '');
      b.setAttribute('aria-pressed', String(kind === draft.kind));
      kinds.append(b);
    }
    panel.append(kinds, hint);

    if (draft.kind === 'bug') {
      panel.append(el('div', 'vr-label', 'Gravité (ton avis, l’auteur tranchera)'));
      const row = el('div', 'vr-row');
      const sevHint = el('div', 'vr-hint', draft.severity ? SEVERITY_HINT[draft.severity] : 'Laisse « Je ne sais pas » si tu hésites.');
      const options: (Severity | null)[] = [null, ...SEVERITIES];
      for (const sev of options) {
        const b = button(sev ? SEVERITY_LABEL[sev] : 'Je ne sais pas', () => {
          draft.severity = sev;
          render();
          panel.querySelector<HTMLTextAreaElement>('textarea')?.focus();
        }, sev === draft.severity ? 'on' : '');
        b.setAttribute('aria-pressed', String(sev === draft.severity));
        row.append(b);
      }
      panel.append(row, sevHint);
    }

    panel.append(el('div', 'vr-label', 'Que s’est-il passé ? Que faisais-tu juste avant ? Qu’attendais-tu ?'));
    const area = el('textarea');
    area.value = draft.text;
    area.maxLength = NOTE_TEXT_MAX;
    area.setAttribute('aria-label', 'Description du signalement');
    area.placeholder = 'Décris-le avec tes mots. Quelques phrases suffisent.';
    area.addEventListener('input', () => {
      draft.text = area.value;
    });
    panel.append(area);
    panel.append(el('div', 'vr-fine', `Sont joints : la version, tes réglages, le lieu, les scènes ouvertes et les ${REPORT_TAIL} dernières lignes du journal de jeu. Jamais ta sauvegarde ni ton adresse e-mail.`));

    const notes = getNotebook().entries.length;
    const actions = el('div', 'vr-actions');
    actions.append(
      button('Enregistrer', save, 'primary'),
      button('Fermer', close),
      el('span', 'vr-spacer'),
      button(`Exporter la session (${notes} signalement${notes > 1 ? 's' : ''})`, () => {
        exportText = sessionExportText();
        view = 'session';
        render();
      }),
    );
    panel.append(actions, el('div', 'vr-status'), el('div', 'vr-foot', 'Échap ou F10 : fermer — ce que tu as écrit est gardé'));
    area.focus();
  }

  function save(): void {
    const saved = recordNote({ kind: draft.kind, severity: draft.severity, text: draft.text });
    if (!saved.ok) {
      status(saved.message, true);
      panel.querySelector<HTMLTextAreaElement>('textarea')?.focus();
      return;
    }
    result = { id: saved.entry.id, report: saved.report };
    draft.text = '';
    draft.severity = null;
    view = 'saved';
    render();
  }

  /** Vue commune : un texte en lecture seule et ses actions. */
  function textView(title: string, intro: string, text: string, extra: HTMLElement[], fileName: string): void {
    panel.append(el('h1', '', title), el('p', 'vr-sub', intro));
    const area = el('textarea', 'mono');
    area.value = text;
    area.readOnly = true;
    area.setAttribute('aria-label', 'Texte à envoyer');
    panel.append(area);
    const actions = el('div', 'vr-actions');
    actions.append(
      button('Copier', () => {
        void copyText(text, area).then((ok) => status(ok ? 'Copié. Colle-le dans ton message à l’auteur.' : 'Copie impossible ici : utilise « Télécharger ».', !ok));
      }, 'primary'),
      button('Télécharger (.txt)', () => {
        downloadText(text, fileName);
        status(`Fichier « ${fileName} » téléchargé. Joins-le à ton message.`);
      }),
      ...extra,
    );
    panel.append(actions, el('div', 'vr-status'), el('div', 'vr-foot', 'Échap ou F10 : fermer'));
    actions.querySelector('button')?.focus();
  }

  function renderSaved(): void {
    const id = result?.id ?? 0;
    const now = new Date().toISOString();
    const extra: HTMLElement[] = [];
    if (capture) {
      extra.push(
        button('Télécharger la capture (.png)', () => {
          download(capture, reportFileName('capture', now, id));
          status('Capture téléchargée : joins-la aussi à ton message.');
        }),
      );
    }
    extra.push(el('span', 'vr-spacer'), button('Nouveau signalement', () => {
      view = 'form';
      render();
    }), button('Fermer', close));
    textView(`Signalement n° ${id} enregistré`, 'Voici exactement ce que tu enverras. Tu peux le relire avant de le copier.', result?.report ?? '', extra, reportFileName('signalement', now, id));
  }

  function renderSession(): void {
    let armed = false;
    const clear = button('Vider le carnet', () => {
      if (!armed) {
        armed = true;
        clear.textContent = 'Sûr ? Cliquer encore';
        clear.classList.add('danger');
        return;
      }
      clearTestkit();
      exportText = sessionExportText();
      view = 'session';
      render();
      status('Carnet et journal vidés : une nouvelle session de test commence.');
    });
    const counts = countByKind(getNotebook());
    const total = getNotebook().entries.length;
    textView(
      'Exporter la session',
      total > 0 ? `À faire en fin de session. Ton carnet : ${total} signalement${total > 1 ? 's' : ''} (${counts.bug} problème${counts.bug > 1 ? 's' : ''}).` : 'À faire en fin de session. Ton carnet est vide pour l’instant.',
      exportText,
      [el('span', 'vr-spacer'), clear, button('Retour', () => {
        view = 'form';
        render();
      }), button('Fermer', close)],
      reportFileName('session', new Date().toISOString()),
    );
  }

  render();
  document.body.append(root);
  // Le focus ne prend qu'une fois l'écran dans la page : le champ de texte, ou à défaut le bouton principal.
  (panel.querySelector<HTMLElement>('textarea:not([readonly])') ?? panel.querySelector<HTMLElement>('button.primary'))?.focus();
  current = { close };
  return current;
}
