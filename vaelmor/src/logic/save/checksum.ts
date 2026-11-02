/**
 * Somme de contrôle des sauvegardes (GDD §14.2, décision n°151).
 *
 * FNV-1a 32 bits sur le JSON canonique (clés d'objets triées) : la même donnée
 * donne toujours la même somme, quel que soit l'ordre d'écriture des clés.
 * Elle détecte une sauvegarde abîmée (écriture coupée, fichier retouché à la
 * main), pas la triche : ce n'est pas une signature. Module pur.
 */

/** JSON canonique : clés triées à tous les niveaux, aucune espace. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) out[key] = sortKeys(v);
    }
    return out;
  }
  return value;
}

/** FNV-1a 32 bits sur les unités UTF-16 d'une chaîne, en 8 chiffres hexadécimaux. */
export function fnv1a32(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** Somme d'une valeur quelconque (sur son JSON canonique). */
export const checksumOf = (value: unknown): string => fnv1a32(canonicalJson(value));
