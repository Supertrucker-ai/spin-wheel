// ---- store: localStorage with in-memory fallback ----
const Store=(()=>{const KEY='spinwheel.v1';let mem=null,ok=true;
  try{const t='__t';localStorage.setItem(t,'1');localStorage.removeItem(t)}catch(e){ok=false}
  return{load(){try{const s=ok?localStorage.getItem(KEY):mem;return s?JSON.parse(s):null}catch(e){return null}},
    save(d){const s=JSON.stringify(d);mem=s;if(ok){try{localStorage.setItem(KEY,s)}catch(e){ok=false}}},persistent:()=>ok}})();
