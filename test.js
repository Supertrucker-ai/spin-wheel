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
const st=P=>P.page.evaluate(()=>window.__SW.state());
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
 // fairness: 3000 simulated plans over 5 slots via indexAt geometry in page (uses same rnd)
 const ctx=await newCtx(b,'desktop');const P=await open(ctx,'desktop');
 const fair=await P.page.evaluate(async()=>{window.__SW.setSpeed(400);const c=[0,0,0,0,0,0];for(let k=0;k<600;k++){document.getElementById('spinBtn').click();await new Promise(r=>{const f=()=>window.__SW.state().win?r():setTimeout(f,2);f()});const s=window.__SW.state();if(s.under!==s.lastWin)return 'mismatch';c[s.lastWin]++;document.getElementById('winClose').click()}return c});
 check('fairness: 600 real spins spread across 6 slots, all geometry-matched',Array.isArray(fair)&&fair.every(x=>x>60&&x<145),JSON.stringify(fair));
 await ctx.close();await b.close();
 fs.writeFileSync(path.join(__dirname,'test-results.txt'),results.join('\n')+`\n\n${results.length-failures}/${results.length} passed\n`);console.log(`${results.length-failures}/${results.length} passed`);process.exit(failures?1:0)})();
