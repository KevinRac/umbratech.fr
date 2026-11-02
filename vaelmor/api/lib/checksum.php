<?php
declare(strict_types=1);

/**
 * Somme de contrôle des sauvegardes, identique à celle du jeu
 * (src/logic/save/checksum.ts, décision n°151) : FNV-1a 32 bits sur les
 * unités UTF-16 du JSON canonique (clés d'objets triées, aucune espace).
 * Le JSON est décodé en objets (et non en tableaux associatifs) pour qu'un
 * objet vide `{}` reste `{}` ; les nombres sont réécrits comme JavaScript.
 */

function canonical_json(mixed $v): string
{
    if ($v instanceof stdClass) {
        $props = get_object_vars($v);
        ksort($props, SORT_STRING);
        $parts = [];
        foreach ($props as $k => $x) $parts[] = js_string((string) $k) . ':' . canonical_json($x);
        return '{' . implode(',', $parts) . '}';
    }
    if (is_array($v)) return '[' . implode(',', array_map('canonical_json', $v)) . ']';
    if (is_string($v)) return js_string($v);
    if (is_bool($v)) return $v ? 'true' : 'false';
    if ($v === null) return 'null';
    return js_number((float) $v);
}

/** Chaîne JSON comme JSON.stringify : seuls ", \ et les caractères de contrôle sont échappés. */
function js_string(string $s): string
{
    $out = json_encode($s, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_LINE_TERMINATORS);
    if ($out === false) throw new RuntimeException('chaîne invalide');
    return $out;
}

/**
 * Nombre comme JavaScript (Number.prototype.toString, ECMA-262 §6.1.6.1.20) :
 * les chiffres les plus courts qui redonnent le nombre, puis la notation
 * décimale entre 1e-6 et 1e21, exponentielle au-delà.
 */
function js_number(float $f): string
{
    if (!is_finite($f)) return 'null';
    if ($f == 0.0) return '0';
    $sign = $f < 0 ? '-' : '';
    // Chiffres les plus courts (serialize_precision = -1) : « 520.5 », « 1.0e-6 », « 1.0e+21 ».
    $s = strtolower((string) json_encode(abs($f)));
    $exp = 0;
    if (str_contains($s, 'e')) {
        [$s, $e] = explode('e', $s);
        $exp = (int) $e;
    }
    [$int, $frac] = array_pad(explode('.', $s), 2, '');
    $all = $int . $frac;
    $lead = strlen($all) - strlen(ltrim($all, '0'));
    $digits = rtrim(ltrim($all, '0'), '0');
    $k = strlen($digits);
    $n = strlen($int) + $exp - $lead; // valeur = 0,digits × 10^n
    if ($k <= $n && $n <= 21) return $sign . $digits . str_repeat('0', $n - $k);
    if (0 < $n && $n <= 21) return $sign . substr($digits, 0, $n) . '.' . substr($digits, $n);
    if (-6 < $n && $n <= 0) return $sign . '0.' . str_repeat('0', -$n) . $digits;
    $e = $n - 1;
    $mant = $k === 1 ? $digits : $digits[0] . '.' . substr($digits, 1);
    return $sign . $mant . 'e' . ($e < 0 ? '-' : '+') . abs($e);
}

/** FNV-1a 32 bits sur les unités UTF-16 (comme charCodeAt en JavaScript), 8 chiffres hexadécimaux. */
function fnv1a32(string $utf8): string
{
    $u16 = mb_convert_encoding($utf8, 'UTF-16BE', 'UTF-8');
    $h = 0x811c9dc5;
    $n = strlen($u16);
    for ($i = 0; $i < $n; $i += 2) {
        $h ^= (ord($u16[$i]) << 8) | ord($u16[$i + 1]);
        $h = ($h * 0x01000193) & 0xffffffff;
    }
    return str_pad(dechex($h), 8, '0', STR_PAD_LEFT);
}

/** Somme d'une enveloppe décodée (objet) : tout sauf le champ `checksum`. */
function envelope_checksum(stdClass $env): string
{
    $copy = clone $env;
    unset($copy->checksum);
    return fnv1a32(canonical_json($copy));
}
