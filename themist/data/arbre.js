// La Brume · l'arbre de talents : géométrie et dessin
// Source unique : le jeu (index.html : montée de niveau et pause) ET le wiki (wiki.html, via outils/wiki.mjs)
// dessinent l'arbre avec ce fichier, donc le wiki montre exactement l'arbre du jeu.
// La géométrie (positions et liens des nœuds) se règle ici. Les noms, textes, rangs et genres des talents
// restent dans data/talents.js ; les effets (apply) et les verrous de cohérence dans index.html.
// Le dessin ne dépend d'aucun DOM : il renvoie du texte SVG (utilisable par Node comme par le navigateur).
(function(D){
 // talents.js peut se charger après ce fichier : on lit ses données à l'usage
 const T=new Proxy({},{get:(_,k)=>D.talents[k]}),TC=450;
 const G={
  // Un nœud est placé par [profondeur, décalage latéral] le long de l'axe de sa branche (angle dans talents.js)
  pas:{base:48,prof:66,lat:56},
  anneaux:[114,246,378],
  principal:{
   slots:{n1:[1,0],n2:[1.9,-1.3],n3:[1.9,1.3],x1a:[2.8,-0.7],x1b:[2.8,0.7],n4:[3.3,-2],n5:[3.3,2],x2a:[3.8,-0.7],x2b:[3.8,0.7],n6:[4.3,0],x3a:[4.95,-0.75],x3b:[4.95,0.75],k1:[4.6,-2.15],k2:[4.6,2.15]},
   aretes:[['root','n1'],['n1','n2'],['n1','n3'],['n2','x1a'],['n3','x1b'],['n2','n4'],['n3','n5'],['x1a','x2a'],['x1b','x2b'],['n4','n6'],['n5','n6'],['x2a','x3a'],['x2b','x3b'],['n4','k1'],['n5','k2']]},
  voie:{
   slots:{s1:[1,0],s2:[2,-0.85],s3:[2,0.85],s4:[3,-0.85],s5:[3,0.85],sk:[4,0]},
   aretes:[['root','s1'],['s1','s2'],['s1','s3'],['s2','s4'],['s3','s5'],['s4','sk'],['s5','sk']]}
 };
 const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 const f1=n=>n.toFixed(1);
 const brOf=id=>id.split('_')[0],slotOf=id=>id.slice(id.indexOf('_')+1);
 const branchesOf=cls=>Object.keys(T.branches).filter(b=>T.branches[b].cls===cls);
 const idsOf=cls=>Object.keys(T.noeuds).filter(id=>T.branches[brOf(id)].cls===cls);
 function pos(id){
  if(id==='root')return[TC,TC];
  const b=T.branches[brOf(id)],sl=(b.sub?G.voie:G.principal).slots[slotOf(id)];
  const a=b.ang*Math.PI/180,dx=Math.cos(a),dy=Math.sin(a),rad=G.pas.base+sl[0]*G.pas.prof,lat=sl[1]*G.pas.lat;
  return[TC+dx*rad-dy*lat,TC+dy*rad+dx*lat];
 }
 const idOf=(br,s)=>s==='root'?'root':br+'_'+s;
 function aretes(cls){
  const out=[];
  for(const br of branchesOf(cls))for(const [a,b] of (T.branches[br].sub?G.voie:G.principal).aretes)out.push([idOf(br,a),idOf(br,b),br]);
  return out;
 }
 // Vue d'une branche : on la « déplie » vers le haut (rotation autour du centre) et on cadre dessus.
 const rot=(x,y,t)=>{const c=Math.cos(t*Math.PI/180),s=Math.sin(t*Math.PI/180),dx=x-TC,dy=y-TC;return[TC+dx*c-dy*s,TC+dx*s+dy*c];};
 const angle=br=>{let t=-90-T.branches[br].ang;while(t>180)t-=360;while(t<=-180)t+=360;return t;};
 function cadre(cls,br){
  if(!br||br==='tout')return{x:40,y:0,w:820,h:828,t:0};
  const t=angle(br),pts=[[TC,TC],...idsOf(cls).filter(id=>brOf(id)===br).map(id=>rot(...pos(id),t)),[TC,TC-(T.branches[br].sub?372:440)]];
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const [x,y] of pts){x0=Math.min(x0,x-70);x1=Math.max(x1,x+70);y0=Math.min(y0,y-30);y1=Math.max(y1,y+54);}
  y0-=14; // titre de la branche, au-dessus
  const s=Math.max(x1-x0,y1-y0,360),cx=(x0+x1)/2,cy=(y0+y1)/2;
  return{x:cx-s/2,y:cy-s/2,w:s,h:s,t};
 }
 // Toutes les vues d'une forme, prêtes pour vue() : {tout:{f:[x,y,w,h],t}, ray:{…}, …}
 function vues(cls){
  const o={};for(const br of ['tout',...branchesOf(cls)]){const c=cadre(cls,br);o[br]={f:[c.x,c.y,c.w,c.h].map(v=>Math.round(v*10)/10),t:Math.round(c.t*100)/100};}
  return o;
 }
 // Animation de zoom : fonction autonome (le wiki en embarque le texte tel quel).
 // svg : l'arbre dessiné par dessiner() · V : vues(cls) · renvoie {zoomTo(br,instant), get focus()}
 function vue(svg,V,onZoom){
  let cur={f:V.tout.f.slice(),t:0},raf=0,focus='tout';
  const apply=()=>{
   svg.setAttribute('viewBox',cur.f.map(v=>v.toFixed(1)).join(' '));
   const t=cur.t.toFixed(2);
   svg.querySelectorAll('.world').forEach(w=>w.setAttribute('transform','rotate('+t+' 450 450)'));
   svg.querySelectorAll('.up').forEach(u=>u.setAttribute('transform','rotate('+(-cur.t).toFixed(2)+' '+(u.getAttribute('data-x')||0)+' '+(u.getAttribute('data-y')||0)+')'));
  };
  function zoomTo(br,instant){
   const T2=V[br]||V.tout,from={f:cur.f.slice(),t:cur.t},t0=performance.now();
   focus=V[br]?br:'tout';cancelAnimationFrame(raf);
   svg.classList.toggle('zoom',focus!=='tout');
   svg.querySelectorAll('[data-br]').forEach(e=>e.classList.toggle('dim',focus!=='tout'&&e.getAttribute('data-br')!==focus));
   svg.querySelectorAll('.ar-b.ov').forEach(e=>{const sub=!!svg.querySelector('.ar-b.zl[data-br="'+e.getAttribute('data-br')+'"]');e.classList.toggle('sub-hide',sub&&focus===e.getAttribute('data-br'));});
   if(onZoom)onZoom(focus);
   if(instant||matchMedia('(prefers-reduced-motion: reduce)').matches){cur={f:T2.f.slice(),t:T2.t};apply();return;}
   const step=now=>{let k=Math.min(1,(now-t0)/320);k=k*k*(3-2*k);
    cur={f:from.f.map((v,i)=>v+(T2.f[i]-v)*k),t:from.t+(T2.t-from.t)*k};apply();if(k<1)raf=requestAnimationFrame(step);};
   raf=requestAnimationFrame(step);
  }
  return{zoomTo,get focus(){return focus;}};
 }
 // Nom sur une ou deux lignes
 function lignes(nom){
  if(nom.length<=12||nom.indexOf(' ')<0)return[nom];
  const mots=nom.split(' ');let best=null;
  for(let i=1;i<mots.length;i++){const a=mots.slice(0,i).join(' '),b=mots.slice(i).join(' '),d=Math.abs(a.length-b.length);if(!best||d<best.d)best={d,l:[a,b]};}
  return best.l;
 }
 const GLY={
  m:'<circle class="halo" r="16"/><circle class="sh" r="9.5"/>',
  s:'<circle class="halo" r="23"/><circle class="sh" r="15"/><circle class="in" r="5.5"/>',
  k:'<rect class="halo" x="-21" y="-21" width="42" height="42" transform="rotate(45)"/><rect class="sh" x="-14" y="-14" width="28" height="28" transform="rotate(45)"/><circle class="in" r="4.5"/>',
  c:'<circle class="halo" r="26"/><circle class="sh" r="18"/><circle class="in" r="9"/>',
  x:l=>`<rect class="halo" x="-26" y="-26" width="52" height="52" rx="6"/><rect class="sh xs" x="-17" y="-17" width="34" height="34" rx="4" transform="rotate(45)"/><text class="xl" text-anchor="middle" y="5">${l}</text>`
 };
 const RK={m:26,s:32,x:36,k:36,c:40};
 // o.cls : forme · o.etat(id) → {r,rk,av,sealed,excl,offer,sel,hl,t,off} (jeu ; t : oublié, encore tracé ; off : en mémoire mais éteint) · o.statique : tout révélé (wiki)
 // o.scelle(br) : voie non choisie · o.pref : préfixe des id des nœuds
 // Les nœuds sont dans <g class="world"> (qui pivote pour déplier une branche) ; leur contenu, dans <g class="up">
 // (qui contre-pivote, pour que les noms restent droits). Voir vue().
 function dessiner(o){
  const cls=o.cls,F=T.formes[cls],etat=o.etat||(()=>({})),st=!!o.statique;
  let s=`<svg class="ar" data-cls="${cls}" viewBox="40 0 820 828" role="group" aria-label="Arbre de talents : ${esc(F.short)}">`;
  s+=G.anneaux.map(r=>`<circle class="ar-ring" cx="${TC}" cy="${TC}" r="${r}"/>`).join('');
  s+='<g class="world">';
  for(const [a,b,br] of aretes(cls)){
   const pa=pos(a),pb=pos(b),B=T.branches[br],sealed=!st&&B.sub&&o.scelle&&o.scelle(br);
   const R=id=>{if(id==='root')return 1;const e=etat(id)||{};return e.r||e.t;},onR=st||!!(R(a)&&R(b)),av=!onR&&!sealed&&!!(R(a)||R(b));
   s+=`<line class="ar-e${onR?' on':av?' av':''}${sealed?' sealed':''}" data-br="${br}" x1="${f1(pa[0])}" y1="${f1(pa[1])}" x2="${f1(pb[0])}" y2="${f1(pb[1])}" style="--c:${B.color}"/>`;
  }
  // titres de branche (cliquables pour zoomer). Les voies ont un titre de vue d'ensemble (près du centre, dans un
  // quart libre) et un titre de zoom, posé au bout de l'axe de la branche et visible seulement quand on la déplie.
  const titre=(br,cl,x,y,sealed)=>{
   const B=T.branches[br];
   return `<g class="ar-b ${cl}${sealed?' sealed':''}" data-br="${br}" style="--c:${B.color}"><g class="up" data-x="${f1(x)}" data-y="${f1(y)}"><text class="bl" x="${f1(x)}" y="${f1(y)}" text-anchor="middle">${esc(B.name)}</text>`
    +(B.sub?`<text class="bls" x="${f1(x)}" y="${f1(y+19)}" text-anchor="middle">${sealed?'Scellé · ':''}${esc(B.voie)}</text>`:'')+`</g></g>`;
  };
  for(const br of branchesOf(cls)){
   const B=T.branches[br],a=B.ang*Math.PI/180,sealed=!st&&B.sub&&o.scelle&&o.scelle(br);
   // voie du bas (troisième sous-classe) : titre d'ensemble sous son dernier nœud ; voies latérales : dans un quart libre du haut
   if(B.sub){s+=(Math.sin(a)>0.5?titre(br,'ov',TC,TC+352,sealed):titre(br,'ov',TC+Math.cos(a)*252,TC-100,sealed))+titre(br,'zl',TC+Math.cos(a)*372,TC+Math.sin(a)*372+8,sealed);}
   else{const R=B.ang===-90?434:452;s+=titre(br,'ov',TC+Math.cos(a)*R,TC+Math.sin(a)*R+(B.ang===-90?10:8),false);}
  }
  const er=etat('root')||{};
  s+=`<g class="ar-n own root${er.sel?' sel':''}${er.hl?' hl':''}" data-id="root" tabindex="0" role="button" aria-label="${esc(F.root)}" transform="translate(${TC} ${TC})" style="--c:${F.color}"><g class="up"><circle class="hit" r="30"/><circle class="halo" r="30"/><circle class="sh" r="21"/><path d="M0 -12 L3 -3 L12 0 L3 3 L0 12 L-3 3 L-12 0 L-3 -3Z" fill="#0c0e15"/></g></g>`;
  const RAY={m:10,s:16,x:24,k:20,c:19};
  for(const id of idsOf(cls)){
   const n=T.noeuds[id],br=brOf(id),B=T.branches[br],[x,y]=pos(id),e=etat(id)||{},lat=(B.sub?G.voie:G.principal).slots[slotOf(id)][1];
   const c=['ar-n'];
   if(st)c.push('av');else{if(e.r)c.push('own');else if(e.t)c.push('oub');else if(e.av)c.push('av');if(e.off)c.push('off');if(e.sealed)c.push('sealed');if(e.excl)c.push('excl');}
   if(e.offer)c.push('offer');if(e.sel)c.push('sel');if(e.hl)c.push('hl');
   const gl=n.k==='x'?GLY.x(id.endsWith('a')?'A':'B'):GLY[n.k]||GLY.c,rk=e.rk!=null?e.rk:'',ry=RK[n.k]||36,rr=RAY[n.k]||19;
   // nom : de côté, vers l'extérieur de la branche
   // (sur l'axe, le nom va à droite sur une seule ligne : c'est le seul endroit libre entre les majeurs A et B)
   const side=lat<-0.05?'l':'r',ls=lat>-0.05&&lat<0.05?[n.name]:lignes(n.name);
   const tx=side==='r'?rr+7:-(rr+7),ty=4-(ls.length-1)*6.5,an=side==='r'?'start':'end';
   s+=`<g class="${c.join(' ')}" id="${(o.pref||'tn-')+id}" data-id="${id}" data-br="${br}" tabindex="0" role="button" aria-label="${esc(n.name)}" transform="translate(${f1(x)} ${f1(y)})" style="--c:${B.color}"><g class="up"><circle class="hit" r="26"/>${gl}`
    +(rk?`<text class="rk" text-anchor="middle" y="${ry}">${esc(rk)}</text>`:'')
    +`<text class="nm" text-anchor="${an}" x="${tx}" y="${ty}">${ls.map((l,i)=>`<tspan x="${tx}" dy="${i?13:0}">${esc(l)}</tspan>`).join('')}</text></g></g>`;
  }
  return s+'</g></svg>';
 }
 // Légende : genres de nœud (et états, si o.etats)
 function legende(o){
  o=o||{};
  const sym=(g,c)=>`<svg viewBox="-30 -30 60 60" width="24" height="24" class="ar-n av" style="--c:${c||'#cfc7b3'}" aria-hidden="true">${g}</svg>`;
  const it=(g,t)=>`<li>${sym(g)}<span>${t}</span></li>`;
  const K=T.genres;
  let h=`<ul class="ar-leg">${it(GLY.m,K.m)}${it(GLY.s,K.s)}${it(GLY.x('A'),'Majeur A ou B')}${it(GLY.k,K.k)}${it(GLY.c,'Racine d’une voie')}`;
  if(o.etats){
   h+=`<li class="sep"></li><li><svg viewBox="-30 -30 60 60" width="24" height="24" class="ar-n own" style="--c:#cfc7b3" aria-hidden="true">${GLY.s}</svg><span>Acquis</span></li>`
    +`<li><svg viewBox="-30 -30 60 60" width="24" height="24" class="ar-n av" style="--c:#cfc7b3" aria-hidden="true">${GLY.s}</svg><span>Accessible</span></li>`
    +`<li><svg viewBox="-30 -30 60 60" width="24" height="24" class="ar-n offer" style="--c:#f3b94d" aria-hidden="true">${GLY.s}</svg><span>Proposé</span></li>`
    +`<li><svg viewBox="-30 -30 60 60" width="24" height="24" class="ar-n excl" style="--c:#cfc7b3" aria-hidden="true">${GLY.s}</svg><span>Incompatible</span></li>`
    +`<li><svg viewBox="-30 -30 60 60" width="24" height="24" class="ar-n oub" style="--c:#cfc7b3" aria-hidden="true">${GLY.s}</svg><span>Oublié</span></li>`
    +`<li><svg viewBox="-30 -30 60 60" width="24" height="24" class="ar-n own off" style="--c:#cfc7b3" aria-hidden="true">${GLY.s}</svg><span>Éteint</span></li>`;
  }
  return h+'</ul>';
 }
 const css=`
.ar{width:100%;height:auto;display:block;user-select:none;-webkit-user-select:none}
.ar-ring{fill:none;stroke:#191d2b;stroke-width:1}
.ar-e{stroke:#262b3f;stroke-width:2.2;stroke-linecap:round}
.ar-e.av{stroke:#4a5170;stroke-dasharray:3 6}
.ar-e.on{stroke:var(--c);stroke-width:3.6;opacity:.95}
.ar-e.sealed{opacity:.2}
.ar-n{cursor:pointer;outline:none}
.ar-n .hit{fill:transparent}
.ar-n .sh{fill:#10131c;stroke:#323852;stroke-width:1.8;transition:stroke .15s,fill .15s}
.ar-n .in{fill:#2a3045}
.ar-n.av .sh{stroke:var(--c);fill:#161a27}
.ar-n.av .in{fill:var(--c);opacity:.55}
.ar-n.own .sh{fill:var(--c);stroke:var(--c)}
.ar-n.own .in{fill:#0c0e15;opacity:1}
.ar-n.sealed{opacity:.28}
.ar-n.oub .sh{fill:#161a27;stroke:var(--c);stroke-dasharray:2 3;opacity:.7}
.ar-n.oub .in{fill:var(--c);opacity:.25}
.ar-n.oub .xs{fill:#161a27;stroke-dasharray:2 3}
.ar-n.off{filter:grayscale(1) brightness(.6)}
.ar-n.excl .sh{stroke:#8a4452;stroke-dasharray:3 3}
.ar-n .halo{fill:none;stroke:#fff;stroke-width:2;opacity:0}
.ar-n.offer .halo{opacity:.9;stroke:var(--c);animation:arpulse 1.15s ease-in-out infinite}
.ar-n.hl .halo{opacity:1;stroke:#fff;stroke-width:3;animation:none}
.ar-n.sel .halo{opacity:1;stroke:#fff;stroke-width:3;animation:none}
.ar-n:hover .sh,.ar-n:focus-visible .sh{stroke:#fff}
.ar-n .xs{fill:#161a27;stroke:var(--c);stroke-width:2}
.ar-n.own .xs{fill:var(--c)}
.ar-n .xl{font:700 13px var(--f-display,"Grenze Gotisch",Georgia,serif);fill:#e9e2d0;pointer-events:none}
.ar-n.own .xl{fill:#0c0e15}
.ar-n .rk{font:700 15px var(--f-body,"Alegreya Sans",system-ui,sans-serif);fill:#cfc7b3;pointer-events:none}
.ar-n .nm{font:500 14px var(--f-body,"Alegreya Sans",system-ui,sans-serif);fill:#ece4ce;paint-order:stroke;stroke:#0b0d14;stroke-width:4px;stroke-linejoin:round;opacity:0;pointer-events:none;transition:opacity .15s}
.ar-n.offer .nm,.ar-n.sel .nm,.ar-n.hl .nm,.ar-n:hover .nm,.ar-n:focus-visible .nm{opacity:1}
.ar.zoom .nm,.ar.noms .nm{opacity:.95;font-size:13px}
.ar.zoom .ar-n:not(.own):not(.av) .nm,.ar.noms .ar-n:not(.own):not(.av) .nm{opacity:.6}
.ar-n.dim,.ar-e.dim,.ar-b.dim{opacity:.13;pointer-events:none}
.ar-n.dim .nm,.ar-b.dim{display:none}
.ar-b.zl{display:none}.ar.zoom .ar-b.zl:not(.dim){display:inline}.ar.zoom .ar-b.ov.sub-hide{display:none}
.ar-b{cursor:pointer}
.ar-b .bl{font:500 30px var(--f-display,"Grenze Gotisch",Georgia,serif);fill:var(--c);paint-order:stroke;stroke:#0b0d14;stroke-width:5px}
.ar-b .bls{font:500 15px var(--f-body,"Alegreya Sans",system-ui,sans-serif);letter-spacing:.14em;text-transform:uppercase;fill:#8d8a9c;paint-order:stroke;stroke:#0b0d14;stroke-width:4px}
.ar-b.sealed{opacity:.5}
.ar-b:hover .bl{filter:brightness(1.25)}
.ar.zoom .ar-b .bl{font-size:20px}.ar.zoom .ar-b .bls{font-size:11px}
.ar-leg{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;font-size:13px;color:#a9a6b8}
.ar-leg li{display:inline-flex;align-items:center;gap:5px}
.ar-leg .ar-n{cursor:default}
.ar-leg .ar-n .nm,.ar-leg .ar-n .rk{display:none}
.ar-leg .sep{width:1px;height:16px;background:#2a2f43;margin:0 2px}
@keyframes arpulse{0%,100%{opacity:.25}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){.ar-n.offer .halo{animation:none;opacity:.8}.ar-n .nm{transition:none}}
`;
 D.arbre={centre:TC,geometrie:G,pos,aretes,cadre,vues,vue,ids:idsOf,branches:branchesOf,dessiner,legende,css,genre:id=>T.noeuds[id]&&T.noeuds[id].k,brOf};
})(window.BRUME_DATA=window.BRUME_DATA||{});
