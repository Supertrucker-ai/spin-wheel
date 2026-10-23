// ---- app: data, screens, spin, remove-winner mode ----
const MIN=2,MAX=50,PRESETS=[2,3,4,6,8,10,12,20,30,50];
const $=id=>document.getElementById(id);
const uid=()=>Date.now().toString(36)+rnd(1e9).toString(36);
function makeSlots(n){const o=[];for(let i=0;i<n;i++)o.push({id:uid(),text:String(i+1),color:defaultColor(i,n),emoji:''});return o}
function newWheel(name,n){return{id:uid(),name:name||'My Wheel',slots:makeSlots(n||6)}}
let data=Store.load();
if(!data||!Array.isArray(data.wheels)||!data.wheels.length){const w=newWheel('My Wheel',6);data={wheels:[w],cur:w.id,settings:{}}}
data.settings=data.settings||{};data.stats=data.stats||{};
data.wheels.forEach(w=>w.slots.forEach(s=>{if(!s.id)s.id=uid()}));
const save=()=>Store.save(data);
const Board=makeBoard(()=>data,save);const renderBoard=()=>renderBoardInto(Board,cur(),$);
const cur=()=>data.wheels.find(w=>w.id===data.cur)||data.wheels[0];
Sound.muted=!!data.settings.mute;
// session = which original slots are still on the wheel (remove-winner mode); never written into the saved wheel
let session=null;
function resetSession(){const w=cur();session={id:w.id,active:w.slots.map((_,i)=>i),picked:[]}}
function sess(){if(!session||session.id!==cur().id||session.active.some(i=>i>=cur().slots.length))resetSession();return session}
const live=()=>{const w=cur();return sess().active.map(i=>w.slots[i])};
let rot=0,spinning=false,anim=null,lastWin=-1,fling=null,speed=1;
// ---- screens ----
function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id===id));if(id==='play')layout();if(id==='edit')renderEdit();if(id==='wheels')renderWheels();if(id==='board')renderBoard()}
// ---- play screen ----
const cv=$('wheel');let cssSize=300;
function layout(){const b=$('wheelBox').getBoundingClientRect();cssSize=Math.max(120,Math.floor(Math.min(b.width-28,b.height-34)));const d=Math.min(3,devicePixelRatio||1);
  cv.style.width=cv.style.height=cssSize+'px';cv.width=cv.height=Math.round(cssSize*d);$('wheelWrap').style.width=$('wheelWrap').style.height=cssSize+'px';$('wheelWrap').style.marginTop='16px';draw();renderPlay()}
function draw(){drawWheel(cv,live(),rot,fling||{})}
function renderPlay(){const w=cur(),s=sess();$('wheelTitle').textContent=w.name||'My Wheel';$('muteBtn').textContent=Sound.muted?'🔇':'🔊';
  const rm=!!data.settings.remove;$('remBtn').classList.toggle('on',rm);$('remBtn').textContent=rm?'Remove ON':'Remove OFF';$('toEdit').textContent=s.picked.length?'✏️':'✏️ Make';
  $('resetBtn').style.display=s.picked.length?'':'none';
  const pk=$('picked');pk.classList.toggle('on',s.picked.length>0);pk.innerHTML='';
  s.picked.forEach((i,k)=>{const sl=w.slots[i],e=document.createElement('div');e.className='pk';e.style.background=sl.color;e.style.color=inkFor(sl.color);e.textContent=(k+1)+'. '+(labelOf(sl)||'?');pk.appendChild(e)});
  pk.scrollLeft=pk.scrollWidth;
  $('spinBtn').textContent=s.active.length<2?'🏆 WINNER!':'SPIN!'}
