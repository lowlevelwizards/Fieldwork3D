import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,team,toggling,stepSession,liveVisibility}
  from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {LabMotionCache,LAB_TRACKS} from '../src/breach-lab-tracks.ts';
import {fitWeaponPose} from '../src/breach-weapon-pose.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';

test('158: dense explored ground has persistent 10-unit samples',()=>{
  const s=newSession(),operator=team(s)[0];
  s.operators.filter(a=>a.side==='red').forEach(a=>a.health=0);
  toggling(s);
  for(let i=0;i<13;i++)stepSession(s,1/60);
  const micro=[...s.seenGround].filter(key=>key.startsWith('micro:'));
  assert.ok(micro.length>100,'fine observed ground should be retained');
  const p={x:operator.p.x+25*Math.cos(operator.heading),
    y:operator.p.y+25*Math.sin(operator.heading)};
  assert.ok(liveVisibility(s,p));
  assert.ok([...s.seenGround].some(key=>key.startsWith('fine:')),
    'older replay/intel keys remain available');
  activateSite(null);
});

test('158: fog is a final ground-registered transparency overlay',()=>{
  const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
  assert.match(scene,/smoothFog\.position\.set\(W\/2,1\.05,H\/2\)/);
  assert.match(scene,/smoothFog\.renderOrder=1000/);
  assert.match(scene,/map:this\.fogTexture,transparent:true,depthTest:true/);
  const mask=readFileSync(new URL('../src/breach-fog-mask.ts',import.meta.url),'utf8');
  assert.match(mask,/fillStyle='#000'/);
  assert.match(mask,/globalCompositeOperation='destination-out'/);
  assert.match(mask,/MICRO_KEYS/);
  assert.doesNotMatch(mask,/liveVisibility\(s,p\)/,
    'coarse live center samples must not punch holes through walls');
  assert.match(mask,/visionPolygon\(/);
});

test('158: six weapon-ready poses are separately selectable and deterministic',()=>{
  const cases={'high-ready':'high','low-ready':'low','ready':'ready',
    'short-stock':'short','active-aim':'ads','point-shoot':'point'};
  const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
  const lab=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
  for(const [name,handling] of Object.entries(cases)){
    assert.ok(LAB_TRACKS.includes(name),name+' missing from motion sampling');
    assert.ok(html.includes('data-pose="'+name+'"'),name+' missing button');
    assert.ok(lab.includes("'"+name+"':'"+handling+"'"),
      name+' has no concrete shared-rig handling override');
    const cache=new LabMotionCache(name),pose=cache.sample(1.25);
    assert.equal(pose.motion.speed,0);
    assert.ok(pose.feet.every(foot=>foot.contact));
  }
});

test('158: short-stock firearm is physically retracted, ready and ADS distinct',()=>{
  const fit=handling=>fitWeaponPose({weapon:'carbine',
    handling,yaw:0,recoil:0});
  const ready=fit('ready'),short=fit('short'),ads=fit('ads');
  assert.ok(short.stock.x<ready.stock.x-1,
    'short stock should be closer to chest rather than a mere label');
  assert.ok(ads.stock.y>ready.stock.y+1);
  const rig=createOperatorRig('rook','blue');
  const p={x:0,z:0,seconds:1,heading:0,velocity:0,stride:0,
    posture:'stand',injury:0,weapon:'carbine',reload:0,
    reloadDuration:1.8,lastThrowAt:-100,lastDoorAt:-100,
    down:false,surrender:false,aiming:false,firing:false,
    turning:0,deterministic:true};
  const positions=[];
  for(const mode of ['low','ready','high','short','point','ads']){
    poseOperator(rig,{...p,handlingOverride:mode},0);
    positions.push(rig.weapon.position.clone());
    assert.ok(Number.isFinite(rig.gripError));
  }
  assert.ok(new Set(positions.map(v=>v.toArray().map(x=>x.toFixed(2)).join(','))).size>=4,
    'lab previews should not all resolve to one identical weapon pose');
  rig.dispose();
});
