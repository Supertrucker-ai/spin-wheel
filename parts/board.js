// ---- leaderboard: stats per wheel id, keyed by slot id (renames keep counts; deleted slots shown as retired) ----
function makeBoard(getData,save){
  const get=w=>{const d=getData();return d.stats[w.id]||(d.stats[w.id]={spins:0,champs:0,last:null,slots:{}})};
  return{get,
    // kind: 'win' (normal landing = win+spin) | 'landing' (Remove Winner pick: a spin, NOT a win) | 'champ' (last slot standing: a win + a crown)
    record(w,s,kind){const st=get(w);const e=st.slots[s.id]||(st.slots[s.id]={wins:0,champs:0});e.text=s.text;e.emoji=s.emoji;e.color=s.color;
      if(kind==='champ'){e.wins++;e.champs++;st.champs++;st.last=s.id}else if(kind==='landing'){st.spins++}else{e.wins++;st.spins++;st.last=s.id}save()},
    reset(w){delete getData().stats[w.id];save()},
    rows(w){const st=get(w),ids=new Set(w.slots.map(s=>s.id)),out=[];
      w.slots.forEach(s=>{const e=st.slots[s.id]||{wins:0,champs:0};out.push({id:s.id,text:s.text,emoji:s.emoji,color:s.color,wins:e.wins,champs:e.champs,retired:false})});
      Object.keys(st.slots).forEach(id=>{if(!ids.has(id)){const e=st.slots[id];if(e.wins||e.champs)out.push({id,...e,retired:true})}});
      return out.sort((a,b)=>(a.retired-b.retired)||(b.wins-a.wins)||(b.champs-a.champs))}}}
function renderBoardInto(Board,w,$){const st=Board.get(w),rows=Board.rows(w),L=$('boardList');$('boardName').textContent=w.name;
  $('totSpins').textContent=st.spins;$('totChamps').textContent=st.champs;
  const lw=$('lastWin');lw.innerHTML='';const b=document.createElement('b');const ls=rows.find(r=>r.id===st.last);b.textContent=ls?(labelOf(ls)||'?'):'–';if(ls){b.style.color=ls.color}lw.append(b,'last');
  L.innerHTML='';const max=Math.max(1,...rows.map(r=>r.wins));let rank=0,pw=-1,pc=-1;
  if(!st.spins&&!st.champs){const e=document.createElement('div');e.className='empty';e.textContent='No winners yet. Go spin! 🎡';L.appendChild(e)}
  rows.forEach((r,i)=>{if(r.wins!==pw||r.champs!==pc){rank=i+1;pw=r.wins;pc=r.champs}const d=document.createElement('div');d.className='lb'+(r.retired?' retired':'');d.dataset.id=r.id;
    const rk=document.createElement('div');rk.className='rk';rk.textContent=r.retired?'💤':(r.wins||r.champs)?(['🥇','🥈','🥉'][rank-1]||rank):'·';
    const ch=document.createElement('div');ch.className='chip';ch.style.background=r.color;ch.style.color=inkFor(r.color);ch.textContent=labelOf(r)||'?';
    const bar=document.createElement('div');bar.className='bar';const fi=document.createElement('i');fi.style.width=(r.wins/max*100)+'%';fi.style.background=r.color;bar.appendChild(fi);
    const c=document.createElement('div');c.className='c';c.textContent=r.champs?'👑'+r.champs:'';
    const wn=document.createElement('div');wn.className='w';wn.textContent=r.wins;d.append(rk,ch,bar,c,wn);L.appendChild(d)})}
