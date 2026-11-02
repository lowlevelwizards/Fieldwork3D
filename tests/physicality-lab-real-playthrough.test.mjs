import test from 'node:test';
import assert from 'node:assert/strict';

// Exercise the *actual* lab click handlers and movement loop in a minimal
// browser shim. Mere existence/determinism tests cannot catch deadlocked runs.
const elements=new Map();
function el(id){
 if(!elements.has(id)){
  const listeners={};
  const e={value:id==='scenario'?'stack':id==='traffic'?'hybrid':id==='doors'?'assisted':'1',
   textContent:'',listeners,addEventListener:(k,fn)=>{listeners[k]=fn;},
   dispatch:(k)=>listeners[k]?.(),
   getContext:()=>new Proxy({}, {get:()=>()=>{}})};
  elements.set(id,e);
 }
 return elements.get(id);
}
globalThis.document={getElementById:el};
globalThis.requestAnimationFrame=()=>1;
await import('../src/physicality-lab-main.ts');
const step=()=>el('step').dispatch('click');
function runScene(name,ticks=720){
 el('scenario').value=name;el('scenario').dispatch('change');
 const first=el('detail').textContent;
 for(let i=0;i<ticks;i++)step();
 const last=el('detail').textContent;
 const rows=String(last).split('\n').map(x=>({
  name:x.split(' · ')[0],
  remaining:Number(x.match(/remaining ([0-9.]+)/)?.[1]??Infinity),
  status:x.split(' · ')[1],
 }));
 return {name,first,last,rows,blocked:el('blocked').textContent,
   angle:el('angle').textContent};
}
test('Physicality Lab default scenes actually move through the obstacle',()=>{
 const outcomes=['stack','headon','vestibule','furniture'].map(s=>runScene(s));
 for(const result of outcomes)
  console.log('PHYSICALITY CASE '+JSON.stringify({scenario:result.name,
    rows:result.rows,blocked:result.blocked,door:result.angle}));
 for(const result of outcomes)
  assert.ok(result.rows.filter(r=>r.name!=='ROOK'||result.name!=='stack')
    .some(r=>r.remaining<15),JSON.stringify(result,null,2));
});