let lastIdx=null;
function onRot(){const n=live().length,i=indexAt(rot,n);if(lastIdx!==null&&i!==lastIdx){Sound.tick();kick()}lastIdx=i;draw()}
let kickT=0;function kick(){kickT=performance.now()}
(function ptr(){const t=performance.now()-kickT,a=t<120?-22*(1-t/120):0;$('pointer').style.transform='rotate('+a+'deg)';requestAnimationFrame(ptr)})();
// fair spin: pick winner uniformly first, then plan a decelerating rotation that lands inside it
function spin(dir,power){if(spinning||fling)return;const n=live().length;if(n<2){celebrate(true);return}
  Sound.unlock();dir=dir<0?-1:1;power=Math.max(0.5,Math.min(2.5,power||1));
  const win=rnd(n),f=0.1+rnd(1000)/1000*0.8,turns=Math.round(3+power*2+rnd(3));
  const base=-(win+f)*TAU/n;const r0=rot;let k=Math.floor((r0-base)/TAU);let target=base+k*TAU;
  if(dir>0){while(target<r0+turns*TAU)target+=TAU}else{while(target>r0-turns*TAU)target-=TAU}
  const D=(3800+power*900)/speed,t0=performance.now();spinning=true;lastIdx=indexAt(rot,n);
  anim={win,target};
  (function step(now){const t=Math.min(1,(now-t0)/D),e=1-Math.pow(1-t,3.2);rot=r0+(target-r0)*e;onRot();
    if(t<1)requestAnimationFrame(step);else{rot=mod(target,TAU);spinning=false;draw();lastWin=indexAt(rot,n);anim=null;announce(lastWin)}})(t0)}
function announce(i){const s=live()[i];Board.record(cur(),s,false);showWin(s,false)}
function showWin(s,champ){$('winHead').textContent=champ?'🏆 Champion!':'🎉 It\'s…';const b=$('winBadge');b.style.background=s.color;b.style.color=inkFor(s.color);
  b.innerHTML='';if(s.emoji){const e=document.createElement('span');e.className='e';e.textContent=s.emoji;b.appendChild(e)}b.appendChild(document.createTextNode(s.text||(s.emoji?'':'?')));
  b.style.fontSize=champ?'54px':'44px';$('againBtn').textContent=champ?'🔁 Reset wheel':'🔄 Spin again';$('winOv').dataset.champ=champ?'1':'';
  $('winOv').classList.add('on');champ?Sound.champ():Sound.win();Confetti.run($('confetti'),[s.color,'#ffc83d','#ffffff','#ff4dae','#29a8ff','#8ee03b'],champ)}
function celebrate(counted){const s=live()[0];if(!s)return;if(!counted)Board.record(cur(),s,true);showWin(s,true)}
function closeWin(again){const champ=$('winOv').dataset.champ==='1';$('winOv').classList.remove('on');Confetti.stop();
  if(champ){if(again){resetSession();rot=0;layout()}return}
  if(data.settings.remove&&lastWin>=0&&live().length>1){removeWinner(lastWin,()=>{if(live().length<2)celebrate();else if(again)spin(1,1)})}
  else if(again)spin(1,1)}
function removeWinner(i,done){const s=sess(),t0=performance.now(),D=650/speed;Sound.pop();
  (function step(now){const t=Math.min(1,(now-t0)/D);fling={fling:i,flingT:t};draw();
    if(t<1)return requestAnimationFrame(step);
    fling=null;const n=s.active.length;s.picked.push(s.active[i]);s.active.splice(i,1);
    // keep the remaining slices where they were relative to the pointer: rescale rotation
    rot=rot*(n-1)/n;lastWin=-1;lastIdx=null;draw();renderPlay();done&&done()})(t0)}
// flick / drag on the wheel
(function(){const el=$('wheelWrap');let drag=null;
  const ang=e=>{const r=cv.getBoundingClientRect();return Math.atan2(e.clientY-(r.top+r.height/2),e.clientX-(r.left+r.width/2))};
  el.addEventListener('pointerdown',e=>{if(spinning||fling)return;Sound.unlock();drag={a:ang(e),hist:[{a:0,t:performance.now()}],acc:0,r0:rot};try{el.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault()});
  el.addEventListener('pointermove',e=>{if(!drag)return;const a=ang(e);let d=a-drag.a;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;drag.a=a;drag.acc+=d;rot=drag.r0+drag.acc;onRot();
    const now=performance.now();drag.hist.push({a:drag.acc,t:now});while(drag.hist.length>2&&now-drag.hist[0].t>120)drag.hist.shift()});
  const up=()=>{if(!drag)return;const h=drag.hist,now=performance.now();let v=0;if(h.length>1){const a=h[0],b=h[h.length-1];if(now-b.t<100&&b.t>a.t)v=(b.a-a.a)/((b.t-a.t)/1000)}drag=null;
    if(Math.abs(v)>2.5)spin(v>0?1:-1,Math.abs(v)/8)};
  el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)})();
