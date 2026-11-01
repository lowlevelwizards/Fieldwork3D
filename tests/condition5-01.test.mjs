import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateSite} from '../src/breach-site.ts';
import {effectiveCondition,conditionFloorPixels} from '../src/worldgen/condition-visual.ts';
const lab=readFileSync(new URL('../map-lab.html',import.meta.url),'utf8');
test('Map Lab has a continuous condition control',()=>{
 assert.match(lab,/id="condition"/);
 assert.match(lab,/type="range"/);
});
test('floor condition is deterministic and transformative',()=>{
 const s=generateSite(126),r=s.rooms.find(r=>r.kind==='room');
 assert.ok(r);
 const clean=conditionFloorPixels(s,r,0),old=conditionFloorPixels(s,r,100);
 assert.deepEqual(clean,conditionFloorPixels(s,r,0));
 assert.deepEqual(old,conditionFloorPixels(s,r,100));
 const alpha=bytes=>Array.from(bytes).filter((_,i)=>i%4===3);
 assert.equal(Math.max(...alpha(clean)),0);
 assert.ok(alpha(old).filter(a=>a>60).length>500,'aged room has broad visible coverage');
 assert.ok(new Set(alpha(old)).size>15,'aging has spatial variation');
 assert.equal(effectiveCondition({...s,conditionLevel:85}),85);
});
