// E2E: iPhone 390x844 (touch, simulated notch) + desktop 1280x800; real taps, no console errors, no network
const {chromium,devices}=require('playwright');const path=require('path');const fs=require('fs');
const URL='file://'+path.join(__dirname,'index.html');const SHOTS=path.join(__dirname,'shots');fs.mkdirSync(SHOTS,{recursive:true});
const EXE=process.env.CHROME||'/usr/bin/google-chrome';const results=[];let failures=0;
function check(n,c,x){results.push((c?'PASS ':'FAIL ')+n+(x?' — '+x:''));console.log(results[results.length-1]);if(!c)failures++}
const SAFE={top:47,bottom:34};
const iphoneInit=`document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent=':root{--sat:${SAFE.top}px!important;--sab:${SAFE.bottom}px!important}';document.head.appendChild(s)});`;
async function newCtx(b,kind){const o=kind==='iphone'?{...devices['iPhone 13'],viewport:{width:390,height:844},deviceScaleFactor:2}:{viewport:{width:1280,height:800}};const ctx=await b.newContext(o);if(kind==='iphone')await ctx.addInitScript(iphoneInit);return ctx}
async function open(ctx,kind){const page=await ctx.newPage();const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  page.on('request',r=>{if(!/^(file|data|blob):/.test(r.url()))errors.push('NETWORK: '+r.url())});await page.goto(URL);await page.evaluate(()=>window.__SW.setSpeed(6));return {ctx,page,errors,kind}}
const st0=P=>P.page.evaluate(()=>window.__SW.state());const st=P=>P.page.evaluate(()=>window.__SW.state());
async function tap(P,sel){const l=P.page.locator(sel).first();await l.waitFor({state:'visible'});if(P.kind==='desktop')await l.click();else await l.tap()}
const shot=async(P,n)=>{await P.page.waitForTimeout(250);await P.page.screenshot({path:path.join(SHOTS,n)})};
async function layout(P,label){const r=await P.page.evaluate(()=>({sh:document.documentElement.scrollHeight,ih:innerHeight,sw:document.documentElement.scrollWidth,iw:innerWidth}));
  check(`${P.kind} ${label}: no page scroll`,r.sh<=r.ih&&r.sw<=r.iw,JSON.stringify(r));
  const vp=P.page.viewportSize(),top=P.kind==='iphone'?SAFE.top:0,bot=vp.height-(P.kind==='iphone'?SAFE.bottom:0);
  const bad=await P.page.evaluate(([top,bot,w])=>{const o=[];document.querySelectorAll('.screen.on .btn, .ov.on .btn, .screen.on #wheel').forEach(e=>{if(e.offsetParent===null||e.closest('#slotList,#wheelList'))return;if(e.closest('.ov')&&!e.closest('.ov.on'))return;const r=e.getBoundingClientRect();if(r.top<top-1||r.bottom>bot+1||r.left<-1||r.right>w+1)o.push((e.id||e.className)+' '+[r.left,r.top,r.right,r.bottom].map(Math.round))});return o},[top,bot,vp.width]);
  check(`${P.kind} ${label}: inside safe viewport`,!bad.length,bad.slice(0,3).join('; '));
  const small=await P.page.evaluate(()=>{const o=[];document.querySelectorAll('.screen.on .btn,.screen.on .slot,.ov.on button,.screen.on .nm').forEach(e=>{if(e.offsetParent===null)return;const r=e.getBoundingClientRect();if(r.width<43.5||r.height<43.5)o.push(e.id||e.textContent)});return o});
  check(`${P.kind} ${label}: tap targets >=44px`,!small.length,small.slice(0,5).join(','))}
// verify geometry: pixel at pointer tip (radius .95) equals winning slot color
async function pointerColor(P){return P.page.evaluate(()=>{const c=document.getElementById('wheel'),x=c.getContext('2d'),W=c.width;const d=x.getImageData(Math.round(W/2),Math.round(W*0.03),1,1).data;return'#'+[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,'0')).join('')})}
const near=(a,b)=>[1,3,5].every(i=>Math.abs(parseInt(a.substr(i,2),16)-parseInt(b.substr(i,2),16))<=6);
async function spinAndCheck(P,label,how){const before=await st(P);
  if(how==='flick'){const bb=await P.page.locator('#wheel').boundingBox();const cx=bb.x+bb.width/2,cy=bb.y+bb.height/2,R=bb.width*0.35;
    await P.page.mouse.move(cx-R,cy-R*0.3);await P.page.mouse.down();for(let k=1;k<=6;k++){await P.page.mouse.move(cx-R+k*R*0.33,cy-R*0.3-k*R*0.06);await P.page.waitForTimeout(8)}await P.page.mouse.up()}
  else await tap(P,'#spinBtn');
  await P.page.waitForTimeout(100);const mid=await st(P);check(`${P.kind} ${label}: spinning started`,mid.spinning||mid.win);
  await P.page.waitForFunction(()=>window.__SW.state().win,null,{timeout:15000});const s=await st(P);
  const slot=s.live[s.lastWin],col=await pointerColor(P);
  const exp=(slot.emoji?slot.emoji:'')+slot.text;
  check(`${P.kind} ${label}: announced slot under pointer`,s.under===s.lastWin&&s.winText===exp&&near(col,slot.color),`under ${s.under} win ${s.lastWin} '${s.winText}' px ${col} slot ${slot.color}`);return s}
