// ---- wheel geometry + drawing (slice i spans [i*seg,(i+1)*seg) clockwise from the top pointer, in wheel frame) ----
const TAU=Math.PI*2;
const mod=(a,m)=>((a%m)+m)%m;
function indexAt(rot,n){return Math.floor(mod(-rot,TAU)/(TAU/n))%n}
function labelOf(s){return (s.emoji?s.emoji+(s.text?' ':''):'')+(s.text||'')}
const fitCache=new Map();
function fitFont(ctx,label,r,seg){const k=label+'|'+Math.round(r)+'|'+seg.toFixed(4);if(fitCache.has(k))return fitCache.get(k);
  const outer=r*0.9,inner=r*0.21,cap=Math.min(r*0.17,64);let s=cap;
  for(;s>7;s*=0.93){ctx.font='900 '+s+'px "Arial Rounded MT Bold","Trebuchet MS",system-ui,sans-serif';const w=ctx.measureText(label).width;
    const start=outer-w;if(start<inner)continue;const chord=seg>=Math.PI?r:2*start*Math.sin(seg/2)*0.86;if(s<=chord)break}
  s=Math.max(s,7);fitCache.set(k,s);return s}
function drawWheel(cv,slots,rot,opt){opt=opt||{};const ctx=cv.getContext('2d'),W=cv.width,r=W/2,n=slots.length,seg=TAU/n;
  ctx.clearRect(0,0,W,W);ctx.save();ctx.translate(r,r);
  for(let i=0;i<n;i++){const a0=-Math.PI/2+rot+i*seg,a1=a0+seg,s=slots[i];let dx=0,dy=0,al=1,sc=1;
    if(opt.fling===i){const t=opt.flingT,mid=a0+seg/2;dx=Math.cos(mid)*r*1.4*t*t;dy=Math.sin(mid)*r*1.4*t*t-r*0.4*Math.sin(t*Math.PI);al=1-t;sc=1+0.3*t}
    ctx.save();ctx.globalAlpha=al;ctx.translate(dx,dy);ctx.scale(sc,sc);
    ctx.beginPath();ctx.moveTo(0,0);if(n===1)ctx.arc(0,0,r,0,TAU);else ctx.arc(0,0,r,a0,a1);ctx.closePath();ctx.fillStyle=s.color;ctx.fill();
    if(n>1){ctx.lineWidth=Math.max(1,r*0.012);ctx.strokeStyle='rgba(255,255,255,.85)';ctx.stroke()}
    if(!opt.noText){const lab=labelOf(s);if(lab){const fs=fitFont(ctx,lab,r,seg);ctx.rotate(a0+seg/2);ctx.font='900 '+fs+'px "Arial Rounded MT Bold","Trebuchet MS",system-ui,sans-serif';
      ctx.fillStyle=inkFor(s.color);ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillText(lab,r*0.9,0)}}
    ctx.restore()}
  ctx.restore()}
