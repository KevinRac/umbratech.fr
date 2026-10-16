/**
 * Écran d'erreur bloquante, en HTML (indépendant de Phaser et des polices
 * pixel, qui peuvent justement être la cause de l'erreur).
 */
export function showFatalError(title: string, details: readonly string[] = []): void {
  console.error(`[Vaelmor] ${title}`, details);
  document.getElementById('vaelmor-fatal')?.remove();

  const box = document.createElement('div');
  box.id = 'vaelmor-fatal';
  box.setAttribute('role', 'alert');

  const h = document.createElement('h1');
  h.textContent = title;
  box.append(h);

  if (details.length > 0) {
    const list = document.createElement('ul');
    for (const d of details.slice(0, 20)) {
      const li = document.createElement('li');
      li.textContent = d;
      list.append(li);
    }
    if (details.length > 20) {
      const li = document.createElement('li');
      li.textContent = `… et ${details.length - 20} autre(s).`;
      list.append(li);
    }
    box.append(list);
  }

  const hint = document.createElement('p');
  hint.textContent = 'Rechargez la page. Si le problème persiste, signalez-le avec ce message.';
  box.append(hint);

  document.body.append(box);
}
