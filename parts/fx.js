// ---- sound (WebAudio) + confetti ----
const Sound=(()=>{let ac=null,muted=false,last=0;
  function ctx(){if(!ac){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;try{ac=new A()}catch(e){return null}}if(ac.state==='suspended')ac.resume();return ac}
  function beep(f,t0,d,type,vol){const c=ctx();if(!c||muted)return;const o=c.createOscillator(),g=c.createGain();o.type=type||'square';o.frequency.value=f;
    const t=c.currentTime+(t0||0);g.gain.setValueAtTime(vol||0.12,t);g.gain.exponentialRampToValueAtTime(0.0001,t+d);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+d+0.02)}
  return{unlock(){ctx()},tick(){const now=performance.now();if(now-last<28)return;last=now;beep(1800,0,0.03,'square',0.07)},
    win(){[523,659,784,1047].forEach((f,i)=>beep(f,i*0.11,0.25,'triangle',0.18))},champ(){[523,659,784,1047,784,1047,1319].forEach((f,i)=>beep(f,i*0.12,0.3,'triangle',0.2))},
    pop(){beep(300,0,0.12,'sine',0.2);beep(600,0.05,0.1,'sine',0.15)},
    get muted(){return muted},set muted(v){muted=!!v}}})();
const Confetti=(()=>{let raf=0;
  function run(cv,colors,big){cancelAnimationFrame(raf);const d=Math.min(2,devicePixelRatio||1);cv.width=cv.clientWidth*d;cv.height=cv.clientHeight*d;const c=cv.getContext('2d'),W=cv.width,H=cv.height;
    const P=[];const N=big?260:140;for(let i=0;i<N;i++)P.push({x:W/2+(Math.random()-.5)*W*.3,y:H*.45,vx:(Math.random()-.5)*W*.03,vy:-Math.random()*H*.03-H*.008,s:(6+Math.random()*8)*d,r:Math.random()*6,vr:(Math.random()-.5)*.4,c:colors[i%colors.length]});
    const t0=performance.now(),D=big?4200:2800;(function f(now){const t=now-t0;c.clearRect(0,0,W,H);for(const p of P){p.vy+=H*0.0009;p.vx*=.99;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;c.save();c.translate(p.x,p.y);c.rotate(p.r);c.fillStyle=p.c;c.globalAlpha=Math.max(0,1-t/D);c.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);c.restore()}
      if(t<D)raf=requestAnimationFrame(f);else c.clearRect(0,0,W,H)})(t0)}
  return{run,stop(){cancelAnimationFrame(raf)}}})();
