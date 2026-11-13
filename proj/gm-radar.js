/* Interactive style fingerprint for Grandmaster Council.
   Values are each engine's weight on an eval term, relative to a neutral 1.0x. */
(function(){
  const box=document.getElementById('gmradar'); if(!box) return;
  const T=['Material','King safety','King attack','Mobility','Pawn structure','Piece activity','King activity'];
  const G=[
    {n:'Karpov',c:'#7f9fd6',v:[1.3,1.7,0.7,1.0,1.7,1.0,0.5],d:'Squeezes slowly, keeps his king safe and pawns tidy'},
    {n:'Kasparov',c:'#d9725f',v:[1.3,0.7,2.0,1.3,1.0,1.7,0.7],d:'Goes straight for the king with active pieces'},
    {n:'Petrosian',c:'#7fb38a',v:[1.0,2.0,0.3,0.7,1.7,0.7,0.5],d:'Prophylaxis first, almost never overextends'},
    {n:'Carlsen',c:'#e9a54a',v:[1.3,0.5,1.3,1.7,1.3,1.7,2.0],d:'Mobile pieces and an active king in the endgame'}];
  const MAX=2.1, W=640, H=520, cx=W/2, cy=H/2+6, R=200, N=T.length;
  const ang=i=>-Math.PI/2+i*2*Math.PI/N, pt=(i,v)=>[cx+Math.cos(ang(i))*R*v/MAX, cy+Math.sin(ang(i))*R*v/MAX];
  const ns='http://www.w3.org/2000/svg', el=(t,a,p)=>{ const e=document.createElementNS(ns,t); for(const k in a) e.setAttribute(k,a[k]); (p||svg).appendChild(e); return e; };
  box.innerHTML='<div class="gr-legend"></div><div class="gr-wrap"><svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Radar chart of how much each grandmaster engine weights each part of the evaluation"></svg><div class="gr-tip"></div></div><div class="gr-note">1.0× is neutral. Hover or tap a corner or a name to see the weights.</div>';
  const svg=box.querySelector('svg'), tip=box.querySelector('.gr-tip'), leg=box.querySelector('.gr-legend');
  // rings and spokes
  [0.5,1,1.5,2].forEach(r=>{ el('polygon',{points:T.map((_,i)=>pt(i,r).join(',')).join(' '),fill:'none',stroke:r===1?'#55524d':'#2c2c30','stroke-width':r===1?1.2:1,'stroke-dasharray':r===1?'3 4':''});
    const p=pt(0,r); el('text',{x:p[0]+6,y:p[1]+4,class:'gr-ring'}).textContent=r.toFixed(1)+'×'; });
  T.forEach((t,i)=>{ const p=pt(i,MAX); el('line',{x1:cx,y1:cy,x2:p[0],y2:p[1],stroke:'#2c2c30'});
    const q=pt(i,MAX+0.28), a=Math.cos(ang(i)); const tx=el('text',{x:q[0],y:q[1]+4,class:'gr-axis','text-anchor':Math.abs(a)<.2?'middle':a>0?'start':'end','data-i':i}); tx.textContent=t.toUpperCase(); });
  // shapes
  const shapes=G.map((g,gi)=>{ const grp=el('g',{class:'gr-g'});
    el('polygon',{points:g.v.map((v,i)=>pt(i,v).join(',')).join(' '),fill:g.c,'fill-opacity':.08,stroke:g.c,'stroke-width':2.2,'stroke-linejoin':'round'},grp);
    const dots=g.v.map((v,i)=>{ const p=pt(i,v); return el('circle',{cx:p[0],cy:p[1],r:3.2,fill:g.c},grp); });
    return {grp,dots}; });
  // hit targets: one per (engine, term) vertex
  G.forEach((g,gi)=>g.v.forEach((v,i)=>{ const p=pt(i,v); const h=el('circle',{cx:p[0],cy:p[1],r:13,fill:'transparent',style:'cursor:pointer'});
    h.addEventListener('pointerenter',()=>show(gi,i)); h.addEventListener('pointerleave',clear); }));
  svg.querySelectorAll('.gr-axis').forEach(a=>{ a.addEventListener('pointerenter',()=>show(-1,+a.dataset.i)); a.addEventListener('pointerleave',clear); });
  G.forEach((g,gi)=>{ const b=document.createElement('button'); b.type='button'; b.innerHTML='<i style="background:'+g.c+'"></i>'+g.n; leg.appendChild(b);
    b.addEventListener('pointerenter',()=>show(gi,-1)); b.addEventListener('pointerleave',clear); b.addEventListener('focus',()=>show(gi,-1)); b.addEventListener('blur',clear); });
  const fmt=v=>v.toFixed(1)+'×';
  function place(i){ const p=pt(i,1.25), r=svg.getBoundingClientRect(), k=r.width/W; tip.style.left=(p[0]*k)+'px'; tip.style.top=(p[1]*k)+'px'; }
  function show(gi,i){ box.classList.add('hot');
    shapes.forEach((s,k)=>{ s.grp.style.opacity=(gi<0||k===gi)?1:.12; s.dots.forEach((d,j)=>d.setAttribute('r',(j===i&&(gi<0||k===gi))?5.5:3.2)); });
    leg.querySelectorAll('button').forEach((b,k)=>b.classList.toggle('on',k===gi));
    svg.querySelectorAll('.gr-axis').forEach(a=>a.classList.toggle('on',+a.dataset.i===i));
    let html;
    if(gi>=0&&i>=0) html='<b style="color:'+G[gi].c+'">'+G[gi].n+'</b><span>'+T[i]+'</span><em>'+fmt(G[gi].v[i])+'</em>';
    else if(gi>=0){ const g=G[gi], hi=g.v.indexOf(Math.max(...g.v)), lo=g.v.indexOf(Math.min(...g.v)); html='<b style="color:'+g.c+'">'+g.n+'</b><span>'+g.d+'</span><div class="gr-row"><span>Most: '+T[hi]+'</span><em>'+fmt(g.v[hi])+'</em></div><div class="gr-row"><span>Least: '+T[lo]+'</span><em>'+fmt(g.v[lo])+'</em></div>'; }
    else html='<b>'+T[i]+'</b>'+G.slice().sort((a,b)=>b.v[i]-a.v[i]).map(g=>'<div class="gr-row"><span style="color:'+g.c+'">'+g.n+'</span><em>'+fmt(g.v[i])+'</em></div>').join('');
    tip.innerHTML=html; if(gi>=0&&i<0){ tip.style.left='50%'; tip.style.top='50%'; } else place(i); tip.classList.add('on'); }
  function clear(){ box.classList.remove('hot'); shapes.forEach(s=>{ s.grp.style.opacity=1; s.dots.forEach(d=>d.setAttribute('r',3.2)); }); leg.querySelectorAll('button').forEach(b=>b.classList.remove('on')); svg.querySelectorAll('.gr-axis').forEach(a=>a.classList.remove('on')); tip.classList.remove('on'); }
})();
