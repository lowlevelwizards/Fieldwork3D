import test from 'node:test';
import assert from 'node:assert/strict';
import {createMuzzleFlashGeometry,muzzleFlashAspect} from '../src/rendering/breach-muzzle-flash-art.ts';
test('V17 faceted muzzle flash uses one small colored mesh and no material groups',()=>{
 const g=createMuzzleFlashGeometry();
 const p=g.getAttribute('position'),c=g.getAttribute('color');
 assert.equal(p.count,72);assert.equal(c.count,p.count);assert.equal(g.groups.length,0);
 g.computeBoundingBox();
 assert.deepEqual(g.boundingBox.min.toArray(),[-3.5,-3.5,-3.5]);
 assert.deepEqual(g.boundingBox.max.toArray(),[3.5,3.5,3.5]);
 assert.ok(c.getX(2)>=c.getX(0)&&c.getY(2)>c.getY(0)&&c.getZ(2)>c.getZ(0));
 assert.ok(muzzleFlashAspect('rifle',false,null).x>muzzleFlashAspect('carbine',false,null).x);
 assert.ok(muzzleFlashAspect('shotgun',false,null).y>muzzleFlashAspect('smg',false,null).y);
 const pistol=muzzleFlashAspect('smg',true,null);
 assert.equal(pistol.x,pistol.y);assert.equal(pistol.y,pistol.z);
 assert.ok(muzzleFlashAspect('rifle',false,'muzzle-suppressor').y<muzzleFlashAspect('rifle',false,null).y);
 g.dispose();
});

import {createDetonationGeometry,sampleDetonationArt,DETONATION_ART_LIFETIME,detonationSmokeWeight} from '../src/rendering/breach-detonation-art.ts';
test('V17 compact angular detonation expires before its evidence and preserves deterministic age samples',()=>{
 const g=createDetonationGeometry();g.computeBoundingBox();
 assert.equal(g.getAttribute('position').count,144);
 assert.equal(g.groups.length,0);
 assert.deepEqual(g.boundingBox.min.toArray(),[-1,-1,-1]);
 assert.deepEqual(g.boundingBox.max.toArray(),[1,1,1]);
 const p={scale:0,verticalScale:0,opacity:0};
 assert.ok(sampleDetonationArt(0,p));const first={...p};assert.ok(first.scale>=14&&first.opacity===1);
 assert.equal(detonationSmokeWeight(0),0);assert.ok(detonationSmokeWeight(.2)>0&&detonationSmokeWeight(.2)<1);assert.equal(detonationSmokeWeight(.35),1);
 assert.ok(sampleDetonationArt(.1,p));assert.ok(p.scale>=first.scale);
 assert.ok(sampleDetonationArt(.35,p));assert.ok(p.verticalScale<p.scale);assert.ok(p.opacity<first.opacity);
 const after={...p};assert.equal(sampleDetonationArt(DETONATION_ART_LIFETIME,p),false);
 assert.deepEqual(p,after);assert.equal(sampleDetonationArt(NaN,p),false);
 assert.equal(sampleDetonationArt(-.01,p),false);
 assert.ok(sampleDetonationArt(0,p));assert.deepEqual(p,first);
 g.dispose();
});
