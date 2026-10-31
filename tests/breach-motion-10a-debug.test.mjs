import test from 'node:test';
import {createDistanceGait,advanceDistanceGait}
 from '../src/breach-distance-gait.ts';
test('DEBUG squeeze gait',()=>{
 const s=createDistanceGait();let x=0,y=0,logs=[];
 for(let i=0;i<180;i++){
  x+=Math.cos(Math.PI/2)*.45;y+=Math.sin(Math.PI/2)*.45;
  advanceDistanceGait(s,{time:i/60,position:{x,y},
   rootYaw:0,facingYaw:0,travelYaw:Math.PI/2,speed:27,turning:0,
   posture:'stand',injury:0,down:false,gait:'squeeze',
   footAllowed:()=>true});
  if(i%30===0||s.lastStepAt===i/60)
   logs.push({i,steps:s.stepsTaken,starve:s.starvations,
     planted:s.feet.map(f=>[+f.plantedAt.x.toFixed(1),+f.plantedAt.y.toFixed(1)]),
     phases:s.feet.map(f=>f.phase),pos:y.toFixed(1)});
 }
 console.log('SQUEEZE DIAG',JSON.stringify(logs));
});
