/** CPU-only comparison; run same script on base and candidate. */
import * as THREE from 'three';
import {performance} from 'node:perf_hooks';
import {BreachCombatEffectsPresenter} from '../src/rendering/breach-combat-effects-presenter.ts';
const root=new THREE.Group(),p=new BreachCombatEffectsPresenter(root,[],false);
const point=id=>({x:100+id,y:150});
const s={seconds:0,casings:[],dropped:[],grenades:[],flashBursts:[]};
const allow=()=>true;
const mags=()=>Array.from({length:64},(_,id)=>({id,p:point(id),age:2}));
function measure(name,configure,visible=()=>true){
 const ms=[],counts=[],geometries=new Set(),materials=new Set();
 for(let frame=0;frame<360;frame++){
   s.seconds=frame/60;configure(frame);
   const start=performance.now();p.update(s,visible(frame),false,()=>false);
   if(frame>=60)ms.push(performance.now()-start);
   let count=0;
   root.traverseVisible(o=>{
     if(!o.isMesh||(o.isInstancedMesh&&!o.count))return;
     count++;geometries.add(o.geometry.uuid);materials.add(o.material.uuid);
   });
   counts.push(count);
 }
 ms.sort((a,b)=>a-b);
 console.log(JSON.stringify({name,p50:ms[Math.floor(ms.length*.5)],
   p95:ms[Math.floor(ms.length*.95)],peakVisibleMeshes:Math.max(...counts),
   observedGeometries:geometries.size,observedMaterials:materials.size,
   counters:p.resourceStats?.()??null}));
 p.reset();s.dropped=[];s.grenades=[];s.flashBursts=[];
}
measure('idle',()=>{});
measure('settled-magazines',()=>{s.dropped=mags();});
measure('combat-churn',frame=>{
 const generation=Math.floor(frame/12)*100;
 s.dropped=mags();
 s.grenades=Array.from({length:8},(_,id)=>({id:generation+id,p:point(id),age:(frame%12)/60,path:null}));
 s.flashBursts=Array.from({length:8},(_,id)=>({id:generation+id,p:point(id),age:(frame%12)/60}));
});
measure('disclosure',()=>{s.dropped=mags();},frame=>frame%30<15);
measure('mission-reset',frame=>{if(frame%30===0)p.reset();s.dropped=mags();});