// ---- edit screen ----
let editIdx=-1;
function renderEdit(){const w=cur();$('editName').value=w.name;$('count').textContent=w.slots.length;$('minus').disabled=w.slots.length<=MIN;$('plus').disabled=w.slots.length>=MAX;
  const L=$('slotList');L.innerHTML='';w.slots.forEach((s,i)=>{const b=document.createElement('button');b.className='slot';b.dataset.i=i;b.style.background=s.color;b.style.color=inkFor(s.color);
    b.innerHTML='<span class="n"></span><span class="t"></span>';b.firstChild.textContent='#'+(i+1);b.lastChild.textContent=labelOf(s)||'…';b.onclick=()=>openSlot(i);L.appendChild(b)})}
function changed(){resetSession();save();renderEdit()}
function setCount(n){const w=cur();n=Math.max(MIN,Math.min(MAX,n));const old=w.slots.length;if(n===old)return;
  const allDefault=w.slots.every((s,i)=>s.color===defaultColor(i,old));
  if(n<old)w.slots.length=n;else for(let i=old;i<n;i++)w.slots.push({id:uid(),text:String(i+1),color:defaultColor(i%12,12),emoji:''});
  if(allDefault)w.slots.forEach((s,i)=>s.color=defaultColor(i,n));
  if(w.slots.length>1&&w.slots[n-1].color===w.slots[0].color&&!allDefault)w.slots[n-1].color=BASE[(BASE.indexOf(w.slots[0].color)+3)%12];
  changed()}
function openSlot(i){editIdx=i;const s=cur().slots[i];$('slotHead').textContent='Slot '+(i+1);$('slotText').value=s.text;
  const P=$('palette');P.innerHTML='';PALETTE.forEach(c=>{const b=document.createElement('button');b.style.background=c;b.dataset.c=c;b.className=c===s.color?'sel':'';b.setAttribute('aria-label',c);b.onclick=()=>{s.color=c;save();openSlot(i)};P.appendChild(b)});
  const E=$('emojis');E.innerHTML='';['✖️'].concat(EMOJIS).forEach((em,k)=>{const b=document.createElement('button');b.textContent=em;b.className=(k?s.emoji===em:!s.emoji)?'sel':'';b.onclick=()=>{s.emoji=k?em:'';save();openSlot(i)};E.appendChild(b)});
  $('slotOv').classList.add('on')}
$('slotText').addEventListener('input',()=>{const s=cur().slots[editIdx];if(s){s.text=$('slotText').value.slice(0,14);save()}});
$('slotText').addEventListener('keydown',e=>{if(e.key==='Enter')$('slotText').blur()});
$('slotOk').onclick=()=>{$('slotText').blur();$('slotOv').classList.remove('on');changed()};
$('editName').addEventListener('input',()=>{cur().name=$('editName').value.slice(0,24);save()});
$('editName').addEventListener('keydown',e=>{if(e.key==='Enter')$('editName').blur()});
$('minus').onclick=()=>setCount(cur().slots.length-1);$('plus').onclick=()=>setCount(cur().slots.length+1);
PRESETS.forEach(n=>{const b=document.createElement('button');b.className='btn';b.textContent=n;b.dataset.n=n;b.onclick=()=>setCount(n);$('presets').appendChild(b)});
$('randColors').onclick=()=>{const c=randomColors(cur().slots.length);cur().slots.forEach((s,i)=>s.color=c[i]);changed()};
$('rainbow').onclick=()=>{const c=rainbow(cur().slots.length);cur().slots.forEach((s,i)=>s.color=c[i]);changed()};
$('editDone').onclick=()=>{document.activeElement&&document.activeElement.blur();if(!cur().name.trim()){cur().name='My Wheel';save()}show('play')};
// ---- wheels screen ----
let askCb=null;function ask(t,cb){$('askText').textContent=t;askCb=cb;$('askOv').classList.add('on')}
$('askNo').onclick=()=>{$('askOv').classList.remove('on');askCb=null};$('askYes').onclick=()=>{$('askOv').classList.remove('on');const c=askCb;askCb=null;c&&c()};
function renderWheels(){const L=$('wheelList');L.innerHTML='';data.wheels.forEach(w=>{const r=document.createElement('div');r.className='wrow'+(w.id===data.cur?' cur':'');r.dataset.id=w.id;
  const m=document.createElement('canvas');m.className='mini';m.width=m.height=104;drawWheel(m,w.slots,0,{noText:true});
  const nm=document.createElement('button');nm.className='nm load';nm.textContent=(w.name||'Wheel')+' ('+w.slots.length+')';nm.onclick=()=>{data.cur=w.id;save();rot=0;show('play')};
  const d=document.createElement('button');d.className='btn blue dup';d.textContent='📄';d.setAttribute('aria-label','Copy');d.onclick=()=>{const c=JSON.parse(JSON.stringify(w));c.id=uid();c.slots.forEach(x=>x.id=uid());c.name=(w.name+' 2').slice(0,24);data.wheels.splice(data.wheels.indexOf(w)+1,0,c);save();renderWheels()};
  const x=document.createElement('button');x.className='btn red del';x.textContent='🗑️';x.setAttribute('aria-label','Delete');x.onclick=()=>ask('Delete "'+w.name+'"?',()=>{data.wheels=data.wheels.filter(o=>o!==w);delete data.stats[w.id];if(!data.wheels.length)data.wheels.push(newWheel('My Wheel',6));if(!data.wheels.some(o=>o.id===data.cur))data.cur=data.wheels[0].id;save();renderWheels()});
  r.append(m,nm,d,x);L.appendChild(r)})}
