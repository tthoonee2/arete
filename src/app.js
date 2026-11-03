/* Arête — application logic */
const $=(s,el=document)=>el.querySelector(s),$$=(s,el=document)=>[...el.querySelectorAll(s)];
const fmt=(n,d=2)=>n.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
const fmt0=n=>Math.round(n).toLocaleString('en-US');
const money=n=>'$'+fmt(n);
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MON26=Array.from({length:36},(_,i)=>MONTHS[i%12]+' '+String(26+Math.floor(i/12)).padStart(2,'0'));
let toastTimer;
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3400)}
function copyText(s,msg='Copied to clipboard'){if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(s).then(()=>toast(msg)).catch(()=>fallbackCopy(s,msg))}else fallbackCopy(s,msg)}
function fallbackCopy(s,msg){const ta=document.createElement('textarea');ta.value=s;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toast(msg)}catch(e){toast('Copy failed — select and copy manually')}ta.remove()}

// ---------- ROUTER ----------
const ROUTES={overview:'Overview',price:'Price protection',budget:'Budget lock',markets:'Markets',risk:'Risk desk',basis:'Basis lab',developers:'Developers',institutions:'Institutions',trust:'Trust & pricing'};
let currentView='overview';
function route(){
  let h=location.hash.replace('#','')||'overview';
  const anchor=h.match(/^overview-(.+)$/);
  if(anchor){h='overview';setTimeout(()=>{const el=$('#'+anchor[1]);if(el)el.scrollIntoView({behavior:'smooth'})},60)}
  if(!ROUTES[h])h='overview';
  currentView=h;
  $$('.view').forEach(v=>v.hidden=v.dataset.view!==h);
  $$('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===h));
  document.title='Arête — '+ROUTES[h];
  window.scrollTo({top:0,behavior:'instant'});
  if(h==='risk')requestAnimationFrame(renderRisk);
  if(h==='basis')requestAnimationFrame(renderBasis);
  if(h==='developers')requestAnimationFrame(renderDev);
  if(h==='institutions')requestAnimationFrame(drawInstWidget);
  if(h==='markets')requestAnimationFrame(drawCurve);
  const pk=$('#peak');pk.style.opacity=h==='overview'?'':'0';pk.style.pointerEvents='none';
  closeMob();
}
window.addEventListener('hashchange',route);
function closeMob(){$('#mobMenu').classList.remove('open');$('#hamburger').setAttribute('aria-expanded','false');$('#hamburger').setAttribute('aria-label','Open navigation menu')}
$('#hamburger').onclick=()=>{const o=$('#mobMenu').classList.toggle('open');$('#hamburger').setAttribute('aria-expanded',o);$('#hamburger').setAttribute('aria-label',o?'Close navigation menu':'Open navigation menu')};
$('#drawerBtn').onclick=()=>{if(innerWidth<=1080){$('#sidebar').classList.toggle('open')}else{$('#sidebar').classList.toggle('collapsed')}};
document.addEventListener('click',e=>{if(innerWidth<=1080&&$('#sidebar').classList.contains('open')&&!e.target.closest('#sidebar')&&!e.target.closest('#drawerBtn'))$('#sidebar').classList.remove('open')});

// ---------- PRICING END ----------
let arSeed = 0xA57E2026;
function seededRandom() {
  arSeed |= 0;
  arSeed = arSeed + 0x6D2B79F5 | 0;
  let t = Math.imul(arSeed ^ arSeed >>> 15, 1 | arSeed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
function payoffRow(mkt,side,K,vol,n,st,cap){
  const m=MKT[mkt];let out=0;
  for(let i=0;i<n;i++){
    const s=m.fwd[st-1+i]*(1+.10*Math.sin(i*1.9+K));
    const d=(side==='ceiling'?s-K:K-s);
    out+=Math.max(0,cap?Math.min(d,cap):d)*vol;
  }
  return out;
}

// ---------- QUOTE BUILDER ----------
const MSEL=$('#q-mkt');
Object.entries(MKT).forEach(([id,m])=>{const o=document.createElement('option');o.value=id;o.textContent=m.name+' · '+m.unit;MSEL.appendChild(o)});
const state={mkt:'brent',side:'ceiling',structure:'paid',K:72.5,vol:8000,cap:88,st:1,n:6,freq:'monthly'};
function strip(m){const mkt=MKT[m];return '<span class="mono">'+mkt.t+'</span>'+fmt(mkt.spot)+' <span class="up">+'+fmt(.4+mkt.vol*2)+'%</span>'}
function renderStrip(){$('#tick').innerHTML=Object.keys(MKT).map(strip).join('<span style="color:var(--line-strong)">/</span>')}
function syncUI(){
  MSEL.value=state.mkt;
  const m=MKT[state.mkt];
  $('#q-spot').textContent='Spot '+fmt(m.spot)+' '+m.unit;
  $$('#sideSeg button').forEach(b=>b.classList.toggle('on',b.dataset.side===state.side));
  $$('#freqSeg button').forEach(b=>b.classList.toggle('on',b.dataset.freq===state.freq));
  $('#q-K').value=state.K;$('#q-vol').value=state.vol;$('#q-cap').value=state.cap;$('#q-start').value=state.st;$('#q-n').value=state.n;
  const cov=state.side==='ceiling'?'Paid cap':'Paid floor';
  $('#q-K-lab').innerHTML=(state.side==='ceiling'?'Maximum price':'Minimum price')+' <span class="tag" style="vertical-align:2px">'+cov+' · '+m.unit+'</span>';
  $('#q-cap-wrap').style.display=state.cap?'':'none';
  const avgK=state.side==='ceiling'?m.fwd.slice(state.st-1,state.st-1+state.n).reduce((a,b)=>a+b,0)/state.n*1.03:m.fwd.slice(state.st-1,state.st-1+state.n).reduce((a,b)=>a+b,0)/state.n*.97;
  $('#q-K-hint').textContent='Curve average for these months: '+fmt(avgK)+' '+m.unit;
  $('#q-start-lab').textContent=MON26[state.st-1]+' → '+MON26[state.st-2+state.n];
  $('#q-n-lab').textContent=state.n+' months · '+fmt0(state.vol*state.n)+' units total';
  const r=price(state);
  $('#q-prem').textContent=fmt0(r.prem);
  const totalVol=state.vol*state.n;
  $('#q-prem-bbl').textContent=fmt(r.prem/totalVol)+' / unit · '+fmt(r.prem/Math.max(1,avgK*totalVol)*100,2)+'% of notional';
  $('#q-pay').textContent=fmt0(r.pay);
  $('#q-months').textContent=MON26[state.st-1]+' – '+MON26[state.st-2+state.n];
  $('#q-pcount').textContent=state.n+' monthly settlement'+(state.n>1?'s':'');
  $('#q-itm').textContent=(r.itm*100).toFixed(0)+'%';
  $('#q-prob').textContent=(r.prob*100).toFixed(0)+'%';
  const maxPay=state.cap?state.cap*state.vol*state.n:null;
  $('#q-max').textContent=maxPay?fmt0(maxPay):'Uncapped';
  $('#q-freq').textContent='Monthly cash settlement';
  const ns={name:m.name,unit:m.unit};
  drawPayoff(ns);
}
['q-K','q-vol','q-cap','q-start','q-n'].forEach(id=>{
  $('#'+id).addEventListener('input',e=>{
    const v=parseFloat(e.target.value)||0;
    if(id==='q-K')state.K=Math.max(.01,v);
    if(id==='q-vol')state.vol=Math.max(1,v);
    if(id==='q-cap')state.cap=v;
    if(id==='q-start')state.st=parseInt(v);
    if(id==='q-n'){state.n=parseInt(v);if(state.st+state.n>37)state.st=37-state.n}
    syncUI();
  });
});
$('#q-mkt').onchange=e=>{const m=MKT[e.target.value];state.mkt=e.target.value;state.K=Math.round(m.spot*1.05*2)/2;state.cap=Math.round(m.spot*1.25*2)/2;syncUI()};
$$('#sideSeg button').forEach(b=>b.onclick=()=>{state.side=b.dataset.side;syncUI()});
$$('#freqSeg button').forEach(b=>b.onclick=()=>{state.freq=b.dataset.freq;syncUI()});
$('#q-reset').onclick=()=>{state.cap=0;$('#q-cap').value=0;syncUI();toast('Payout cap removed')};
let lastQuote=null;
function demoId(prefix){let s='';for(let i=0;i<12;i++)s+='0123456789abcdef'[Math.floor(seededRandom()*16)];return prefix+s}
function quoteRequest(){return {market:state.mkt,side:state.side,structure:'paid',limit:state.K,cap:state.cap||null,volume_per_month:state.vol,start_month:state.st,months:state.n}}
function storeQuote(q){lastQuote=q;try{sessionStorage.setItem('arete-last-quote',JSON.stringify(q))}catch(e){/* Storage is optional in private browsing. */}return q}
function payloadFromQuote(q){const r=q.request;const m=MKT[r.market];return {mkt:r.market,mktName:m.name,side:r.side,structure:'paid',freq:'Monthly',K:r.limit,vol:r.volume_per_month,cap:r.cap||0,st:r.start_month,n:r.months,po:r.settlement.payout,poPer:r.settlement.per_unit_premium,prob:r.settlement.probability,unit:m.unit,quoteId:q.quote_id,expiresAt:q.expires_at,modelVersion:q.model_version}}
function addQuote(q){const p=payloadFromQuote(q);BOOK.unshift(p);saveBook();return p}
$('#q-add').onclick=async()=>{const r=price(state);const q=storeQuote({quote_id:demoId('q_'),request:quoteRequest(),settlement:{payout:r.pay,per_unit_premium:r.pay/(state.vol*state.n),probability:r.prob},model_version:'browser-black76-bachelier-v1',expires_at:new Date(Date.now()+15*60*1000).toISOString()});addQuote(q);toast('Protection added to your book');location.hash='risk'};
$('#q-copy').onclick=()=>{const r=price(state);const txt='ARÊTE INDICATIVE QUOTE\n'+MKT[state.mkt].name+'\n'+(state.side==='ceiling'?'Paid cap':'Paid floor')+' @ '+fmt(state.K)+' '+MKT[state.mkt].unit+'\n'+MON26[state.st-1]+' – '+MON26[state.st-2+state.n]+' · '+fmt0(state.vol)+' units/mo\n'+(state.cap?'Payout cap: '+fmt(state.cap)+' '+MKT[state.mkt].unit+'\n':'')+'Upfront premium: $'+fmt0(r.pay)+'\nExpected payout: $'+fmt0(r.prem)+'\nPayout probability: '+(r.prob*100).toFixed(0)+'%\nIllustrative quote. No transaction is executed.';copyText(txt,'Quote summary copied')};
$('#q-share').onclick=()=>{const p=new URLSearchParams({m:state.mkt,s:state.side,k:state.K,v:state.vol,c:state.cap,st:state.st,n:state.n});copyText(location.origin+location.pathname+'#price?'+p.toString(),'Share link copied')};
function readShare(){const h=location.hash;if(!h.startsWith('#price?'))return;const p=new URLSearchParams(h.split('?')[1]);if(MKT[p.get('m')])state.mkt=p.get('m');if(p.get('s'))state.side=p.get('s');['k','v','c','st','n'].forEach(k=>{const v=parseFloat(p.get(k));if(isFinite(v)&&v>0){if(k==='k')state.K=v;if(k==='v')state.vol=v;if(k==='c')state.cap=v;if(k==='st')state.st=v;if(k==='n')state.n=v}})}

// ---------- PAYOFF CHART ----------
function drawPayoff(m){
  const cv=$('#payoff');if(!cv||!cv.clientWidth)return;const ctx=cv.getContext('2d');const W=cv.width=cv.clientWidth*2,H=cv.height=cv.clientHeight*2;ctx.scale(1,1);ctx.clearRect(0,0,W,H);
  const lo=Math.min(state.K,m.spot)*.72,hi=Math.max(state.K,m.spot)*1.3;
  const X=s=>40+(s-lo)/(hi-lo)*(W-70),Y=v=>H-40-v*(H-70);
  ctx.strokeStyle='#e3e1da';ctx.lineWidth=1;
  for(let i=0;i<=4;i++){const y=40+i*(H-80)/4;ctx.beginPath();ctx.moveTo(40,y);ctx.lineTo(W-30,y);ctx.stroke()}
  // unprotected
  ctx.strokeStyle='#c4523a';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();
  for(let s=lo;s<=hi;s+=(hi-lo)/120){const v=(s-m.spot)/m.spot;const x=X(s),y=Y(v);s===lo?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.stroke();ctx.setLineDash([]);
  // protected
  const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'rgba(29,109,79,.16)');grad.addColorStop(1,'rgba(29,109,79,0)');
  ctx.beginPath();
  for(let s=lo;s<=hi;s+=(hi-lo)/120){const d=state.side==='ceiling'?Math.max(0,s-state.K):Math.max(0,state.K-s);const dd=state.cap?Math.min(d,state.cap):d;const v=((state.side==='ceiling'?s-dd:s+dd)-m.spot)/m.spot;const x=X(s),y=Y(v);s===lo?ctx.moveTo(x,y):ctx.lineTo(x,y)}
  ctx.strokeStyle='#1d6d4f';ctx.lineWidth=3;ctx.stroke();
  ctx.lineTo(X(hi),Y(-.6));ctx.lineTo(X(lo),Y(-.6));ctx.closePath();ctx.fillStyle=grad;ctx.fill();
  // strike
  ctx.strokeStyle='#111110';ctx.lineWidth=1.5;ctx.setLineDash([2,4]);ctx.beginPath();ctx.moveTo(X(state.K),30);ctx.lineTo(X(state.K),H-40);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#111110';ctx.font='20px "Geist Mono",monospace';ctx.fillText(fmt(state.K),Math.min(X(state.K)+6,W-110),48);
  ctx.fillStyle='#77746c';ctx.font='18px "Geist Mono",monospace';ctx.fillText('0%',34,Y(0)-8);ctx.fillText('Settlement',W-150,26);
}
window.addEventListener('resize',()=>{if(currentView==='price')drawPayoff(MKT[state.mkt]);if(currentView==='risk')renderRisk();if(currentView==='basis')renderBasis();if(currentView==='markets')drawCurve()});

// ---------- MARKETS ----------
const GROUPS=[['Energy','energy'],['Metals','metals'],['Food','food'],['Freight','freight']];
function renderMkt(){
  $('#mkt-groups').innerHTML=GROUPS.map(([g,cls])=>'<div class="mgroup"><h4>'+g+'</h4>'+Object.entries(MKT).filter(([,m])=>m.group===cls).map(([id,m])=>'<div class="mkt-line"><span class="mono" style="color:var(--sub)">'+m.t+'</span><b>'+m.name+'</b><span class="pr">'+fmt(m.spot)+'<span class="unit">'+m.unit+'</span></span><span class="up">+'+fmt(.3+m.vol*4)+'%</span></div>').join('')+'</div>').join('');
  const sel=$('#cv-mkt');Object.entries(MKT).forEach(([id,m])=>{const o=document.createElement('option');o.value=id;o.textContent=m.name;sel.appendChild(o)});
  sel.onchange=drawCurve;
  const kpis=[['Brent','78.24','/bbl','+0.9%'],['TTF Gas','34.62','/MWh','+1.8%'],['Copper','9,842','/t','+0.4%'],['Corn','4.48','/bu','−0.3%'],['LNG JK M','12.94','/MMBtu','+2.1%'],['Gold','4,128','/oz','+0.6%'],['Aluminium','2,684','/t','+0.2%'],['Wheat','5.92','/bu','−0.8%']];
  $('#mkt-kpis').innerHTML=kpis.map(k=>'<div class="kpi"><span>'+k[0]+'</span><b>'+k[1]+'<small>'+k[2]+'</small></b><span class="delta '+(k[3].startsWith('+')?'up':'down')+'">'+k[3]+'</span></div>').join('');
}
function drawCurve(){
  const cv=$('#curve');if(!cv||!cv.clientWidth)return;const id=$('#cv-mkt').value||'brent',m=MKT[id];
  const ctx=cv.getContext('2d');const W=cv.width=cv.clientWidth*2,H=cv.height=cv.clientHeight*2;ctx.clearRect(0,0,W,H);
  const vals=m.fwd,lo=Math.min(...vals)*.96,hi=Math.max(...vals)*1.04;
  const X=i=>60+i/(vals.length-1)*(W-100),Y=v=>30+(hi-v)/(hi-lo)*(H-100);
  ctx.strokeStyle='#e3e1da';ctx.fillStyle='#77746c';ctx.font='20px "Geist Mono",monospace';
  for(let i=0;i<=4;i++){const v=lo+(hi-lo)*i/4,y=Y(v);ctx.beginPath();ctx.moveTo(60,y);ctx.lineTo(W-40,y);ctx.stroke();ctx.fillText(fmt(v),8,y+6)}
  ctx.beginPath();vals.forEach((v,i)=>{const x=X(i),y=Y(v);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});
  ctx.strokeStyle='#1d6d4f';ctx.lineWidth=3;ctx.stroke();
  ctx.lineTo(X(vals.length-1),H-60);ctx.lineTo(60,H-60);ctx.closePath();ctx.fillStyle='rgba(29,109,79,.07)';ctx.fill();
  ctx.fillStyle='#77746c';MON26.forEach((mo,i)=>{if(i%4===0)ctx.fillText(mo,X(i)-20,H-24)});
  ctx.fillStyle='#111110';ctx.font='600 24px Inter,sans-serif';ctx.fillText(m.name+' forward curve · '+m.unit,60,24);
}

// ---------- BOOK / RISK ----------
let BOOK=[
  {id:'AR-2601',mkt:'brent',mktName:'Brent Crude',side:'ceiling',structure:'paid',freq:'Monthly',K:78,vol:12000,cap:0,st:3,n:12,po:14720,poPer:.085,prob:.41,unit:'$/bbl',paid:true},
  {id:'AR-2602',mkt:'ttf',mktName:'TTF Natural Gas',side:'ceiling',structure:'paid',freq:'Monthly',K:38,vol:9000,cap:18,st:3,n:9,po:9310,poPer:.115,prob:.46,unit:'€/MWh',paid:true},
  {id:'AR-2603',mkt:'copper',mktName:'Copper',side:'floor',structure:'paid',freq:'Monthly',K:9200,vol:250,cap:0,st:2,n:6,po:5840,poPer:3.89,prob:.38,unit:'$/t',paid:true},
  {id:'AR-2604',mkt:'corn',mktName:'Corn',side:'ceiling',structure:'paid',freq:'Monthly',K:4.8,vol:40000,cap:0,st:5,n:8,po:6120,poPer:.019,prob:.44,unit:'$/bu',paid:true},
];
function saveBook(){try{localStorage.setItem('arete-book',JSON.stringify(BOOK))}catch(e){}}
function loadBook(){try{const s=localStorage.getItem('arete-book');if(s){const b=JSON.parse(s);if(Array.isArray(b)&&b.length)BOOK=b}}catch(e){}}
function bookNotional(){return BOOK.reduce((a,p)=>a+MKT[p.mkt].spot*p.vol*p.n,0)}
function mtm(p){const m=MKT[p.mkt];const drift=Math.sin(p.K)*0.05+(m.spot-p.K)/m.spot*.4;return p.po*drift*2.2}
function renderRisk(){
  const not=bookNotional(),prem=BOOK.reduce((a,p)=>a+p.po,0),mv=BOOK.reduce((a,p)=>a+mtm(p),0),cov=BOOK.reduce((a,p)=>a+p.prob*p.vol*p.n,0)/Math.max(1,BOOK.reduce((a,p)=>a+p.vol*p.n,0));
  $('#risk-kpis').innerHTML=[['Book notional',fmt0(not),'4 protections · illustrative'],['Upfront premiums',fmt0(prem),'Paid when protection is bound'],['Mark-to-market',(mv>=0?'+':'−')+fmt0(Math.abs(mv)),'vs premium paid'],['Avg payout probability',(cov*100).toFixed(0)+'%','Volume-weighted']].map((k,i)=>'<div class="kpi"><span>'+k[0]+'</span><b>'+k[1]+'</b><span class="delta '+(i===2?(mv>=0?'up':'down'):'')+'">'+k[2]+'</span></div>').join('');
  $('#book-body').innerHTML=BOOK.map(p=>'<tr><td class="mono" style="font-size:11px">'+p.id+'</td><td><b>'+p.mktName+'</b><div style="font-size:11px;color:var(--faint)">'+MON26[p.st-1]+' – '+MON26[p.st-2+p.n]+'</div></td><td><span class="pill '+(p.side==='ceiling'?'green':'')+'">'+(p.side==='ceiling'?'Cap':'Floor')+'</span></td><td class="mono">'+fmt(p.K)+'</td><td class="mono">'+fmt0(p.vol)+'</td><td class="mono">'+p.n+' mo</td><td class="mono">'+fmt0(p.po)+'</td><td class="mono '+(mtm(p)>=0?'up':'down')+'">'+(mtm(p)>=0?'+':'−')+fmt0(Math.abs(mtm(p)))+'</td><td><button class="row-btn" data-del="'+p.id+'">Remove</button></td></tr>').join('');
  $$('#book-body [data-del]').forEach(b=>b.onclick=()=>{BOOK=BOOK.filter(p=>p.id!==b.dataset.del);saveBook();renderRisk();toast('Position removed')});
  drawCoverage();drawMtmHist();
}
function drawCoverage(){
  const cv=$('#cov');if(!cv||!cv.clientWidth)return;const ctx=cv.getContext('2d');const W=cv.width=cv.clientWidth*2,H=cv.height=cv.clientHeight*2;
  const total=Array(12).fill(0),covered=Array(12).fill(0);
  BOOK.forEach(p=>{for(let i=0;i<12;i++){total[i]+=p.vol;if(i>=p.st-1&&i<p.st-1+p.n)covered[i]+=p.vol}});
  const max=Math.max(...total)*1.15||1;const bw=(W-100)/12;
  for(let i=0;i<12;i++){
    const x=60+i*bw;
    ctx.fillStyle='#e3e1da';ctx.fillRect(x,H-50-total[i]/max*(H-100),bw-10,total[i]/max*(H-100));
    ctx.fillStyle='#1d6d4f';ctx.fillRect(x,H-50-covered[i]/max*(H-100),bw-10,covered[i]/max*(H-100));
    ctx.fillStyle='#77746c';ctx.font='18px "Geist Mono",monospace';ctx.fillText(MONTHS[i],x,H-20);
  }
}
function drawMtmHist(){
  const cv=$('#mtm');if(!cv||!cv.clientWidth)return;const ctx=cv.getContext('2d');const W=cv.width=cv.clientWidth*2,H=cv.height=cv.clientHeight*2;ctx.clearRect(0,0,W,H);
  const base=BOOK.reduce((a,p)=>a+mtm(p),0),shock=parseFloat($('#stress').value)/100;
  const labels=['−40%','−20%','Now','+20%','+40%'];
  const vals=labels.map((_,i)=>{const s=(i-2)*.2;let v=0;BOOK.forEach(p=>{const m=MKT[p.mkt];const ns=m.spot*(1+s);const d=p.side==='ceiling'?Math.max(0,ns-p.K):Math.max(0,p.K-ns);const dd=p.cap?Math.min(d,p.cap):d;v+=dd*p.vol*p.n*.55});return v-BOOK.reduce((a,p)=>a+p.po,0)*.3});
  const lo=Math.min(...vals,0),hi=Math.max(...vals,0),Y=v=>30+(hi-v)/(hi-lo||1)*(H-90);
  ctx.strokeStyle='#e3e1da';ctx.beginPath();ctx.moveTo(40,Y(0));ctx.lineTo(W-30,Y(0));ctx.stroke();
  const bw=(W-90)/5;
  vals.forEach((v,i)=>{const x=50+i*bw;ctx.fillStyle=v>=0?'#1d6d4f':'#c4523a';const y=Y(Math.max(0,v)),h=Math.abs(Y(v)-Y(0));ctx.fillRect(x,y,bw-22,h);ctx.fillStyle='#77746c';ctx.font='18px "Geist Mono",monospace';ctx.fillText(labels[i],x+6,H-24);ctx.fillStyle='#111110';ctx.fillText((v>=0?'+':'−')+fmt0(Math.abs(v)/1000)+'k',x,Y(v)-10)});
  const sv=vals[Math.min(4,Math.max(0,Math.round((shock+.4)/.2)))];
  $('#stress-val').textContent='At '+(shock>=0?'+':'')+Math.round(shock*100)+'% price shock: '+(sv>=0?'+':'−')+'$'+fmt0(Math.abs(sv))+' indicative payout value vs premium.';
}
$('#stress').addEventListener('input',drawMtmHist);
$('#exportCsv').onclick=()=>{
  const rows=[['ID','Market','Side','Structure','Limit','Cap','Volume/mo','Start','Months','Upfront premium','Payout probability']].concat(BOOK.map(p=>[p.id,p.mktName,p.side,'paid',p.K,p.cap||'',p.vol,MON26[p.st-1],p.n,p.po,(p.prob*100).toFixed(1)+'%']));
  const csv=rows.map(r=>r.join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='arete-book.csv';a.click();URL.revokeObjectURL(a.href);toast('Book exported as CSV');
};
$('#risk-to-price').onclick=()=>{location.hash='price'};
function renderAlerts(){
  const alerts=[
    ['TTF front month +6.2% this week','Your gas cap at €38 is now €3.4 in the money. Coverage runs to Sep 26.','Review gas coverage'],
    ['Corn premium is 18% below its 30-day average','Implied volatility eased to 21.4%. Paid cap pricing is relatively favourable.','Review corn cap'],
    ['Brent protection starts next month','12,000 bbl/mo ceiling at $78 begins Mar 26. Premium has been recorded as paid.','View position'],
    ['Copper floor expires in 4 months','250 t/mo floor at $9,200 ends Jun 26. Renewal pricing is available.','Renew floor'],
  ];
  $('#alert-list').innerHTML=alerts.map(a=>'<div class="alert-line"><b>'+a[0]+'</b><p>'+a[1]+'</p><span class="mono" style="font-size:10px;color:var(--accent)">'+a[2]+' →</span></div>').join('');
}

// ---------- BASIS ----------
let basisPos=null;
function basisData(){
  const m=MKT.brent,N=24,hedge=[],phys=[];
  for(let i=0;i<N;i++){const h=(m.fwd[i]-m.fwd[i+1])/m.fwd[i];const p=h*.86+Math.sin(i*2.3)*.012;hedge.push(h);phys.push(p)}
  return {hedge,phys};
}
function stats(x,y){const n=x.length,mx=x.reduce((a,b)=>a+b)/n,my=y.reduce((a,b)=>a+b)/n;let sxy=0,sxx=0,syy=0;for(let i=0;i<n;i++){sxy+=(x[i]-mx)*(y[i]-my);sxx+=(x[i]-mx)**2;syy+=(y[i]-my)**2}const beta=sxy/sxx,r=sxy/Math.sqrt(sxx*syy);return{beta,r,r2:r*r,se:Math.sqrt(syy/n)}}
function renderBasis(){
  const {hedge,phys}=basisData(),s=stats(hedge,phys);
  $('#basis-kpis').innerHTML=[['Correlation',s.r.toFixed(3),'Brent vs North Sea physical'],['R²',s.r2.toFixed(3),'Variance explained by hedge'],['Hedge ratio',s.beta.toFixed(2)+'×','Minimum-variance'],['Residual basis risk',(s.se*100).toFixed(1)+'%','Monthly std dev']].map(k=>'<div class="kpi"><span>'+k[0]+'</span><b>'+k[1]+'</b><span>'+k[2]+'</span></div>').join('');
  $('#basis-read').textContent='Brent explains '+(s.r2*100).toFixed(0)+'% of the monthly movement in this physical grade. A minimum-variance hedge uses '+s.beta.toFixed(2)+' units of Brent per physical unit; the remaining '+(s.se*100).toFixed(1)+'% monthly deviation is basis risk that a Brent-settled payout does not remove.';
  const cv=$('#basis');if(!cv||!cv.clientWidth)return;const ctx=cv.getContext('2d');const W=cv.width=cv.clientWidth*2,H=cv.height=cv.clientHeight*2;
  const all=hedge.concat(phys),lo=Math.min(...all)*1.3,hi=Math.max(...all)*1.3;
  const X=v=>50+(v-lo)/(hi-lo)*(W-90),Y=v=>H-50-(v-lo)/(hi-lo)*(H-90);
  ctx.strokeStyle='#e3e1da';for(let i=0;i<5;i++){const y=30+i*(H-80)/4;ctx.beginPath();ctx.moveTo(50,y);ctx.lineTo(W-40,y);ctx.stroke()}
  hedge.forEach((h,i)=>{ctx.beginPath();ctx.arc(X(h),Y(phys[i]),5,0,7);ctx.fillStyle='rgba(29,109,79,.65)';ctx.fill()});
  ctx.strokeStyle='#c4523a';ctx.lineWidth=2;ctx.beginPath();const my=phys.reduce((a,b)=>a+b)/phys.length,mx=hedge.reduce((a,b)=>a+b)/hedge.length;ctx.moveTo(X(lo),Y(my+s.beta*(lo-mx)));ctx.lineTo(X(hi),Y(my+s.beta*(hi-mx)));ctx.stroke();
  ctx.fillStyle='#77746c';ctx.font='18px "Geist Mono",monospace';ctx.fillText('Brent monthly return →',W/2-100,H-12);ctx.save();ctx.translate(18,H/2+80);ctx.rotate(-Math.PI/2);ctx.fillText('Physical monthly return →',0,0);ctx.restore();
}
function basisLine(p,physPrice){
  const d=Math.max(0,physPrice-p.K),dd=p.cap?Math.min(d,p.cap):d;
  return {physical:physPrice,payout:dd*p.vol,effective:physPrice-dd};
}
$('#basis-form').onsubmit=e=>{
  e.preventDefault();basisPos={K:parseFloat($('#b-K').value)||78,vol:parseFloat($('#b-vol').value)||12000,cap:0};
  const rows=[60,65,70,75,78,80,85,90,95,100].map(s=>{const r=basisLine(basisPos,s);return '<tr><td class="mono">'+fmt(s)+'</td><td class="mono">'+fmt0(r.payout)+'</td><td class="mono">'+fmt(r.effective)+'</td></tr>'}).join('');
  $('#basis-out').innerHTML='<h4 style="font-size:14px;margin-bottom:12px">Monthly settlement · '+fmt0(basisPos.vol)+' bbl</h4><table><thead><tr><th>Physical price</th><th>Payout</th><th>Effective cost /bbl</th></tr></thead><tbody>'+rows+'</tbody></table>';
  toast('Settlement schedule calculated');
};

// ---------- DEVELOPERS ----------
function renderDev(){
  const req={method:'POST',path:'/v1/quotes',body:{market:state.mkt,side:state.side,structure:'paid',limit:state.K,cap:state.cap||null,volume_per_month:state.vol,start_month:state.st,months:state.n}};
  $('#req-view').innerHTML='<span class="http-method">POST</span><span class="http-path">/v1/quotes</span>\nContent-Type: application/json\nIdempotency-Key: <span class="json-str">"quote-8f31c2"</span>\n\n'+syntaxJson(req.body);
  $('#req-copy').onclick=()=>copyText('curl -X POST https://api.arete.example/v1/quotes \\\n  -H "Content-Type: application/json" \\\n  -H "Idempotency-Key: quote-8f31c2" \\\n  -d \''+JSON.stringify(req.body)+'\'','cURL request copied');
  runApi(req);
}
function syntaxJson(o){return JSON.stringify(o,null,2).replace(/"([^"]+)":/g,'<span class="json-key">"$1"</span>:').replace(/: "([^"]*)"/g,': <span class="json-str">"$1"</span>').replace(/: ([\d.]+)/g,': <span class="json-num">$1</span>').replace(/: (true|false|null)/g,': <span class="json-bool">$1</span>')}
function apiRespond(req){
  const b=req.body,m=MKT[b.market]||MKT.brent;
  const local={mkt:b.market,side:b.side,K:b.limit,vol:b.volume_per_month,cap:b.cap||0,st:b.start_month,n:b.months,freq:'monthly',structure:'paid'};
  const r=price(local);
  return {quote_id:'q_'+Math.abs(JSON.stringify(b).split('').reduce((a,c)=>((a<<5)-a+c.charCodeAt(0))|0,0)).toString(16),market:m.name,instrument:{type:local.side==='ceiling'?'cap':'floor',structure:'paid',limit:local.K,payout_cap:local.cap||null,volume_per_month:local.vol,months:local.n,start:MON26[local.st-1],settlement:'monthly_cash',reference:m.curve},premium:{upfront:Math.round(r.pay*100)/100,currency:'USD',per_unit:Math.round(r.pay/(local.vol*local.n)*10000)/10000,due:'on_binding'},expected:{payout:Math.round(r.prem*100)/100,probability:Math.round(r.prob*1000)/1000},model:'black76-bachelier-v1',valid_for_seconds:900,disclaimer:'Illustrative local response. No transaction is executed.'};
}
function runApi(req){
  const t0=performance.now();const res=apiRespond(req);const ms=Math.max(1,Math.round(performance.now()-t0));
  $('#resp-view').innerHTML='<span class="http-method">200 OK</span> <span style="color:var(--faint);font-size:10px">· '+ms+' ms · local pricing engine</span>\n\n'+syntaxJson(res);
  $('#resp-copy').onclick=()=>copyText(JSON.stringify(res,null,2),'Response copied');
}
$('#api-form').onsubmit=e=>{
  e.preventDefault();
  const ep=$('#api-endpoint').value;
  if(ep==='/v1/markets'){
    $('#req-view').innerHTML='<span class="http-method">GET</span><span class="http-path">/v1/markets</span>';
    const res={markets:Object.entries(MKT).map(([id,m])=>({id,name:m.name,unit:m.unit,spot:m.spot,curve:m.curve}))};
    $('#resp-view').innerHTML='<span class="http-method">200 OK</span>\n\n'+syntaxJson(res);$('#resp-copy').onclick=()=>copyText(JSON.stringify(res,null,2),'Response copied');return;
  }
  if(ep==='/v1/curves'){
    $('#req-view').innerHTML='<span class="http-method">GET</span><span class="http-path">/v1/markets/brent/curve</span>';
    const res={market:'brent',currency:'USD',unit:'bbl',points:MKT.brent.fwd.map((v,i)=>({month:MON26[i],forward:v}))};
    $('#resp-view').innerHTML='<span class="http-method">200 OK</span>\n\n'+syntaxJson(res);$('#resp-copy').onclick=()=>copyText(JSON.stringify(res,null,2),'Response copied');return;
  }
  let body;try{body=JSON.parse($('#api-body').value)}catch(err){$('#resp-view').textContent='400 Bad Request\n\nInvalid JSON: '+err.message;return}
  if(body.months<1||body.months>36){$('#resp-view').textContent='422 Unprocessable Entity\n\n{"detail":"months must be between 1 and 36"}';return}
  const req={method:'POST',path:'/v1/quotes',body};
  $('#req-view').innerHTML='<span class="http-method">POST</span><span class="http-path">/v1/quotes</span>\nContent-Type: application/json\nIdempotency-Key: <span class="json-str">"quote-8f31c2"</span>\n\n'+syntaxJson(body);
  runApi(req);
};
$('#dev-endpoints').innerHTML=[
  ['GET','/v1/markets','List all 25 markets, units and benchmark references'],
  ['GET','/v1/markets/{id}/curve','Monthly forward points with curve timestamp'],
  ['POST','/v1/quotes','Price paid protection. Idempotency-Key required. 15-minute expiry'],
  ['POST','/v1/protections','Intended booking endpoint — not connected to a ledger in this prototype'],
  ['GET','/v1/settlements','Intended monthly fixing and cash-flow schedule'],
].map(e=>'<div class="alert-line" style="padding:14px 0"><span class="http-method" style="display:inline-block;min-width:44px">'+e[0]+'</span> <span class="mono" style="font-size:12px">'+e[1]+'</span><p style="margin-top:4px">'+e[2]+'</p></div>').join('');

// ---------- INSTITUTIONS ----------
function drawInstWidget(){
  const logo=$('#inst-logo').value||'NORDIC FOODS',col=$('#inst-color').value||'#1d6d4f';
  $('#widget-out').innerHTML='<div style="border:1px solid var(--line-strong);border-radius:14px;padding:28px;max-width:520px;background:#fff"><div style="font-family:var(--sans);font-weight:600;letter-spacing:-.02em;font-size:18px;margin-bottom:4px">'+logo.replace(/</g,'&lt;')+'</div><div style="font-size:12px;color:var(--sub);margin-bottom:20px">Commodity cost protection · powered by Arête</div><div style="font-size:13px;color:var(--sub)">Brent Crude · paid price cap</div><div style="font-family:var(--mono);font-size:40px;letter-spacing:-.04em;margin:6px 0 18px;color:'+col.replace(/[^#0-9a-f]/gi,'')+'">$'+fmt0(price(state).pay)+'</div><div style="font-size:12px;color:var(--sub);margin-bottom:18px">Upfront premium · '+MON26[state.st-1]+' – '+MON26[state.st-2+state.n]+' · '+fmt0(state.vol)+' bbl/mo</div><button class="btn" style="background:'+col.replace(/[^#0-9a-f]/gi,'')+';border-color:'+col.replace(/[^#0-9a-f]/gi,'')+';width:100%" id="widget-quote">Get indicative quote</button><div style="font-size:10px;color:var(--faint);margin-top:14px;line-height:1.5">Illustrative widget preview. Quotes use the same local pricing engine as the main app.</div></div>';
  $('#widget-quote').onclick=()=>{location.hash='price'};
}
['inst-logo','inst-color'].forEach(id=>$('#'+id).addEventListener('input',drawInstWidget));

// ---------- 3D PEAK ----------
const PK={ready:false};
window.PK=PK;
function initPeak(){
  const cv=$('#peak-cv');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let gl=null;
  try { gl=cv.getContext('webgl2',{antialias:true,alpha:true,powerPreference:'high-performance'})||cv.getContext('webgl',{antialias:true,alpha:true}); } catch(e){ gl=null; }
  const can3d=typeof THREE!=="undefined"&&!!gl&&"DecompressionStream" in window&&typeof PK_MOUNTAIN!=="undefined";
  if(reduced||!can3d){cv.style.display='none';$('#peak-static').style.display='block';return;}
  let R3;
  try{
    R3=new THREE.WebGLRenderer({canvas:cv,context:gl,antialias:true,alpha:true,powerPreference:'high-performance'});
  }catch(e){
    cv.style.display='none';$('#peak-static').style.display='block';return;
  }
  R3.setPixelRatio(Math.min(devicePixelRatio,1.75));
  R3.toneMapping=THREE.ACESFilmicToneMapping;R3.toneMappingExposure=1.02;
  R3.outputEncoding=THREE.sRGBEncoding;
  const scene=new THREE.Scene();
  scene.fog=new THREE.FogExp2(0xc5d2df,0.00014);
  const camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,1,42000);
  const wrap=$('#peak-wrap');
  let scrollP=0,run=true,clock=0,lastT=0,rafId=0,activeView=true;
  const pointer={x:0,y:0,tx:0,ty:0};
  const finePointer=window.matchMedia('(pointer: fine)').matches;
  const camCurve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(1050,1950,5250),
    new THREE.Vector3(560,1800,4150),
    new THREE.Vector3(-1750,2050,3450),
    new THREE.Vector3(-2900,2950,2200),
    new THREE.Vector3(-1900,4150,1250),
    new THREE.Vector3(-450,4950,700),
  ]);
  const lookCurve=new THREE.CatmullRomCurve3([
    new THREE.Vector3(0,2650,0),
    new THREE.Vector3(0,2750,0),
    new THREE.Vector3(0,2900,0),
    new THREE.Vector3(0,3100,0),
    new THREE.Vector3(0,3350,0),
    new THREE.Vector3(0,3520,0),
  ]);
  const resize=()=>{const w=wrap.clientWidth,h=wrap.clientHeight;R3.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<760?62:52;camera.updateProjectionMatrix()};
  resize();window.addEventListener('resize',resize);
  const setScroll=()=>{const doc=document.documentElement;scrollP=Math.max(0,Math.min(1,scrollY/(doc.scrollHeight-innerHeight||1)))};
  addEventListener('scroll',setScroll,{passive:true});setScroll();
  if(finePointer){addEventListener('pointermove',e=>{pointer.tx=(e.clientX/innerWidth-.5)*2;pointer.ty=(e.clientY/innerHeight-.5)*2},{passive:true})}
  document.addEventListener('visibilitychange',()=>{run=!document.hidden&&activeView;if(run&&!rafId){lastT=0;rafId=requestAnimationFrame(frame)}});
  const onHash=()=>{activeView=(location.hash.replace('#','').split('?')[0]||'overview')==='overview';run=activeView&&!document.hidden;if(run&&!rafId){lastT=0;rafId=requestAnimationFrame(frame)}};
  addEventListener('hashchange',onHash);onHash();
  // Shared animation clock: all motion is dt-based and pauses off-screen / on other routes.
  let A=null;
  async function buildAlp(cv,A,small){
    const bin=Uint8Array.from(atob(A.h.b64),c=>c.charCodeAt(0));
    const raw=await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream("deflate"))).arrayBuffer();
    const q=new Uint16Array(raw),NH=A.h.n,HM=A.height/65535;
    const Hs=(x,z)=>{
      if(x<A.h.minX||x>A.h.maxX||z<A.h.minZ||z>A.h.maxZ)return 0;
      const fx=Math.min(NH-1.001,Math.max(0,(x-A.h.minX)/(A.h.maxX-A.h.minX)*(NH-1)));
      const fz=Math.min(NH-1.001,Math.max(0,(z-A.h.minZ)/(A.h.maxZ-A.h.minZ)*(NH-1)));
      const xi=fx|0,zi=fz|0,tx=fx-xi,tz=fz-zi,i=zi*NH+xi;
      return HM*((q[i]*(1-tx)+q[i+1]*tx)*(1-tz)+(q[i+NH]*(1-tx)+q[i+NH+1]*tx)*tz);
    };
    const TOPX=0,TOPZ=0,TOPY=A.height;
    scene.add(new THREE.HemisphereLight(0xcfe0f2,0x5a5850,0.48));
    const sunL=new THREE.DirectionalLight(0xfff0dc,2.4);sunL.position.set(-5000,8000,3000);scene.add(sunL);
    const sunDir=new THREE.Vector3(-.55,.62,.55).normalize();
    const modelBin=Uint8Array.from(atob(A.glb),c=>c.charCodeAt(0));
    const gltf=await new Promise((resolve,reject)=>new THREE.GLTFLoader().parse(modelBin.buffer,"",resolve,reject));
    const mat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.91,metalness:0});
    mat.onBeforeCompile=sh=>{
      sh.uniforms.uTime={value:0};sh.uniforms.uShock={value:0};mat.userData.sh=sh;
      sh.vertexShader="varying vec3 vWorldPos; varying vec3 vWorldNormal;\n"+sh.vertexShader.replace("#include <worldpos_vertex>","#include <worldpos_vertex>\nvWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWorldNormal = inverseTransformDirection(transformedNormal, viewMatrix);");
      const noise="float h3(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}\nfloat mn(vec3 p){vec3 i=floor(p);vec3 f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}\n";
      sh.fragmentShader="uniform float uTime; uniform float uShock; varying vec3 vWorldPos; varying vec3 vWorldNormal;\n"+noise+sh.fragmentShader.replace("#include <color_fragment>",`#include <color_fragment>
      float broad = mn(vWorldPos * 0.0018);
      float grain = mn(vWorldPos * 0.017) * 0.6 + mn(vWorldPos * 0.071) * 0.4;
      float strata = sin(vWorldPos.y * 0.045 + broad * 7.0) * 0.5 + 0.5;
      vec3 rock = mix(vec3(0.11, 0.13, 0.15), vec3(0.34, 0.35, 0.35), broad * 0.65 + grain * 0.35);
      rock *= 0.82 + strata * 0.24;
      float snowAltitude = smoothstep(1550.0, 2750.0, vWorldPos.y + (broad - 0.5) * 850.0);
      float snowSlope = smoothstep(0.42, 0.78, vWorldNormal.y + (grain - 0.5) * 0.16);
      float snow = snowAltitude * snowSlope;
      vec3 snowColor = mix(vec3(0.70, 0.77, 0.83), vec3(0.94, 0.96, 0.97), grain * 0.55 + 0.35);
      diffuseColor.rgb = mix(rock, snowColor, snow);
      `).replace("#include <dithering_fragment>","#include <dithering_fragment>\nfloat sr = (sin(vWorldPos.x * 0.0016 + uTime * 0.3) * 0.5 + 0.5) * pow(max(0.0, 1.0 - vWorldPos.y / 3800.0), 2.0);\ngl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0, 0.45, 0.32), sr * uShock * 0.8);");
    };
    const mountain=gltf.scene;
    mountain.scale.fromArray(A.scale);mountain.position.fromArray(A.position);
    mountain.traverse(o=>{if(o.isMesh){o.material=mat;o.castShadow=o.receiveShadow=true}});
    scene.add(mountain);
    PK.asset="tripo-alpine-horn";PK.triangles=A.triangles;
    const detail=small?.45:1;
    const cl=[],cp=[],cc=[],cw=[],ccol=[];
    for(let i=0;i<230*detail;i++){
      const a=seededRandom()*6.28,r=2400+seededRandom()*3800,y=500+seededRandom()*3400;
      const x=Math.cos(a)*r,z=Math.sin(a)*r;if(y<Hs(x,z)+120)continue;
      cl.push(x,y,z);const sz=200+seededRandom()*420;cp.push(sz,sz);cw.push(.1+seededRandom()*.25);
      const tint=seededRandom();cc.push(.72+tint*.12,.76+tint*.1,.8+tint*.08);
    }
    const cg=new THREE.BufferGeometry();cg.setAttribute('position',new THREE.Float32BufferAttribute(cl,3));cg.setAttribute('aSize',new THREE.Float32BufferAttribute(cp,2));cg.setAttribute('aAlpha',new THREE.Float32BufferAttribute(cw,1));cg.setAttribute('color',new THREE.Float32BufferAttribute(cc,3));
    const cvs=document.createElement('canvas');cvs.width=cvs.height=64;const cx=cvs.getContext('2d');const gr=cx.createRadialGradient(32,32,2,32,32,30);gr.addColorStop(0,'rgba(255,255,255,.85)');gr.addColorStop(.4,'rgba(255,255,255,.4)');gr.addColorStop(1,'rgba(255,255,255,0)');cx.fillStyle=gr;cx.fillRect(0,0,64,64);
    const cloudMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,vertexColors:true,uniforms:{uTime:{value:0},uMap:{value:new THREE.CanvasTexture(cvs)},uOpacity:{value:.62}},vertexShader:"attribute vec2 aSize; attribute float aAlpha; varying float vA; varying vec3 vC; uniform float uTime; void main(){vA=aAlpha;vC=color;vec3 p=position;p.x+=sin(uTime*.025+position.z*.001)*180.;p.z+=cos(uTime*.02+position.x*.001)*120.;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=aSize.x*(700./-mv.z);}",fragmentShader:"uniform sampler2D uMap;uniform float uOpacity;varying float vA;varying vec3 vC;void main(){float a=texture2D(uMap,gl_PointCoord).a*vA*uOpacity;if(a<.01)discard;gl_FragColor=vec4(vC,a);}"});
    const clouds=new THREE.Points(cg,cloudMat);clouds.renderOrder=3;scene.add(clouds);
    // Snow
    const sp=[];for(let i=0;i<1500*detail;i++)sp.push((seededRandom()-.5)*11000,seededRandom()*6000,(seededRandom()-.5)*11000);
    const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));
    const snowMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:{value:0},uOpacity:{value:.5}},vertexShader:"uniform float uTime;void main(){vec3 p=position;p.y=mod(p.y-uTime*90.,6000.);p.x+=sin(uTime*.5+p.y*.01)*40.;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(1400./-mv.z,1.,3.5);}",fragmentShader:"uniform float uOpacity;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(.95,.97,1.,(1.-d*2.)*uOpacity);}"});
    const snowPts=new THREE.Points(sg,snowMat);snowPts.renderOrder=4;scene.add(snowPts);
    // Waypoints
    const wpGroup=new THREE.Group();scene.add(wpGroup);
    function label(txt,sub){
      const c=document.createElement('canvas');c.width=512;c.height=128;const x=c.getContext('2d');
      x.fillStyle='rgba(12,16,20,.72)';x.beginPath();x.roundRect(56,18,400,74,10);x.fill();
      x.fillStyle='#f2efe8';x.font='500 25px "Geist Mono",monospace';x.fillText(txt,76,52);
      x.fillStyle='#e8a583';x.font='20px "Geist Mono",monospace';x.fillText(sub,76,80);
      const t=new THREE.CanvasTexture(c);const sm=new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false});
      const s=new THREE.Sprite(sm);s.scale.set(560,140,1);return s;
    }
    const wps=[['CAP','Brent · $78/bbl',900,-1200],['FLOOR','Copper · $9,200/t',-1900,900],['COLLAR','TTF Gas · €28–38',2200,1400],['BASIS','JKM LNG · correlation',-700,2700]];
    const wpSprites=[];
    wps.forEach(([t,s,x,z])=>{const sp=label(t,s);sp.position.set(x,Hs(x,z)+380,z);sp.userData.baseY=sp.position.y;wpGroup.add(sp);wpSprites.push(sp);
      const lg=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,Hs(x,z),z),new THREE.Vector3(x,Hs(x,z)+310,z)]);
      wpGroup.add(new THREE.Line(lg,new THREE.LineBasicMaterial({color:0x1d6d4f,transparent:true,opacity:.6})));
    });
    // Avalanche / market shock
    let shock=0;const shockRing=new THREE.Mesh(new THREE.RingGeometry(1,1.02,128),new THREE.MeshBasicMaterial({color:0xe07850,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
    shockRing.rotation.x=-Math.PI/2;shockRing.position.set(0,Hs(0,0)+900,0);scene.add(shockRing);
    PK.shock=()=>{shock=1;toast('Market shock simulation — avalanche released')};
    // Frame
    const cam=new THREE.Vector3(),look=new THREE.Vector3();
    function frame(t){
      rafId=0;if(!run)return;
      const dt=lastT?Math.min((t-lastT)/1000,.05):0;lastT=t;clock+=dt;
      pointer.x+=(pointer.tx-pointer.x)*Math.min(1,dt*3.5);
      pointer.y+=(pointer.ty-pointer.y)*Math.min(1,dt*3.5);
      const p=scrollP;
      camCurve.getPoint(Math.min(1,p),cam.position);
      cam.position.x+=Math.sin(clock*.21)*14+pointer.x*42;
      cam.position.y+=Math.sin(clock*.33)*8+pointer.y*24;
      cam.position.y=Math.max(cam.position.y,Hs(cam.position.x,cam.position.z)+180);
      lookCurve.getPoint(Math.min(1,p),look);look.x+=pointer.x*18;look.y-=pointer.y*12;
      camera.lookAt(look);
      if(mat.userData.sh){mat.userData.sh.uniforms.uTime.value=clock;mat.userData.sh.uniforms.uShock.value=shock}
      cloudMat.uniforms.uTime.value=clock;snowMat.uniforms.uTime.value=clock;
      const fade=p<.62?1:Math.max(0,1-(p-.62)/.24);
      cloudMat.uniforms.uOpacity.value=.62*fade;snowMat.uniforms.uOpacity.value=.5*fade;
      wpSprites.forEach((s,i)=>{s.material.opacity=fade;s.position.y=s.userData.baseY+Math.sin(clock*.7+i*1.7)*12;});
      wpGroup.children.forEach(c=>{if(c.isLine)c.material.opacity=.6*fade});
      if(shock>0){shock=Math.max(0,shock-dt*.16);const ph=1-shock;shockRing.scale.setScalar(1+ph*2600);shockRing.material.opacity=shock*.5;shockRing.position.y=Hs(0,0)+900-ph*500}
      else shockRing.material.opacity=0;
      R3.render(scene,camera);
      rafId=requestAnimationFrame(frame);
    }
    PK.stats=()=>({calls:R3.info.render.calls,triangles:R3.info.render.triangles,geometries:R3.info.memory.geometries,textures:R3.info.memory.textures});
    PK.sample=()=>({x:camera.position.x,y:camera.position.y,z:camera.position.z,ground:Hs(camera.position.x,camera.position.z),progress:scrollP,clouds:cl.length/3,shock,clock});
    PK.stop=()=>{run=false;if(rafId){cancelAnimationFrame(rafId);rafId=0}};
    PK.run=()=>{if(!run){run=true;lastT=0;rafId=requestAnimationFrame(frame)}};
    PK.ready=true;
    rafId=requestAnimationFrame(frame);
  }
  buildAlp(cv,PK_MOUNTAIN,innerWidth<760).catch(e=>{
    console.error('Mountain scene failed:',e);
    cv.style.display='none';$('#peak-static').style.display='block';PK.ready=false;
  });
}

// ---------- INIT ----------
loadBook();
renderStrip();
readShare();
syncUI();
route();
renderMkt();
renderAlerts();
initPeak();
// Deep-link to risk when returning with stored book
if(location.hash==='#risk')renderRisk();
