/* Hurricane Season bot: interactive storm demo.
   Simulated storms, but the mechanics follow the bot's research notes:
   wind = I * exp(-(d/r)^2), a site is closed while wind > 0.35,
   insured loss = 9 PORT + 6 ISLE + 2.5 AQUA + 7 GRID + 1.2 FERRY,
   HAVEN pays $400M to $1,300M, REIN pays above $1,300M,
   the house lags during the storm and catches up by the end,
   the bot only enters at storm age 60 to 320 s when the gap beats its threshold, then flattens. */
(function(){
  const root=document.getElementById('hurdemo'); if(!root) return;
  const SITES={PORT:[9.5,4.2],ISLE:[12.5,8.3],GRID:[6.5,7.8],AQUA:[13.8,3.2],FERRY:[4.2,3.4]};
  const SYMS=['PORT','ISLE','GRID','AQUA','FERRY','HAVEN','REIN'];
  const W_LOSS={PORT:9,ISLE:6,AQUA:2.5,GRID:7,FERRY:1.2};
  const T=420, LAG=55, ENTER=[60,320], THR=1.2, SIZE=50, SPREAD=0.2;
  const AC='#e9a54a', FG='#ece9e3', MU='#8f8b84', DIM='#3a3936', BL='#7f9fd6', RD='#d9725f', GR='#7fb38a';
  root.innerHTML=
   '<div class="hd-top"><div class="hd-clock"><span class="hd-k">Storm age</span><b>0s</b><i></i></div>'+
   '<div class="hd-ctl"><button type="button" data-a="play" aria-label="Pause">❚❚</button><button type="button" data-a="speed">1×</button><button type="button" data-a="new">New storm</button></div></div>'+
   '<div class="hd-grid"><div class="hd-map"><canvas></canvas><div class="hd-maplab">Click a site to follow it</div></div>'+
   '<div class="hd-side"><table class="hd-tab"><thead><tr><th>Symbol</th><th>House</th><th>Our fair</th><th>Gap</th><th>Pos</th></tr></thead><tbody></tbody></table>'+
   '<div class="hd-pnl"><span class="hd-k">Demo PnL</span><b>$0</b><em></em></div></div></div>'+
   '<div class="hd-chart"><div class="hd-chead"><b></b><span><i style="background:'+MU+'"></i>House mid<i style="background:'+AC+'"></i>Our fair value<i class="dash"></i>Settlement</span></div><canvas></canvas><div class="hd-tip"></div></div>'+
   '<p class="hd-note">Simulated storms, not competition data. The rules are the bot’s: the wind and closure formulas, the insured-loss weights, the 60 to 320 s entry window and the house’s lag. Prices and PnL are illustrative.</p>';
  const mapC=root.querySelector('.hd-map canvas'), chC=root.querySelector('.hd-chart canvas'), tbody=root.querySelector('tbody'), tip=root.querySelector('.hd-tip');
  const $=s=>root.querySelector(s);
  let sim, t=0, playing=true, speed=1, sel='FERRY', hoverT=-1, visible=false, endAt=0;
  function rng(seed){ return ()=>{ seed=(seed*16807)%2147483647; return (seed-1)/2147483646; }; }
  function makeStorm(seed){
    const r=rng(seed), track=[], ages=[];
    // a curved path that crosses the map, aimed somewhere different every time
    const x0=-2+r()*3, y0=-1.5+r()*3, x3=10+r()*8, y3=8+r()*4, cx1=3+r()*8, cy1=r()*9, cx2=6+r()*8, cy2=2+r()*9;
    const peak=0.85+r()*0.5, rad=2.0+r()*0.9, tPeak=150+r()*120;
    const st={seed,track:[],I:[],R:rad};
    for(let a=0;a<=T;a++){ const u=a/T, v=1-u;
      const x=v*v*v*x0+3*v*v*u*cx1+3*v*u*u*cx2+u*u*u*x3, y=v*v*v*y0+3*v*v*u*cy1+3*v*u*u*cy2+u*u*u*y3;
      st.track.push([x,y]); st.I.push(peak*Math.exp(-Math.pow((a-tPeak)/120,2))*(a<380?1:Math.max(0,(T-a)/40))); }
    // per-site wind, closure, damage
    const D={}, C={}, Wd={}; Object.keys(SITES).forEach(k=>{ D[k]=[0]; C[k]=[0]; Wd[k]=[0]; });
    for(let a=1;a<=T;a++) Object.entries(SITES).forEach(([k,[sx,sy]])=>{ const [x,y]=st.track[a]; const w=st.I[a]*Math.exp(-((x-sx)**2+(y-sy)**2)/(rad*rad));
      Wd[k].push(w); D[k].push(D[k][a-1]+0.42*Math.max(0,w-0.15)**2); C[k].push(C[k][a-1]+(w>0.35?1:0)); });
    st.D=D; st.C=C; st.W=Wd;
    const value=(k,Dk,Ck)=>k==='FERRY'?100-0.35*Dk-0.075*Ck:100-1.55*Dk-0.012*Ck;
    const loss=a=>Object.keys(W_LOSS).reduce((s,k)=>s+W_LOSS[k]*D[k][a],0)*2.2; // $M
    const ins=(L)=>({HAVEN:100-Math.min(900,Math.max(0,L-400))/9, REIN:Math.max(0,100-Math.max(0,L-1300)/6)});
    const final={}, prior={}; Object.keys(SITES).forEach(k=>{ final[k]=value(k,D[k][T],C[k][T]); prior[k]=value(k,0,0); });
    const Lf=loss(T), fi=ins(Lf); final.HAVEN=fi.HAVEN; final.REIN=fi.REIN; prior.HAVEN=100; prior.REIN=100;
    // our nowcast: damage so far + a growing share of what is still coming (sources agree more as the storm goes on)
    const nr=rng(seed*7+3), hr=rng(seed*13+5), hs={}, F={}, H={}; SYMS.forEach(s=>{ F[s]=[]; H[s]=[]; });
    const q=a=>Math.min(1,0.08+0.92*Math.min(1,a/280)), noise={}; SYMS.forEach(s=>noise[s]=0);
    for(let a=0;a<=T;a++){
      const Dn={}, Cn={}; Object.keys(SITES).forEach(k=>{ Dn[k]=D[k][a]+(D[k][T]-D[k][a])*q(a); Cn[k]=C[k][a]+(C[k][T]-C[k][a])*q(a); });
      const Ln=Object.keys(W_LOSS).reduce((s,k)=>s+W_LOSS[k]*Dn[k],0)*2.2, inn=ins(Ln);
      SYMS.forEach(s=>{ noise[s]=noise[s]*0.94+(nr()-0.5)*0.5*(1-q(a)+0.08); const base=s in SITES?value(s,Dn[s],Cn[s]):inn[s]; F[s].push(base+noise[s]); });
      // house: sees realized damage with a lag, then converges to the settlement after the storm
      const al=Math.max(0,a-LAG), Lh=loss(al), ih=ins(Lh);
      SYMS.forEach(s=>{ let h0=s in SITES?value(s,D[s][al],C[s][al]):ih[s]; hs[s]=hs[s]==null?h0:hs[s]+(h0-hs[s])*0.08; let h=hs[s]+(hr()-0.5)*0.06; if(a>330){ const k=Math.min(1,(a-330)/70); h=h+(final[s]-h)*(k*k*(3-2*k)); } H[s].push(h); });
    }
    st.F=F; st.H=H; st.final=final; st.prior=prior;
    // the bot: one entry per symbol inside the window when |fair - mid| beats the threshold, flatten after the storm
    st.trades={}; SYMS.forEach(s=>{ let pos=0, ent=0, out=null, inn=null;
      for(let a=ENTER[0];a<=T;a++){ const g=F[s][a]-H[s][a];
        if(!pos&&a<=ENTER[1]&&Math.abs(g)>Math.max(THR,1.5*SPREAD)){ pos=Math.sign(g)*SIZE; ent=H[s][a]+Math.sign(g)*SPREAD/2; inn=a; }
        if(pos&&a>=395){ out=a; break; } }
      st.trades[s]={pos,inn,out,ent}; });
    return st; }
  function posAt(s,a){ const tr=sim.trades[s]; return tr.pos&&a>=tr.inn&&(tr.out==null||a<tr.out)?tr.pos:0; }
  function pnlAt(s,a){ const tr=sim.trades[s]; if(!tr.pos||a<tr.inn) return 0; const px=tr.out!=null&&a>=tr.out?sim.H[s][tr.out]-Math.sign(tr.pos)*SPREAD/2:sim.H[s][a]; return tr.pos*(px-tr.ent); }
  // table
  SYMS.forEach(s=>{ const tr=document.createElement('tr'); tr.dataset.s=s; tr.innerHTML='<td>'+s+'</td><td></td><td></td><td></td><td></td>'; tr.onclick=()=>{ sel=s; drawAll(); }; tbody.appendChild(tr); });
  const fmt=v=>v.toFixed(2), money=v=>(v<0?'−$':'+$')+Math.abs(Math.round(v)).toLocaleString('en-US');
  function sizeCanvas(c){ const r=c.getBoundingClientRect(), d=Math.min(2,devicePixelRatio||1); if(c.width!==Math.round(r.width*d)||c.height!==Math.round(r.height*d)){ c.width=Math.round(r.width*d); c.height=Math.round(r.height*d); } return [c.getContext('2d'),r.width,r.height,d]; }
  function drawMap(a){ const [g,w,h,d]=sizeCanvas(mapC); g.setTransform(d,0,0,d,0,0); g.clearRect(0,0,w,h); const sx=w/16, sy=h/10, P=(x,y)=>[x*sx,h-y*sy];
    g.strokeStyle='#1c1c20'; g.lineWidth=1; for(let i=1;i<16;i++){ g.beginPath(); g.moveTo(i*sx,0); g.lineTo(i*sx,h); g.stroke(); } for(let i=1;i<10;i++){ g.beginPath(); g.moveTo(0,i*sy); g.lineTo(w,i*sy); g.stroke(); }
    const [x,y]=sim.track[a], I=sim.I[a], R=sim.R; const [px,py]=P(x,y);
    // wind field
    if(I>0.02){ const rg=g.createRadialGradient(px,py,0,px,py,R*2.2*sx); rg.addColorStop(0,'rgba(127,159,214,'+(0.45*Math.min(1,I))+')'); rg.addColorStop(1,'rgba(127,159,214,0)'); g.fillStyle=rg; g.beginPath(); g.arc(px,py,R*2.2*sx,0,7); g.fill();
      if(I>0.35){ const rc=R*Math.sqrt(Math.log(I/0.35)); g.strokeStyle=AC; g.lineWidth=1.4; g.setLineDash([4,4]); g.beginPath(); g.ellipse(px,py,rc*sx,rc*sy,0,0,7); g.stroke(); g.setLineDash([]); } }
    // track so far
    g.strokeStyle='rgba(236,233,227,.55)'; g.lineWidth=1.3; g.beginPath(); for(let i=0;i<=a;i+=3){ const [tx,ty]=P(...sim.track[i]); i?g.lineTo(tx,ty):g.moveTo(tx,ty); } g.stroke();
    if(I>0.02){ g.fillStyle=FG; g.beginPath(); g.arc(px,py,4,0,7); g.fill(); }
    g.font='11px "IBM Plex Mono",monospace';
    Object.entries(SITES).forEach(([k,[sx0,sy0]])=>{ const [qx,qy]=P(sx0,sy0); const wv=sim.W[k][a]||0, closed=wv>0.35; const s=k===sel;
      g.fillStyle=closed?AC:(s?FG:MU); g.fillRect(qx-5,qy-5,10,10); if(s){ g.strokeStyle=FG; g.lineWidth=1; g.strokeRect(qx-9,qy-9,18,18); }
      g.fillStyle=closed?AC:(s?FG:MU); g.fillText(k+(closed?' · closed':''),qx+12,qy-6);
      const dmg=sim.D[k][a]; g.fillStyle='#2a2a2f'; g.fillRect(qx+12,qy+1,46,3); g.fillStyle=RD; g.fillRect(qx+12,qy+1,Math.min(46,dmg*1.6),3); });
  }
  function drawChart(a){ const [g,w,h,d]=sizeCanvas(chC); g.setTransform(d,0,0,d,0,0); g.clearRect(0,0,w,h); const s=sel, F=sim.F[s], H=sim.H[s];
    let lo=Infinity, hi=-Infinity; for(let i=0;i<=T;i++){ lo=Math.min(lo,F[i],H[i]); hi=Math.max(hi,F[i],H[i]); } lo=Math.min(lo,sim.final[s]); hi=Math.max(hi,sim.final[s]); const pad=Math.max(1.5,(hi-lo)*.12); lo-=pad; hi+=pad;
    const L=44,Rr=12,Tt=10,B=24, X=v=>L+(w-L-Rr)*v/T, Y=v=>Tt+(h-Tt-B)*(1-(v-lo)/(hi-lo));
    g.fillStyle='rgba(233,165,74,.06)'; g.fillRect(X(ENTER[0]),Tt,X(ENTER[1])-X(ENTER[0]),h-Tt-B);
    g.fillStyle=MU; g.font='10px "IBM Plex Mono",monospace'; g.textAlign='center'; g.fillText('entry window',(X(ENTER[0])+X(ENTER[1]))/2,Tt+12);
    g.textAlign='right'; for(let k=0;k<=4;k++){ const v=lo+(hi-lo)*k/4; g.fillStyle='#55524d'; g.fillText(v.toFixed(0),L-8,Y(v)+3); g.strokeStyle='#1d1d21'; g.beginPath(); g.moveTo(L,Y(v)); g.lineTo(w-Rr,Y(v)); g.stroke(); }
    g.textAlign='center'; [0,60,120,180,240,300,360,420].forEach(v=>{ g.fillStyle='#55524d'; g.fillText(v+'s',X(v),h-8); });
    g.strokeStyle=MU; g.setLineDash([3,4]); g.beginPath(); g.moveTo(L,Y(sim.final[s])); g.lineTo(w-Rr,Y(sim.final[s])); g.stroke(); g.setLineDash([]);
    const line=(arr,c,lw)=>{ g.strokeStyle=c; g.lineWidth=lw; g.beginPath(); for(let i=0;i<=a;i++){ i?g.lineTo(X(i),Y(arr[i])):g.moveTo(X(i),Y(arr[i])); } g.stroke(); };
    line(H,MU,1.6); line(F,AC,1.8);
    const tr=sim.trades[s]; const mark=(i,c,up)=>{ g.fillStyle=c; g.beginPath(); const x=X(i), y=Y(H[i]); if(up){ g.moveTo(x,y-9); g.lineTo(x-6,y+2); g.lineTo(x+6,y+2); } else { g.moveTo(x,y+9); g.lineTo(x-6,y-2); g.lineTo(x+6,y-2); } g.fill(); };
    if(tr.pos&&a>=tr.inn) mark(tr.inn,tr.pos>0?GR:RD,tr.pos>0); if(tr.pos&&tr.out!=null&&a>=tr.out) mark(tr.out,FG,tr.pos<0);
    if(hoverT>=0&&hoverT<=a){ g.strokeStyle='#4a4a50'; g.beginPath(); g.moveTo(X(hoverT),Tt); g.lineTo(X(hoverT),h-B); g.stroke(); }
    chC._X=X; chC._L=L; chC._R=Rr;
    $('.hd-chead b').textContent=s+(tr.pos?(tr.pos>0?'  ·  bought '+tr.pos+' at '+tr.inn+'s':'  ·  sold '+(-tr.pos)+' at '+tr.inn+'s'):'  ·  gap never big enough, no trade');
  }
  function drawSide(a){ let tot=0; [...tbody.children].forEach(tr=>{ const s=tr.dataset.s, f=sim.F[s][a], h=sim.H[s][a], gp=f-h, p=posAt(s,a); tot+=pnlAt(s,a);
      const c=tr.children; c[1].textContent=fmt(h); c[2].textContent=fmt(f); c[3].textContent=(gp>=0?'+':'')+gp.toFixed(2); c[3].className=Math.abs(gp)>THR&&a>=ENTER[0]&&a<=ENTER[1]?(gp>0?'up':'dn'):''; c[4].textContent=p?(p>0?'+':'')+p:'·'; c[4].className=p>0?'up':p<0?'dn':''; tr.classList.toggle('on',s===sel); });
    const pb=$('.hd-pnl b'); pb.textContent=money(tot); pb.className=tot>=0?'up':'dn';
    const phase=a<ENTER[0]?'storm forming, waiting':a<=ENTER[1]?'house lagging, trading the gap':a<395?'house catching up, holding':'storm over, flattened';
    $('.hd-pnl em').textContent=phase; $('.hd-clock b').textContent=Math.floor(a)+'s'; $('.hd-clock i').style.width=(a/T*100)+'%'; }
  function drawAll(){ const a=Math.min(T,Math.floor(t)); drawMap(a); drawChart(a); drawSide(a); if(hoverT>=0) showTip(); }
  function showTip(){ const a=Math.min(T,Math.floor(t)); if(hoverT<0||hoverT>a){ tip.classList.remove('on'); return; } const s=sel, i=hoverT;
    tip.innerHTML='<b>'+i+'s</b><div><span>House</span><em>'+fmt(sim.H[s][i])+'</em></div><div><span style="color:'+AC+'">Our fair</span><em>'+fmt(sim.F[s][i])+'</em></div><div><span>Gap</span><em>'+(sim.F[s][i]-sim.H[s][i]).toFixed(2)+'</em></div><div><span>Position</span><em>'+(posAt(s,i)||'·')+'</em></div>';
    tip.style.left=Math.min(chC.clientWidth-150,Math.max(0,chC._X(i)+12))+'px'; tip.classList.add('on'); }
  chC.addEventListener('pointermove',e=>{ const r=chC.getBoundingClientRect(); const x=e.clientX-r.left; if(!chC._X) return; const i=Math.round((x-chC._L)/(r.width-chC._L-chC._R)*T); hoverT=Math.max(0,Math.min(T,i)); drawAll(); });
  chC.addEventListener('pointerleave',()=>{ hoverT=-1; tip.classList.remove('on'); drawAll(); });
  mapC.addEventListener('click',e=>{ const r=mapC.getBoundingClientRect(), x=(e.clientX-r.left)/r.width*16, y=10-(e.clientY-r.top)/r.height*10; let best=null,bd=1.6; Object.entries(SITES).forEach(([k,[sx,sy]])=>{ const dd=Math.hypot(sx-x,sy-y); if(dd<bd){bd=dd;best=k;} }); if(best){ sel=best; drawAll(); } });
  root.querySelector('[data-a=play]').onclick=e=>{ if(t>=T){ newStorm(); return; } playing=!playing; e.currentTarget.textContent=playing?'❚❚':'▶'; e.currentTarget.setAttribute('aria-label',playing?'Pause':'Play'); };
  root.querySelector('[data-a=speed]').onclick=e=>{ speed=speed===1?3:1; e.currentTarget.textContent=speed+'×'; };
  root.querySelector('[data-a=new]').onclick=()=>newStorm();
  let seedN=Math.floor(Math.random()*1e6)+11;
  function newStorm(){ for(let k=0;k<40;k++){ seedN+=7919; const s=makeStorm(seedN); const traded=SYMS.filter(x=>s.trades[x].pos).length; if(traded>=2&&traded<=6){ sim=s; break; } sim=s; }
    const best=SYMS.filter(x=>sim.trades[x].pos).sort((x,y)=>Math.abs(sim.final[y]-sim.trades[y].ent)-Math.abs(sim.final[x]-sim.trades[x].ent))[0]; if(best) sel=best; t=0; playing=true; endAt=0; const pb=root.querySelector('[data-a=play]'); pb.textContent='❚❚'; pb.setAttribute('aria-label','Pause'); drawAll(); }
  newStorm();
  const RM=matchMedia('(prefers-reduced-motion: reduce)').matches; if(RM){ t=T; playing=false; root.querySelector('[data-a=play]').textContent='↻'; }
  if('IntersectionObserver' in window) new IntersectionObserver(es=>es.forEach(e=>visible=e.isIntersecting)).observe(root); else visible=true;
  let last=performance.now();
  (function loop(now){ const dt=Math.min(0.1,(now-last)/1000); last=now;
    if(visible&&playing&&root.offsetParent){ if(t<T){ t=Math.min(T,t+dt*28*speed); drawAll(); } else { if(!endAt) endAt=now; else if(now-endAt>4000) newStorm(); } }
    requestAnimationFrame(loop); })(last);
  addEventListener('resize',()=>drawAll());
})();
