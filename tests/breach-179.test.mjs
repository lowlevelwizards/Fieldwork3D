import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {weaponClearance} from '../src/breach-weapon-clearance.ts';
import {muzzleAtShot} from '../src/breach-muzzle.ts';
import {fitWeaponPose} from '../src/breach-weapon-pose.ts';

const base={x:0,z:0,heading:0,weaponYaw:0,
  weapon:'carbine',aim:.9,velocity:0,recoil:0,posture:'stand'};
const wall=(x)=>({a:{x,y:-55},b:{x,y:55}});
test('179: real barrel fits freely in open floor, including different headings',()=>{
 for(const heading of [0,Math.PI/4,-Math.PI/2,2.5]){
  const p={...base,heading,weaponYaw:heading};
  const result=weaponClearance(p,[],[],[]);
  assert.equal(result.blocked,false);
  assert.equal(result.obstruction,false);
  assert.equal(result.retraction,0);
  assert.deepEqual(result.muzzle,muzzleAtShot(p));
 }
});
test('179: obstruction pulls rigid weapon underarm and shortens projection',()=>{
 const normal=muzzleAtShot(base);
 const short=muzzleAtShot({...base,obstruction:true});
 assert.ok(short.x<normal.x-1);
 const geometry=wall((normal.x+short.x)/2);
 const result=weaponClearance(base,[],[],[geometry]);
 assert.equal(result.obstruction,true);
 assert.equal(result.blocked,false);
 assert.equal(result.muzzle.x,short.x);
 assert.equal(result.retraction,0);
 // The rearward movement is an actual rig transform, not a projectile clamp.
 const stock=fitWeaponPose({weapon:'carbine',handling:'short',yaw:0,
   recoil:0,aimBlend:.9});
 const tucked=fitWeaponPose({weapon:'carbine',handling:'short',yaw:0,
   recoil:0,aimBlend:.9,clearanceRetraction:2.35});
 assert.ok(tucked.stock.x<stock.stock.x-2);
 assert.ok(tucked.primary.x<stock.primary.x-2);
});
test('179: an impossible blocked corridor suppresses shots, never moves actor',()=>{
 const before=JSON.stringify(base);
 const result=weaponClearance(base,[],[],[wall(17)]);
 assert.equal(result.obstruction,true);
 assert.equal(result.blocked,true);
 assert.ok(result.retraction>0);
 assert.equal(JSON.stringify(base),before);
});
test('179: door leaf and height-aware cover use the actual muzzle sweep',()=>{
 const normal=muzzleAtShot(base);
 const short=muzzleAtShot({...base,obstruction:true});
 const x=(normal.x+short.x)/2;
 const door={id:'door',a:{x,y:-30},b:{x,y:30},
   open:false,openedAt:0};
 const result=weaponClearance(base,[door],[],[]);
 assert.ok(result.obstruction);
 const low={x,y:0,w:2,h:60,low:true};
 const cover=weaponClearance(base,[],[low],[]);
 assert.equal(cover.blocked,false);
 // Waist-high cover should not behave like a ceiling-height wall.
 assert.equal(cover.obstruction,false);
});
test('179: renderer and combat use the same clearance, no motor displacement',()=>{
 const render=readFileSync(
   new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 const gameplay=readFileSync(
   new URL('../src/breach-game.ts',import.meta.url),'utf8');
 const rig=readFileSync(
   new URL('../src/breach-operator-rig.ts',import.meta.url),'utf8');
 assert.match(render,/obstruction:clearance.obstruction/);
 assert.match(render,/clearanceRetraction:clearance.retraction/);
 assert.match(gameplay,/if\(sightClearance.blocked\)/);
 assert.match(gameplay,/if\(shotClearance.blocked\)/);
 assert.match(gameplay,/if\(clearance.blocked\)return/);
 assert.match(rig,/clearanceRetraction:p.clearanceRetraction/);
 assert.doesNotMatch(render,/obstruction:!isClear/);
});
