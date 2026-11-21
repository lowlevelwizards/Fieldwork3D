/** D3.32: immutable Clinic D9 geometry witness behind the true motor
 * arrival test. One fully open solid leaf blocks the original straight
 * grid chord, but an exact pair of full-body swept legs is lawful.
 * No live order, actor, door, collision, or controller is modified.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession} from '../src/breach-game.ts';
import {OPERATOR_RADIUS,doorLeafSegment,pointToSegment}
 from '../src/breach-core.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {sweptBodyClear,bodyClear} from '../src/breach-navigation.ts';

test('D3.32 Clinic D9: old chord blocked, two swept full-body legs clear',()=>{
 const site=generateSite(14490156,'standard',undefined,
  {mission:'intel'},{archetype:'clinic'});
 const quiet={...site,training:true,enemies:[],encounter:undefined};
 const s=newSession(0,14490156,'full-view',
  site.scale??'standard','intel',quiet,{enableCivilians:false});
 // Actual 45s frozen authored-Clinic final door states from immutable
 // D3.31 release artifact, not a hand-built altered collision world.
 const opened=new Map([
  ['FRONT',1.55],['D3',1],['D9',1.55],['D10',1],
  ['SERVICE',1],['COURT-1',1],['COURT-2',1]
 ]);
 for(const door of s.doors){
  const f=opened.get(door.id);
  if(f!==undefined)Object.assign(door,{
   open:true,openFraction:f,pushTarget:f,
   angularVelocity:0,heldBy:null
  });
 }
 const from={x:438.58021388219123,y:288.3752156662747};
 const first={x:432,y:352};
 const angle=Math.PI/4;
 const stage={x:from.x+Math.cos(angle)*32,
  y:from.y+Math.sin(angle)*32};
 const world=sessionWorldGeometry(s);
 const sweep=(a,b)=>sweptBodyClear(a,b,s.doors,
  OPERATOR_RADIUS,world);
 const stand=p=>bodyClear(p,s.doors,OPERATOR_RADIUS,world);
 const d9=s.doors.find(d=>d.id==='D9');
 assert.ok(d9);
 assert.equal(d9.openFraction,1.55);
 assert.ok(pointToSegment(from,doorLeafSegment(d9))<
  OPERATOR_RADIUS+2,'real leaf contact, not a remote detour');
 assert.ok(stand(from)&&stand(stage)&&stand(first));
 assert.equal(sweep(from,first),false,
  'original first grid chord physically hits the open leaf');
 assert.equal(sweep(from,stage),true,'new first leg is fully swept');
 assert.equal(sweep(stage,first),true,'second leg rejoins SAME nav node');
 console.log('D332_D9_PHYSICAL_WITNESS',JSON.stringify({
  directBlocked:true,stage,fullBodyLegsClear:2,
  doorId:'D9',fraction:d9.openFraction
 }));
});
