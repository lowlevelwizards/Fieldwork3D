import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveMovementFrame} from '../src/breach-movement-authority.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('physicality lab is a built multi-page app with real operator controls',()=>{
 assert.match(read('vite.config.ts'),/physicalityLab:\s*'physicality-lab.html'/);
 const html=read('physicality-lab.html');
 for(const id of ['scenario','traffic','doors','run','reset','step','stage','detail'])
  assert.match(html,new RegExp('id="'+id+'"'));
 const implementation=read('src/physicality-lab-main.ts');
 assert.match(implementation,/resolveMovementFrame\(/);
 assert.match(implementation,/advanceDoor\(/);
 assert.match(implementation,/friendlyPassingStep\(/);
 assert.match(implementation,/passageWait\(/);
});
test('shared movement resolver produces identical 120 tick traces',()=>{
 const run=()=>{
  const pts=[{x:10,y:10},{x:42,y:10},{x:74,y:10},{x:106,y:10}];
  const traces=[];
  for(let tick=0;tick<120;tick++){
   const proposals=pts.map((p,i)=>({id:'u'+i,side:i<2?'blue':'red',
    from:{...p},to:{x:p.x+(i%2?-.4:.4),y:p.y},alive:true}));
   const out=resolveMovementFrame(proposals,()=>true);
   for(let i=0;i<pts.length;i++)pts[i]={...out[i].point};
   traces.push(out.map(x=>[x.point.x,x.point.y,x.blocked]));
  }
  return traces;
 };
 assert.deepEqual(run(),run());
});
