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
 // v17.25 · le trousseau de la némésis (cadrage N10a) : un crâne par mort face à lui, au plus max, pendus à sa hanche en éventail.
 // Réglages seulement : le dessin du crâne viendra à l'action 5a. taille : hauteur d'un crâne en rayons du corps, bornée de min à maxPx
 // (essais de l'action 5a : sous 12 px il se lit comme une tache, d'où 12 à 16 px) ;
 // hanche : point d'attache en rayons du corps (côté, bas) ; eventail : écart entre deux crânes (degrés) ; chaine : longueur (px) ;
 // balancement : amplitude (degrés, figé pendant ses chargements et en mouvements réduits) ; lueur : orbites (r,g,b), jamais de rouge.
 crane:{max:5,taille:0.5,min:12,maxPx:16,hanche:[0.85,0.25],eventail:24,chaine:6,balancement:8,lueur:'205,180,255',
  // v17.25 (action 5a) · le dessin du crâne, repère 40 × 46 (centre 20, 23), un peu de trois quarts : orbite gauche plus grande, nez décalé.
  // Ivoire ombré (lumière en haut à gauche, comme le jeu), creux sombres, mâchoire séparée par un trait, lueur lavande au fond des orbites.
  // Jamais de rouge. Le même dessin sert au SVG (svgCrane : carte, porte, écran de mort) et au jeu (peindreCrane, posé une fois hors écran).
  vb:[40,46],
  tete:'M20 2C9.5 2 3.5 9.5 3.5 18.5C3.5 24.5 5.5 28.5 8.5 30.8L8.8 35.2C9 37.2 10.6 38.4 12.6 38.4L27.6 38.4C29.6 38.4 31.1 37.2 31.3 35.2L31.6 30.6C34.6 28.3 36.4 24.3 36.4 18.5C36.4 9.5 30.5 2 20 2Z',
  machoire:'M11.6 40.2L28.6 40.2C28.6 43 25.6 45.4 20.1 45.4C14.6 45.4 11.6 43 11.6 40.2Z',
  orbites:['M8.2 19.6C8 15.3 11.4 13.8 14.6 14.6C17.9 15.5 18.6 19.6 17.4 22.8C15.6 25.6 8.6 24.6 8.2 19.6Z','M22.6 16.6C25.6 14.2 30.6 14.8 30.9 19.2C31.1 23.2 26.6 24.6 24.4 22.6C22.2 20.6 21.6 17.6 22.6 16.6Z'],
  nez:'M19.4 25.4L16.9 30.9Q19.2 32.2 21.8 31Z',
  dents:[[14.6,35.6,14.6,42.2],[17.6,36,17.6,43.4],[20.6,36,20.6,43.6],[23.6,36,23.6,43.2],[26.4,35.6,26.4,42]],
  reflet:'M10.5 9.5C13 5.5 17 4.2 20.5 4.4',
  couleurs:{clair:'#fbf4e2',os:'#d9cdac',ombre:'#7a6d57',trait:'#17110d',creux:'#120d0b',nez:'#2a1f17'}},
 // éclats quand il se brise : quatre morceaux qui recouvrent le contour, et la direction où chacun part
 eclats:[
  {d:'M9 42C10 24 24 13 40 12L50 1L50 39L45 46L28 44L9 46Z',dir:[-1,-1]},
  {d:'M91 42C90 24 76 13 60 12L50 1L50 39L56 50L76 60L92 56Z',dir:[1,-1]},
  {d:'M9 46L28 44L45 46L50 39L56 50L49 74L44 96L50 118C22 95 7 68 9 46Z',dir:[-1,1]},
  {d:'M92 56L76 60L56 50L49 74L44 96L50 118C78 95 92 70 92 56Z',dir:[1,1]}],
 // SVG du masque (annonce, écran de fin, wiki). col : couleurs (data/bestiaire.js, assemble.masque.couleurs) ;
 // etat : 'calme' | 'charge' (yeux allumés) | 'fissure' (mi-vie) | 'brise'. id : préfixe unique des dégradés.
 // v17.25 · le crâne en SVG. id : préfixe unique des dégradés ; label : texte pour les lecteurs d'écran (vide : décoratif).
 svgCrane(id,label){const C=this.crane,K=C.couleurs,k=id||'crn',[w,h]=C.vb;
  return `<svg viewBox="-3 -3 ${w+6} ${h+6}" xmlns="http://www.w3.org/2000/svg" ${label?`role="img" aria-label="${label}"`:'aria-hidden="true"'}>`
   +`<defs><radialGradient id="${k}o" cx="0.34" cy="0.26" r="0.85"><stop offset="0" stop-color="${K.clair}"/><stop offset="0.5" stop-color="${K.os}"/><stop offset="1" stop-color="${K.ombre}"/></radialGradient>`
   +`<radialGradient id="${k}l" cx="0.5" cy="0.55" r="0.5"><stop offset="0" stop-color="rgb(${C.lueur})" stop-opacity="0.85"/><stop offset="1" stop-color="rgb(${C.lueur})" stop-opacity="0"/></radialGradient></defs>`
   +`<ellipse cx="20" cy="46.5" rx="11" ry="2" fill="#000" opacity="0.35"/>`
   +`<path d="${C.machoire}" fill="url(#${k}o)" stroke="${K.trait}" stroke-width="2.2" stroke-linejoin="round"/>`
   +`<path d="${C.tete}" fill="url(#${k}o)" stroke="${K.trait}" stroke-width="2.2" stroke-linejoin="round"/>`
   +C.orbites.map(d=>`<path d="${d}" fill="${K.creux}"/>`).join('')
   +C.orbites.map((d,i)=>`<circle cx="${i?26.6:13}" cy="${i?19.4:19.8}" r="${i?3.2:4}" fill="url(#${k}l)"/>`).join('')
   +`<path d="${C.nez}" fill="${K.nez}"/>`
   +C.dents.map(([x1,y1,x2,y2])=>`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${K.trait}" stroke-width="1.1" opacity="0.75"/>`).join('')
   +`<path d="${C.reflet}" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity="0.55"/></svg>`;},
 // v17.25 · le crâne peint sur un canevas (le jeu le peint une fois hors écran, puis le pose). c : contexte 2D ; (x, y) : centre ; h : hauteur (px).
 // Le trait garde ~1 px quelle que soit la taille ; sous 12 px, les dents s'effacent (elles feraient une tache).
 peindreCrane(c,x,y,h){const C=this.crane,K=C.couleurs,[w,H]=C.vb,s=h/H,P=this._cranePaths||(this._cranePaths={tete:new Path2D(C.tete),machoire:new Path2D(C.machoire),orbites:C.orbites.map(d=>new Path2D(d)),nez:new Path2D(C.nez),reflet:new Path2D(C.reflet)});
  c.save();c.translate(x-w/2*s,y-H/2*s);c.scale(s,s);
  c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.ellipse(20,46.5,11,2,0,0,Math.PI*2);c.fill();
  const g=c.createRadialGradient(13.6,12,1,13.6,12,34);g.addColorStop(0,K.clair);g.addColorStop(0.5,K.os);g.addColorStop(1,K.ombre);
  c.lineJoin='round';c.strokeStyle=K.trait;c.lineWidth=Math.max(1.6,1.15/s);
  for(const p of [P.machoire,P.tete]){c.fillStyle=g;c.fill(p);c.stroke(p);}
  c.fillStyle=K.creux;for(const p of P.orbites)c.fill(p);
  [[13,19.8,4],[26.6,19.4,3.2]].forEach(([cx,cy,r])=>{const l=c.createRadialGradient(cx,cy+0.6,0,cx,cy+0.6,r);l.addColorStop(0,`rgba(${C.lueur},.85)`);l.addColorStop(1,`rgba(${C.lueur},0)`);c.fillStyle=l;c.beginPath();c.arc(cx,cy+0.6,r,0,Math.PI*2);c.fill();});
  c.fillStyle=K.nez;c.fill(P.nez);
  if(h>=12){c.strokeStyle=K.trait;c.globalAlpha=0.7;c.lineWidth=Math.max(1,0.8/s);c.beginPath();for(const [x1,y1,x2,y2] of C.dents){c.moveTo(x1,y1);c.lineTo(x2,y2);}c.stroke();c.globalAlpha=1;}
  c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=Math.max(1.4,0.9/s);c.lineCap='round';c.stroke(P.reflet);
  c.restore();},
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
