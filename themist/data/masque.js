// La Brume · le masque du Masqué (élite assemblé)
// Source unique du dessin : le jeu le trace sur l'ennemi (Path2D, index.html), l'annonce et l'écran de fin
// le montrent en SVG, le wiki le reprend (outils/wiki.mjs). Repère : 100 × 120, centre du visage en (50, 56).
// Les couleurs, la taille en jeu et les seuils d'état sont dans data/bestiaire.js (assemble.masque).
(function(D){D.masque={
 vb:[100,120],
 centre:[50,56],
 // silhouette : front large sous une crête en pointe, joues creusées sous les yeux, long menton en pointe
 contour:'M9 40C9 22 24 12 40 11L50 0L60 11C76 12 91 22 91 40C91 52 86 60 79 66C74 71 70 80 64 92C59 103 55 111 50 119C45 111 41 103 36 92C30 80 26 71 21 66C14 60 9 52 9 40Z',
 // deux orbites en biais, coin intérieur plus bas : un regard fixe, sans pupille humaine
 yeux:['M14 47C22 37 37 39 46 55C34 58 21 56 14 47Z','M86 47C78 37 63 39 54 55C66 58 79 56 86 47Z'],
 // points de lumière au fond des orbites
 lueurs:[[33,48.5,3.6],[67,48.5,3.6]],
 // la marque du front, sous la crête : un losange fermé
 front:'M50 17L55 28L50 39L45 28Z',
 // une coulure sous chaque œil (pas de bouche)
 sillons:['M30.5 59L36 59L33.5 86Z','M69.5 59L64 59L66.5 86Z'],
 // fissures qui apparaissent à mi-vie
 fissures:['M40 11L36 21L41 28L34 36L37 43','M29 57L24 64L28 71L25 76','M75 70L68 76L71 84'],
 // points de couture : le masque est cousu de force sur la tête (tempes, joues, menton). [x, y, angle du point en degrés]
 coutures:[[12,44,-20],[88,44,20],[24,70,-40],[76,70,40],[50,113,90],[50,4,90]],
 // éclats quand il se brise : quatre morceaux qui recouvrent le contour, et la direction où chacun part
 eclats:[
  {d:'M9 42C10 24 24 13 40 12L50 1L50 39L45 46L28 44L9 46Z',dir:[-1,-1]},
  {d:'M91 42C90 24 76 13 60 12L50 1L50 39L56 50L76 60L92 56Z',dir:[1,-1]},
  {d:'M9 46L28 44L45 46L50 39L56 50L49 74L44 96L50 118C22 95 7 68 9 46Z',dir:[-1,1]},
  {d:'M92 56L76 60L56 50L49 74L44 96L50 118C78 95 92 70 92 56Z',dir:[1,1]}],
 // SVG du masque (annonce, écran de fin, wiki). col : couleurs (data/bestiaire.js, assemble.masque.couleurs) ;
 // etat : 'calme' | 'charge' (yeux allumés) | 'fissure' (mi-vie) | 'brise'. id : préfixe unique des dégradés.
 svg(col,etat,id,label){
  const M=this,k=id||'msq',lit=etat==='charge',fis=etat==='fissure'||etat==='brise',oeil=lit?col.oeilVif:col.oeil;
  const p=(d,a)=>`<path d="${d}" ${a}/>`;
  const face=p(M.contour,`fill="url(#${k}g)"`)
   +p(M.front,`fill="${col.creux}"`)
   +M.sillons.map(d=>p(d,`fill="${col.creux}"`)).join('')
   +M.yeux.map(d=>p(d,`fill="${col.creux}"`)).join('')
   +`<g filter="url(#${k}f)">${M.lueurs.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r*(lit?1.9:1.3)}" fill="${oeil}"/>`).join('')}</g>`
   +M.lueurs.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r*(lit?1:0.75)}" fill="${lit?'#fff':oeil}"/>`).join('')
   +M.coutures.map(([x,y,a])=>`<g transform="translate(${x} ${y}) rotate(${a})"><path d="M-6 -4L6 4M-6 4L6 -4" stroke="${col.trait}" stroke-width="3.4" stroke-linecap="round"/><path d="M-6 -4L6 4M-6 4L6 -4" stroke="${col.fil||col.fissure}" stroke-width="1.3" stroke-linecap="round"/></g>`).join('')
   +(fis?M.fissures.map(d=>p(d,`fill="none" stroke="${col.trait}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"`)+p(d,`fill="none" stroke="${col.fissure}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"`)).join(''):'');
  const halo=`<g filter="url(#${k}f)" opacity="${lit?0.9:0.45}">${M.yeux.map(d=>p(d,`fill="${oeil}"`)).join('')}</g>`;
  const corps=etat==='brise'
   ?M.eclats.map((e,i)=>`<clipPath id="${k}c${i}"><path d="${e.d}"/></clipPath><g transform="translate(${e.dir[0]*5} ${e.dir[1]*5})">${p(e.d,`fill="none" stroke="${col.trait}" stroke-width="5" stroke-linejoin="round"`)}<g clip-path="url(#${k}c${i})">${face}</g></g>`).join('')
   :p(M.contour,`fill="none" stroke="${col.trait}" stroke-width="5" stroke-linejoin="round"`)+face;
  return `<svg viewBox="-6 -6 ${M.vb[0]+12} ${M.vb[1]+12}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label||'Le masque du Masqué'}">`
   +`<defs><linearGradient id="${k}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col.haut}"/><stop offset="1" stop-color="${col.bas}"/></linearGradient>`
   +`<filter id="${k}f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${lit?3.4:2.2}"/></filter></defs>`
   +halo+corps+`</svg>`;}
};})(window.BRUME_DATA=window.BRUME_DATA||{});