(async()=>{const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox']});
 // fairness / geometry unit check in-page: many seeds via indexAt
 for(const kind of ['iphone','desktop']){const ctx=await newCtx(b,kind);const P=await open(ctx,kind);const pre=kind==='iphone'?'':'desk-';
  let s=await st(P);check(`${kind}: default wheel 6 numbered rainbow slots`,s.n===6&&s.live.map(x=>x.text).join()==='1,2,3,4,5,6');
  await shot(P,pre+'01-play.png');await layout(P,'play');
  await spinAndCheck(P,'SPIN button','btn');await shot(P,pre+'02-win.png');await layout(P,'win popup');
  await tap(P,'#winClose');
  if(kind==='iphone'){const s2=await spinAndCheck(P,'flick','flick');await tap(P,'#winClose')}
  else{await spinAndCheck(P,'drag-flick (mouse)','flick');await tap(P,'#winClose')}
  // edit
  await tap(P,'#toEdit');await layout(P,'edit');
  await tap(P,'#plus');await tap(P,'#plus');s=await st(P);check(`${kind}: + adds slots`,s.wheel.slots.length===8);
  await tap(P,'#minus');s=await st(P);check(`${kind}: - removes slot`,s.wheel.slots.length===7);
  for(let i=0;i<4;i++)await tap(P,'#minus');await tap(P,'#presets [data-n="2"]');const dis=await P.page.locator('#minus').isDisabled();s=await st(P);check(`${kind}: min 2 (minus disabled)`,s.wheel.slots.length===2&&dis);
  await tap(P,'#presets [data-n="50"]');const pd=await P.page.locator('#plus').isDisabled();s=await st(P);check(`${kind}: preset 50 & max 50`,s.wheel.slots.length===50&&pd);
  await tap(P,'#presets [data-n="6"]');
  await P.page.fill('#editName','Dinner Picker');
  await tap(P,'.slot[data-i="0"]');await P.page.fill('#slotText','Pizza');await tap(P,'#palette [data-c="#29a8ff"]');await tap(P,'#emojis button:nth-child(4)');await shot(P,pre+'04-slot-edit.png');await layout(P,'slot editor');await tap(P,'#slotOk');
  await tap(P,'.slot[data-i="1"]');await P.page.fill('#slotText','Tacos');await tap(P,'#slotOk');
  await shot(P,pre+'03-edit.png');
  await tap(P,'#randColors');s=await st(P);check(`${kind}: random colors changes palette`,s.wheel.slots.some((x,i)=>i>0&&x.color!==s.wheel.slots[i-1].color));
  await tap(P,'#editDone');
  await P.page.reload();await P.page.evaluate(()=>window.__SW.setSpeed(6));s=await st(P);
  check(`${kind}: edits persist after reload`,s.wheel.name==='Dinner Picker'&&s.wheel.slots[0].text==='Pizza'&&s.wheel.slots[0].emoji==='🍕'&&s.wheel.slots[1].text==='Tacos'&&s.n===6,JSON.stringify(s.wheel.slots[0]));
  await shot(P,pre+'05-custom.png');
  // render every slot count 2..50
  if(kind==='iphone'){await tap(P,'#toEdit');let bad=[];for(let n=2;n<=50;n++){await P.page.evaluate(n=>{},n)}
    // use + button repeatedly from 2
    await tap(P,'#presets [data-n="2"]');
    for(let n=2;n<=50;n++){await tap(P,'#editDone');const r=await P.page.evaluate(()=>{const S=window.__SW.state();const f=[];for(let i=0;i<S.n;i++)f.push(window.__SW.fontFor(i));return{n:S.n,min:Math.min(...f)}});
      if(r.n!==n||r.min<7)bad.push(JSON.stringify(r));if(n===50)await shot(P,'06-50-slots.png');if(n===12)await shot(P,'06-12-slots.png');await tap(P,'#toEdit');if(n<50)await tap(P,'#plus')}
    check('iphone: renders 2..50 slots with font >=7px',!bad.length,bad.slice(0,3).join(' '));
    await tap(P,'#editDone');await spinAndCheck(P,'spin with 50 slots','btn');await tap(P,'#winClose');
    await tap(P,'#toEdit');await tap(P,'#presets [data-n="6"]');await tap(P,'#editDone')}
  // wheels: new, duplicate, delete w/ confirm, load
  await tap(P,'#toWheels');await tap(P,'#newWheel');await P.page.fill('#editName','Chores');await tap(P,'#editDone');
  await tap(P,'#toWheels');s=await st(P);check(`${kind}: new wheel saved`,s.wheels===2);
  await tap(P,'.wrow:nth-child(1) .dup');s=await st(P);check(`${kind}: duplicate`,s.wheels===3);await shot(P,pre+'07-wheels.png');await layout(P,'wheels');
  await tap(P,'.wrow:nth-child(2) .del');await shot(P,pre+'08-confirm.png');await tap(P,'#askNo');s=await st(P);check(`${kind}: delete cancel keeps`,s.wheels===3);
  await tap(P,'.wrow:nth-child(2) .del');await tap(P,'#askYes');s=await st(P);check(`${kind}: delete confirm removes`,s.wheels===2);
  await tap(P,'.wrow:nth-child(1) .load');s=await st(P);check(`${kind}: load wheel`,s.screen==='play'&&s.wheel.name==='Dinner Picker');
  // remove-winner mode
  await tap(P,'#remBtn');s=await st(P);check(`${kind}: remove toggle on`,s.settings.remove===true);
  const orig=s.wheel;const order=[];
  for(let k=0;k<5;k++){const w=await spinAndCheck(P,'remove spin '+(k+1),'btn');const origIdx=w.active[w.lastWin];order.push(origIdx);
    if(k===0)await shot(P,pre+'09-remove-win.png');
    await tap(P,'#winClose');await P.page.waitForFunction(()=>!window.__SW.state().flinging,null,{timeout:5000});await P.page.waitForTimeout(150);s=await st(P);
    check(`${kind}: winner ${k+1} removed & listed`,s.picked.length===k+1&&s.picked[k]===origIdx&&!s.active.includes(origIdx)&&s.n===5-k,JSON.stringify(s.picked));
    if(k===1){await shot(P,pre+'10-remove-list.png');await layout(P,'remove list')}}
  s=await st(P);check(`${kind}: last one standing → champion`,s.win&&s.champ&&s.n===1&&s.picked.length===5,s.winText);
  await shot(P,pre+'11-champion.png');
  const listText=await P.page.locator('#picked').innerText();check(`${kind}: picked list in order`,order.every((o,i)=>listText.includes((i+1)+'. ')),listText.replace(/\n/g,' | '));
  check(`${kind}: saved wheel untouched during removal`,JSON.stringify(s.wheel)===JSON.stringify(orig));
  await tap(P,'#winClose');await tap(P,'#resetBtn');s=await st(P);check(`${kind}: reset restores all slots`,s.n===6&&!s.picked.length);
  // champion "Reset wheel" path
  await P.page.reload();await P.page.evaluate(()=>window.__SW.setSpeed(6));s=await st(P);check(`${kind}: remove toggle persists after reload`,s.settings.remove===true&&(await P.page.locator('#remBtn').innerText()).includes('ON'));
  check(`${kind}: saved wheel intact after reload`,s.n===6&&JSON.stringify(s.wheel)===JSON.stringify(orig));
  await tap(P,'#remBtn');s=await st(P);check(`${kind}: remove toggle off`,s.settings.remove===false);
  await spinAndCheck(P,'normal mode no removal','btn');await tap(P,'#againBtn');await P.page.waitForTimeout(150);s=await st(P);check(`${kind}: spin again keeps slots (mode off)`,s.n===6&&(s.spinning||s.win));
  await P.page.waitForFunction(()=>window.__SW.state().win,null,{timeout:15000});await tap(P,'#winClose');
  await tap(P,'#muteBtn');s=await st(P);check(`${kind}: mute toggle`,s.settings.mute===true);
  check(`${kind}: no console errors / network`,!P.errors.length,P.errors.join('; '));await ctx.close()}

 for(const kind of ['iphone','desktop']){const ctx=await newCtx(b,kind);const P=await open(ctx,kind);const pre=kind==='iphone'?'':'desk-';
  const nowrap=async l=>{const r=await P.page.evaluate(()=>{const e=document.getElementById('remBtn');return{h:e.getBoundingClientRect().height,o:e.scrollWidth<=e.clientWidth+1}});check(`${kind} ${l}: Remove label on one line`,r.h<60&&r.o,JSON.stringify(r))};
  await nowrap('off');
  // many fast spins, tally expected by slot id
  const exp=await P.page.evaluate(async()=>{window.__SW.setSpeed(400);const e={};let last=null;for(let k=0;k<40;k++){document.getElementById('spinBtn').click();await new Promise(r=>{const f=()=>window.__SW.state().win?r():setTimeout(f,2);f()});const s=window.__SW.state();last=s.live[s.lastWin].id;e[last]=(e[last]||0)+1;document.getElementById('winClose').click()}window.__SW.setSpeed(6);return{e,last}});
  let st=await P.page.evaluate(()=>window.__SW.stats());
  const same=o=>Object.keys(exp.e).every(id=>o.slots[id]&&o.slots[id].wins===exp.e[id])&&Object.values(o.slots).reduce((a,x)=>a+x.wins,0)===40;
  check(`${kind}: 40 spins counted per slot`,st.spins===40&&same(st)&&st.last===exp.last,JSON.stringify(exp.e));
  await P.page.reload();await P.page.evaluate(()=>window.__SW.setSpeed(6));st=await P.page.evaluate(()=>window.__SW.stats());check(`${kind}: leaderboard persists after reload`,st.spins===40&&same(st));
  await tap(P,'#toBoard');await layout(P,'leaderboard');await shot(P,pre+'12-leaderboard.png');
  const rows=await P.page.$$eval('.lb .w',e=>e.map(x=>+x.textContent));check(`${kind}: board sorted by wins`,rows.every((v,i)=>!i||rows[i-1]>=v)&&rows.reduce((a,b)=>a+b,0)===40,rows.join(','));
  const medal=await P.page.locator('.lb .rk').first().innerText();check(`${kind}: 1st gets 🥇`,medal==='🥇');
  check(`${kind}: total spins shown`,(await P.page.locator('#totSpins').innerText())==='40');
  await tap(P,'#boardBack');
  // rename keeps count; shrinking retires a slot
  const w0=(await st0(P)).wheel;const id0=w0.slots[0].id,id5=w0.slots[5].id;
  await tap(P,'#toEdit');await tap(P,'.slot[data-i="0"]');await P.page.fill('#slotText','Robot');await tap(P,'#slotOk');await tap(P,'#minus');await tap(P,'#editDone');
  st=await P.page.evaluate(()=>window.__SW.stats());await tap(P,'#toBoard');
  const r0=await P.page.locator(`.lb[data-id="${id0}"]`).innerText();check(`${kind}: renamed slot keeps count`,r0.includes('Robot')&&r0.trim().endsWith(String(exp.e[id0]||0)),r0.replace(/\n/g,' '));
  const ret=await P.page.locator(`.lb.retired[data-id="${id5}"]`).count();check(`${kind}: deleted slot shown as retired`,ret===(exp.e[id5]?1:0));
  await shot(P,pre+'13-leaderboard-retired.png');await tap(P,'#boardBack');
  // per-wheel separation
  await tap(P,'#toWheels');await tap(P,'#newWheel');await tap(P,'#editDone');let s2=await P.page.evaluate(()=>window.__SW.stats());check(`${kind}: new wheel has own empty board`,s2.spins===0);
  await spinAndCheck(P,'spin on wheel 2','btn');await tap(P,'#winClose');s2=await P.page.evaluate(()=>window.__SW.stats());check(`${kind}: wheel 2 counts separately`,s2.spins===1);
  await tap(P,'#toBoard');await shot(P,pre+'14-leaderboard-wheel2.png');await tap(P,'#boardBack');
  await tap(P,'#toWheels');await tap(P,'.wrow:nth-child(1) .load');st=await P.page.evaluate(()=>window.__SW.stats());check(`${kind}: wheel 1 board unchanged`,st.spins===40);
  // remove mode: every pick counts + champion crown
  await tap(P,'#remBtn');await nowrap('on');
  for(let k=0;k<4;k++){await spinAndCheck(P,'rm '+k,'btn');await tap(P,'#winClose');await P.page.waitForFunction(()=>!window.__SW.state().flinging);await P.page.waitForTimeout(100);if(k===0)await nowrap('on + reset shown')}
  let S=await st0(P);st=await P.page.evaluate(()=>window.__SW.stats());const champId=S.live[0].id;
  check(`${kind}: remove picks counted as spins, only champion gets +1 win & crown`,S.champ&&st.spins===44&&st.champs===1&&st.slots[champId].champs===1&&st.slots[champId].wins===(exp.e[champId]||0)+1&&Object.values(st.slots).reduce((a,x)=>a+x.wins,0)===41&&st.last===champId,JSON.stringify({spins:st.spins,champs:st.champs}));
  await tap(P,'#winClose');await tap(P,'#spinBtn');st=await P.page.evaluate(()=>window.__SW.stats());check(`${kind}: re-showing champion doesn't double count`,st.champs===1);await tap(P,'#winClose');
  await tap(P,'#toBoard');check(`${kind}: crown shown`,(await P.page.locator(`.lb[data-id="${champId}"] .c`).innerText())==='👑1');await shot(P,pre+'15-leaderboard-crown.png');
  await tap(P,'#boardReset');await shot(P,pre+'16-reset-confirm.png');await tap(P,'#askNo');st=await P.page.evaluate(()=>window.__SW.stats());check(`${kind}: reset cancel keeps`,st.spins===44);
  await tap(P,'#boardReset');await tap(P,'#askYes');st=await P.page.evaluate(()=>window.__SW.stats());check(`${kind}: reset clears`,st.spins===0&&st.champs===0&&!Object.keys(st.slots).length);
  await P.page.reload();st=await P.page.evaluate(()=>window.__SW.stats());check(`${kind}: reset persists`,st.spins===0);
  await tap(P,'#toWheels');await tap(P,'.wrow:nth-child(2) .load');s2=await P.page.evaluate(()=>window.__SW.stats());check(`${kind}: other wheel untouched by reset`,s2.spins===1);
  await tap(P,'#toBoard');await layout(P,'leaderboard wheel2');
  check(`${kind}: leaderboard no console errors / network`,!P.errors.length,P.errors.join('; '));await ctx.close()}


 // Remove Winner leaderboard accuracy: intermediate landings are spins but NOT wins; only the last slot standing wins (+ crown)
 const runRemove=P=>P.page.evaluate(async()=>{window.__SW.setSpeed(400);const wait=f=>new Promise(r=>{const g=()=>f()?r():setTimeout(g,2);g()});
   for(let g=0;g<100;g++){if(!window.__SW.state().win)document.getElementById('spinBtn').click();await wait(()=>window.__SW.state().win);if(window.__SW.state().champ)break;document.getElementById('winClose').click();await wait(()=>!window.__SW.state().flinging);}
   window.__SW.setSpeed(6);return window.__SW.state().live[0].id});
 const sumWins=o=>Object.values(o.slots).reduce((a,x)=>a+x.wins,0);
 const boardRows=P=>P.page.$$eval('#boardList .lb',es=>es.map(e=>({id:e.dataset.id,rk:e.querySelector('.rk').textContent,c:e.querySelector('.c').textContent,w:+e.querySelector('.w').textContent,retired:e.classList.contains('retired'),t:e.querySelector('.chip').textContent})));
 const newRemoveWheel=async(P,n)=>{await tap(P,'#toWheels');await tap(P,'#newWheel');await tap(P,`#presets [data-n="${n}"]`);await tap(P,'#editDone');if(!(await st(P)).settings.remove)await tap(P,'#remBtn')};
 for(const kind of ['iphone','desktop']){const ctx=await newCtx(b,kind);const P=await open(ctx,kind);const pre=kind==='iphone'?'':'desk-';
  // scenario 1: 10 slots, full Remove Winner run (screenshot 1)
  await newRemoveWheel(P,10);let champ=await runRemove(P);let S=await st(P),o=await P.page.evaluate(()=>window.__SW.stats());
  check(`${kind}: 10-slot remove run → champion screen, 9 slots removed`,S.win&&S.champ&&S.n===1&&S.picked.length===9);
  check(`${kind}: 10-slot stats: spins 9, champs 1, sum of wins 1, champion 1 win/1 crown, last=champion`,o.spins===9&&o.champs===1&&sumWins(o)===1&&o.slots[champ].wins===1&&o.slots[champ].champs===1&&o.last===champ,JSON.stringify({spins:o.spins,champs:o.champs,sum:sumWins(o)}));
  await tap(P,'#winClose');await tap(P,'#toBoard');let rows=await boardRows(P);
  check(`${kind}: 10-slot board: champion row 🥇 👑1 and 1 win, first`,rows.length===10&&rows[0].id===champ&&rows[0].rk==='🥇'&&rows[0].c==='👑1'&&rows[0].w===1);
  check(`${kind}: 10-slot board: 9 others 0 wins, no crown; wins column sums to 1`,rows.slice(1).every(r=>r.w===0&&r.c===''&&r.rk==='·')&&rows.reduce((a,r)=>a+r.w,0)===1);
  check(`${kind}: 10-slot board totals: 9 spins, 1 champ, last=champion`,(await P.page.locator('#totSpins').innerText())==='9'&&(await P.page.locator('#totChamps').innerText())==='1'&&(await P.page.locator('#lastWin').innerText()).includes(rows[0].t));
  await shot(P,pre+'18-leaderboard-remove-10slots.png');
  // persistence + rename + retire keep the numbers
  await P.page.reload();await tap(P,'#toBoard');let rows2=await boardRows(P);check(`${kind}: board identical after reload`,JSON.stringify(rows2)===JSON.stringify(rows));
  await tap(P,'#boardBack');
  // mid-run reset: landings are spins only, no wins; later full run still gives exactly 1 win
  await tap(P,'#resetBtn').catch(()=>{});S=await st(P);
  await P.page.evaluate(()=>window.__SW.setSpeed(400));
  for(let k=0;k<3;k++){await tap(P,'#spinBtn');await P.page.waitForFunction(()=>window.__SW.state().win);await tap(P,'#winClose');await P.page.waitForFunction(()=>!window.__SW.state().flinging);}
  o=await P.page.evaluate(()=>window.__SW.stats());check(`${kind}: 3 remove landings = +3 spins, +0 wins`,o.spins===12&&sumWins(o)===1&&o.champs===1,JSON.stringify({spins:o.spins,sum:sumWins(o)}));
  await tap(P,'#resetBtn');S=await st(P);o=await P.page.evaluate(()=>window.__SW.stats());check(`${kind}: reset mid-run restores slots, leaves wins untouched`,S.n===10&&!S.picked.length&&sumWins(o)===1&&o.champs===1&&o.spins===12);
  const champ2=await runRemove(P);o=await P.page.evaluate(()=>window.__SW.stats());check(`${kind}: second full run after mid-run reset: sum wins 2, champs 2, spins 21`,o.champs===2&&sumWins(o)===2&&o.spins===21&&o.last===champ2&&o.slots[champ2].champs===(champ2===champ?2:1),JSON.stringify({spins:o.spins,champs:o.champs,sum:sumWins(o)}));
  await tap(P,'#winClose');await tap(P,'#toBoard');rows=await boardRows(P);
  check(`${kind}: board medals sensible after 2 runs (no 0-win crown, ties share rank, wins sum 2)`,rows.reduce((a,r)=>a+r.w,0)===2&&rows.every(r=>(r.w>0||r.c)?r.rk!=='·':r.rk==='·')&&(champ===champ2?rows[0].w===2&&rows[0].rk==='🥇':rows[0].rk==='🥇'&&rows[1].rk==='🥇'&&rows[0].w===1&&rows[1].w===1),JSON.stringify(rows.slice(0,3)));
  await tap(P,'#boardBack');
  // scenario 2: 2 slots, full run (screenshot 2)
  await newRemoveWheel(P,2);champ=await runRemove(P);o=await P.page.evaluate(()=>window.__SW.stats());S=await st(P);
  check(`${kind}: 2-slot stats: spins 1, champs 1, sum wins 1, champion 1 win/1 crown`,o.spins===1&&o.champs===1&&sumWins(o)===1&&o.slots[champ].wins===1&&o.slots[champ].champs===1&&o.last===champ,JSON.stringify(o));
  await tap(P,'#winClose');await tap(P,'#toBoard');rows=await boardRows(P);
  check(`${kind}: 2-slot board: champion 🥇 👑1 with 1 win; other 0 and a dot`,rows.length===2&&rows[0].id===champ&&rows[0].rk==='🥇'&&rows[0].c==='👑1'&&rows[0].w===1&&rows[1].w===0&&rows[1].rk==='·'&&rows[1].c==='');
  check(`${kind}: 2-slot board totals 1 spin, 1 champ`,(await P.page.locator('#totSpins').innerText())==='1'&&(await P.page.locator('#totChamps').innerText())==='1');
  await shot(P,pre+'19-leaderboard-remove-2slots.png');await tap(P,'#boardBack');
  // champion keeps its win through rename, and when the slot is deleted it shows as retired with its win
  const idx=S.wheel.slots.findIndex(x=>x.id===champ);await tap(P,'#toEdit');await tap(P,`.slot[data-i="${idx}"]`);await P.page.fill('#slotText','Boss');await tap(P,'#slotOk');await tap(P,'#editDone');
  await tap(P,'#toBoard');rows=await boardRows(P);check(`${kind}: renamed champion keeps 1 win + crown`,rows[0].id===champ&&rows[0].t.includes('Boss')&&rows[0].w===1&&rows[0].c==='👑1');await tap(P,'#boardBack');
  // normal mode unchanged: each landing = 1 win + 1 spin
  await tap(P,'#remBtn');o=await P.page.evaluate(()=>window.__SW.stats());
  for(let k=0;k<5;k++){await spinAndCheck(P,'normal '+k,'btn');await tap(P,'#winClose')}
  const o3=await P.page.evaluate(()=>window.__SW.stats());check(`${kind}: normal mode after remove runs: +5 spins, +5 wins, crowns unchanged`,o3.spins===o.spins+5&&sumWins(o3)===sumWins(o)+5&&o3.champs===1);
  check(`${kind}: remove-wins leaderboard no console errors / network`,!P.errors.length,P.errors.join('; '));await ctx.close()}
 // migration: saved data from before the fix is kept exactly as is (old data cannot tell Remove landings from normal spins), never re-credited on reload
 for(const kind of ['iphone','desktop']){const ctx=await newCtx(b,kind);const P=await open(ctx,kind);
  const old={wheels:[{id:'w1',name:'Old',slots:['a','b','c'].map((id,i)=>({id,text:'S'+(i+1),color:['#ff4d6d','#29a8ff','#8ee03b'][i],emoji:''}))}],cur:'w1',settings:{remove:true},
    stats:{w1:{spins:2,champs:1,last:'c',slots:{a:{wins:1,champs:0,text:'S1',emoji:'',color:'#ff4d6d'},b:{wins:0,champs:1,text:'S2',emoji:'',color:'#29a8ff'},c:{wins:1,champs:0,text:'S3',emoji:'',color:'#8ee03b'}}}}};
  await P.page.evaluate(d=>localStorage.setItem('spinwheel.v1',JSON.stringify(d)),old);
  for(let k=0;k<3;k++){await P.page.reload();await P.page.evaluate(()=>window.__SW.setSpeed(400))}
  let o=await P.page.evaluate(()=>window.__SW.stats());
  check(`${kind}: migration: old saved stats unchanged after 3 reloads (no double credit)`,JSON.stringify(o)===JSON.stringify(old.stats.w1)&&sumWins(o)===2);
  const saved=await P.page.evaluate(()=>JSON.parse(localStorage.getItem('spinwheel.v1')));check(`${kind}: migration: stored data intact`,JSON.stringify(saved.stats)===JSON.stringify(old.stats)&&JSON.stringify(saved.wheels)===JSON.stringify(old.wheels));
  await tap(P,'#toBoard');let rows=await boardRows(P);const rb=rows.find(r=>r.id==='b');
  check(`${kind}: migration: old crowned champion with 0 wins shows medal + crown, not a dot`,rb.rk!=='·'&&rb.c==='👑1'&&rb.w===0,JSON.stringify(rows));
  check(`${kind}: migration: old board ranking`,rows[0].w===1&&rows[1].w===1&&rows[0].rk==='🥇'&&rows[1].rk==='🥇'&&rows[2].id==='b'&&rows[2].rk==='🥉');
  await shot(P,(kind==='iphone'?'':'desk-')+'20-leaderboard-migrated.png');await tap(P,'#boardBack');
  // new rule applies going forward on the old data
  const ch=await runRemove(P);o=await P.page.evaluate(()=>window.__SW.stats());
  check(`${kind}: migration: new Remove run on old data → +2 spins, +1 win (champion), +1 crown`,o.spins===4&&o.champs===2&&sumWins(o)===3&&o.last===ch&&o.slots[ch].champs===(ch==='b'?2:1),JSON.stringify(o));
  check(`${kind}: migration: no console errors / network`,!P.errors.length,P.errors.join('; '));await ctx.close()}
 // iOS touch-scroll regression: 50 slots with wins, real touch swipe on leaderboard
 {const ctx=await newCtx(b,'iphone');const P=await open(ctx,'iphone');const cdp=await ctx.newCDPSession(P.page);
  await tap(P,'#toEdit');await tap(P,'#presets [data-n="50"]');await tap(P,'#editDone');
  await P.page.evaluate(async()=>{window.__SW.setSpeed(400);for(let k=0;k<150;k++){document.getElementById('winClose').click();await new Promise(r=>{const f=()=>!window.__SW.state().win&&!window.__SW.state().flinging?r():setTimeout(f,2);f()});document.getElementById('spinBtn').click();await new Promise(r=>{const f=()=>window.__SW.state().win?r():setTimeout(f,2);f()})}});
  await P.page.waitForSelector('#winOv.on');await P.page.waitForTimeout(300);await tap(P,'#winClose');await P.page.waitForFunction(()=>!window.__SW.state().flinging&&!document.querySelector('.ov.on'));await tap(P,'#toBoard');
  const nRows=await P.page.locator('#boardList .lb').count();check('iphone: 50-slot board renders rows',nRows>=40,String(nRows));const sp=await P.page.evaluate(()=>window.__SW.stats().spins);check('iphone: 150 wins recorded for scroll test',sp===150,String(sp));
  const swipe=async(sel)=>{const bb=await P.page.locator(sel).boundingBox();const x=bb.x+bb.width/2,y0=bb.y+bb.height*0.85,y1=bb.y+bb.height*0.1;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:y0}]});for(let k=1;k<=10;k++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y0+(y1-y0)*k/10}]});await P.page.waitForTimeout(16)}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await P.page.waitForTimeout(400)};
  const blocked=await P.page.evaluate(()=>{const e=new TouchEvent('touchmove',{bubbles:true,cancelable:true});document.getElementById('boardList').dispatchEvent(e);return e.defaultPrevented});
  check('iphone: touchmove on leaderboard not prevented',!blocked);
  await swipe('#boardList');const top1=await P.page.evaluate(()=>document.getElementById('boardList').scrollTop);check('iphone: leaderboard scrollTop changes after touch swipe',top1>0,String(top1));
  for(let k=0;k<30;k++){await swipe('#boardList');if(await P.page.evaluate(()=>{const l=document.getElementById('boardList');return l.scrollTop+l.clientHeight>=l.scrollHeight-2}))break}
  const bot=await P.page.evaluate(()=>{const l=document.getElementById('boardList'),r=l.lastElementChild.getBoundingClientRect(),L=l.getBoundingClientRect();return{end:l.scrollTop+l.clientHeight>=l.scrollHeight-2,vis:r.bottom<=L.bottom+1&&r.top>=L.top-1}});
  check('iphone: bottom leaderboard row reachable by touch',bot.end&&bot.vis,JSON.stringify(bot));await shot(P,'17-leaderboard-scrolled.png');
  const wheelBlocked=await P.page.evaluate(()=>{document.getElementById('boardBack').click();const e=new TouchEvent('touchmove',{bubbles:true,cancelable:true});document.getElementById('wheel').dispatchEvent(e);return e.defaultPrevented});
  check('iphone: touchmove on wheel still blocked (flicks)',wheelBlocked);
  await tap(P,'#toEdit');await swipe('#slotList');check('iphone: 50-slot editor list touch-scrolls',await P.page.evaluate(()=>document.getElementById('slotList').scrollTop>0));await tap(P,'#editDone');
  await P.page.evaluate(()=>{for(let i=0;i<14;i++){document.getElementById('toWheels').click();document.getElementById('newWheel').click();document.getElementById('editDone').click()}document.getElementById('toWheels').click()});
  await swipe('#wheelList');check('iphone: saved wheels list touch-scrolls',await P.page.evaluate(()=>document.getElementById('wheelList').scrollTop>0));
  check('iphone: scroll test no console errors',!P.errors.length,P.errors.join('; '));await ctx.close()}
 // fairness: 3000 simulated plans over 5 slots via indexAt geometry in page (uses same rnd)
 const ctx=await newCtx(b,'desktop');const P=await open(ctx,'desktop');
 const fair=await P.page.evaluate(async()=>{window.__SW.setSpeed(400);const c=[0,0,0,0,0,0];for(let k=0;k<600;k++){document.getElementById('spinBtn').click();await new Promise(r=>{const f=()=>window.__SW.state().win?r():setTimeout(f,2);f()});const s=window.__SW.state();if(s.under!==s.lastWin)return 'mismatch';c[s.lastWin]++;document.getElementById('winClose').click()}return c});
 check('fairness: 600 real spins spread across 6 slots, all geometry-matched',Array.isArray(fair)&&fair.every(x=>x>60&&x<145),JSON.stringify(fair));
 await ctx.close();await b.close();
 fs.writeFileSync(path.join(__dirname,'test-results.txt'),results.join('\n')+`\n\n${results.length-failures}/${results.length} passed\n`);console.log(`${results.length-failures}/${results.length} passed`);process.exit(failures?1:0)})();
