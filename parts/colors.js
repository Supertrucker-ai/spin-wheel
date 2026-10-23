// ---- colors ----
const BASE=['#ff4d4d','#ff8c1a','#ffd21f','#8ee03b','#2ecc71','#1fd1c1','#29a8ff','#3f6bff','#8a4dff','#d24dff','#ff4dae','#ff7a8a'];
const PALETTE=['#ff4d4d','#ff8c1a','#ffd21f','#fff36b','#8ee03b','#2ecc71','#0f9d58','#1fd1c1','#29a8ff','#3f6bff','#1a237e','#8a4dff','#d24dff','#ff4dae','#ff9ad1','#8b5a2b','#ffffff','#b0b0b0','#333333','#000000','#ffe0b3','#c8f7c5','#b3e5ff','#e0c3ff'];
function hsl2hex(h,s,l){s/=100;l/=100;const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),f=n=>l-a*Math.max(-1,Math.min(k(n)-3,9-k(n),1));return'#'+[f(0),f(8),f(4)].map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('')}
function rainbow(n){const o=[];for(let i=0;i<n;i++)o.push(hsl2hex(i*360/n,88,57));return o}
function defaultColor(i,n){return n<=12?BASE[Math.floor(i*12/n)]:rainbow(n)[i]}
function lum(hex){const c=[1,3,5].map(i=>{let v=parseInt(hex.substr(i,2),16)/255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*c[0]+.7152*c[1]+.0722*c[2]}
function inkFor(hex){return lum(hex)>0.38?'#2b2250':'#ffffff'}
function rnd(n){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296*n|0}
function randomColors(n){const pool=PALETTE.filter(c=>!['#ffffff','#b0b0b0','#333333','#000000'].includes(c));const out=[];
  for(let i=0;i<n;i++){let c,g=0;do{c=pool[rnd(pool.length)];g++}while(g<50&&(c===out[i-1]||(i===n-1&&c===out[0])||(n<=pool.length&&out.includes(c))));out.push(c)}return out}
const EMOJIS=['⭐','❤️','🍕','🍦','🎮','⚽','🏀','🚗','🚀','🦖','🐶','🐱','🦄','🐉','🌈','🔥','💎','🎁','🍩','🍔','🍎','🍌','🐸','🦈','🤖','👻','🎈','🏆','📚','🛁','😴','🎨','🧩','🎵','🌮','🍪'];