$('newWheel').onclick=()=>{const w=newWheel('Wheel '+(data.wheels.length+1),6);data.wheels.push(w);data.cur=w.id;save();rot=0;show('edit')};
$('toBoard').onclick=()=>{if(!spinning&&!fling)show('board')};$('boardBack').onclick=()=>show('play');
$('boardReset').onclick=()=>ask('Clear all wins?',()=>{Board.reset(cur());renderBoard()});
$('wheelsBack').onclick=()=>show('play');
// ---- play buttons ----
$('spinBtn').onclick=()=>spin(1,1);$('toEdit').onclick=()=>{if(!spinning&&!fling)show('edit')};$('toWheels').onclick=()=>{if(!spinning&&!fling)show('wheels')};
$('muteBtn').onclick=()=>{Sound.muted=!Sound.muted;data.settings.mute=Sound.muted;save();renderPlay()};
$('remBtn').onclick=()=>{data.settings.remove=!data.settings.remove;save();renderPlay()};
$('resetBtn').onclick=()=>{if(spinning||fling)return;resetSession();rot=0;lastWin=-1;layout()};
$('againBtn').onclick=()=>closeWin(true);$('winClose').onclick=()=>closeWin(false);
addEventListener('resize',()=>{if($('play').classList.contains('on'))layout()});
document.addEventListener('gesturestart',e=>e.preventDefault());
document.addEventListener('touchmove',e=>{if(!e.target.closest('#slotList,#wheelList,.emo,#picked'))e.preventDefault()},{passive:false});
save();show('play');
// ---- test/build hooks ----
window.__SW={stats:()=>JSON.parse(JSON.stringify(Board.get(cur()))),state:()=>{const s=sess();return{screen:document.querySelector('.screen.on').id,rot,spinning,flinging:!!fling,n:live().length,lastWin,under:indexAt(rot,live().length),live:live().map(x=>({...x})),picked:s.picked.slice(),active:s.active.slice(),wheel:JSON.parse(JSON.stringify(cur())),wheels:data.wheels.length,settings:{...data.settings},win:$('winOv').classList.contains('on'),champ:$('winOv').dataset.champ==='1',winText:$('winBadge').textContent}},
  setSpeed:v=>{speed=v},fontFor:(i)=>{const n=live().length;return fitFont(cv.getContext('2d'),labelOf(live()[i]),cv.width/2,TAU/n)/(Math.min(3,devicePixelRatio||1))},
  icon:()=>{const c=document.createElement('canvas');c.width=c.height=180;const x=c.getContext('2d');x.fillStyle='#2a1a7a';x.fillRect(0,0,180,180);const w=document.createElement('canvas');w.width=w.height=150;drawWheel(w,makeSlots(8).map(s=>({...s,text:''})),0.2,{});
    x.drawImage(w,15,18);x.fillStyle='#ffc83d';x.beginPath();x.arc(90,93,16,0,TAU);x.fill();x.fillStyle='#ff4d6d';x.strokeStyle='#fff';x.lineWidth=4;x.beginPath();x.moveTo(74,6);x.lineTo(106,6);x.lineTo(90,40);x.closePath();x.fill();x.stroke();return c.toDataURL('image/png')}};
