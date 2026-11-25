import test from 'node:test';
import assert from 'node:assert/strict';
import {retainImpactMark} from '../src/breach-impact-evidence-buffer.ts';
import {bloodMarkRadius} from '../src/breach-blood-evidence.ts';
import {coverInitialIntegrity,damageCover} from '../src/breach-reactive-cover.ts';
import {MATERIALS} from '../src/breach-materials.ts';
import {retainCollapsePuff,retainAtmosphereTails,ATMOSPHERE_LIMIT} from '../src/breach-atmosphere-evidence.ts';
import {createCasingGeometry,casingVisualProfile} from '../src/rendering/breach-casing-art.ts';
import {sampleMaterialImpact,MATERIAL_IMPACT_PROFILES} from '../src/rendering/breach-material-impact-atom.ts';
import {coverDebrisSource,fractureDebrisPose} from '../src/rendering/breach-fracture-debris.ts';
import {samplePuff,puffCount} from '../src/rendering/breach-dust-puffs.ts';
test('V21 first drops stay small, four nearby drops promote, moving drops stay behind',()=>{
 const s={impactMarks:[]};
 const drop=(id,x,owner='a')=>({id,p:{x,y:20},surface:'blood',age:0,bloodKind:'drop',bloodAmount:1,bloodDrops:1,bloodOwnerId:owner});
 for(let i=0;i<4;i++){retainImpactMark(s,drop(i,20));assert.equal(s.impactMarks.length,1);assert.equal(s.impactMarks[0].bloodKind,i<3?'drop':'pool');}
 assert.ok(bloodMarkRadius(s.impactMarks[0])>10);
 for(let i=0;i<6;i++)retainImpactMark(s,drop(i+10,40+i*10));
 assert.equal(s.impactMarks.length,7);
 assert.ok(s.impactMarks.slice(1).every(m=>m.bloodKind==='drop'&&bloodMarkRadius(m)<=3.5));
 retainImpactMark(s,drop(20,20,'b'));assert.equal(s.impactMarks.length,8);
 const wall=[{a:{x:100,y:0},b:{x:100,y:40}}],w={impactMarks:[]};
 retainImpactMark(w,drop(30,99),wall);retainImpactMark(w,drop(31,101),wall);assert.equal(w.impactMarks.length,2);
});
test('V21 rectangular casing, cooler smoke, warm dust, fixed smaller puff counts',()=>{
 const g=createCasingGeometry();assert.equal(g.type,'BoxGeometry');assert.equal(g.index.count,36);g.dispose();
 assert.ok(casingVisualProfile({weapon:'rifle'}).length>1.21);
 const smoke={},dust={};samplePuff('muzzle',1,0,.1,0,10,0,smoke);samplePuff('dust',1,0,.1,0,10,0,dust);
 assert.ok(smoke.color<dust.color);assert.ok((smoke.color&255)>((smoke.color>>16)&255));assert.ok((dust.color&255)<((dust.color>>16)&255));assert.equal(puffCount('dust'),2);
});
test('V21 furniture survives more strikes, collapses once with larger material debris and bounded puff',()=>{
 const box={id:'desk',fixture:'desk',x:100,y:100,w:40,h:30,topHeight:25,material:'hardwood'};
 assert.ok(coverInitialIntegrity(box)>MATERIALS.hardwood.integrity);
 assert.equal(coverInitialIntegrity({fixture:'glass-barrier'}),MATERIALS.glass.integrity);
 assert.equal(coverInitialIntegrity({fixture:'vehicle'}),MATERIALS['sheet-metal'].integrity);
 for(let i=0;i<5;i++)assert.equal(damageCover(box,.45,i),'damaged');
 assert.equal(damageCover(box,2,5),'collapsed');assert.equal(damageCover(box,2,6),'immune');
 const source=coverDebrisSource(box,0),pose={};assert.ok(fractureDebrisPose(source,5.1,0,false,pose));assert.ok(pose.scale>=3.5);
 const s={seconds:5,nextEffectId:1,shots:[],flashBursts:[]};retainCollapsePuff(s,box);
 assert.equal(s.atmosphere[0].kind,'collapse');assert.equal(s.atmosphere[0].p.x,100);
 for(let i=0;i<100;i++)retainCollapsePuff(s,box);assert.equal(s.atmosphere.length,ATMOSPHERE_LIMIT);
 s.seconds=8;retainAtmosphereTails(s,.02);assert.equal(s.atmosphere.length,0);
});
test('V21 fixture accents replace existing slots with flat paper/cardboard or chunky fabric',()=>{
 for(const [surface,fixture] of [['wood','desk'],['metal','filing-cabinet'],['wood','box'],['dust','sofa']]){
  const i=MATERIAL_IMPACT_PROFILES[surface].count-1,a={},b={};
  assert.ok(sampleMaterialImpact(surface,1,i,.1,0,10,0,a,fixture));
  assert.ok(sampleMaterialImpact(surface,1,i,.1,0,10,0,b));
  assert.ok(a.depth<a.width);assert.notEqual(a.color,b.color);
  assert.equal(sampleMaterialImpact(surface,1,i,.1,0,10,0,a,fixture),true);
 }
});
