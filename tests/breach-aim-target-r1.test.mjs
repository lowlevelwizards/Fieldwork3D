import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {aimTargetFromTap,insideTacticalBounds}
  from '../src/ui/aim-target.ts';

const pt=(x,y)=>({x,y});
test('LOOK and WATCH may target any finite world direction, including unseen rooms',()=>{
 const origin=pt(200,200);
 assert.deepEqual(aimTargetFromTap(origin,pt(1000,-300)),pt(1000,-300));
 assert.deepEqual(aimTargetFromTap(origin,pt(199,200)),pt(197,200));
 assert.equal(aimTargetFromTap(origin,origin),null);
 assert.equal(aimTargetFromTap(origin,pt(Infinity,4)),null);
});
test('site-bounded movement commands use procedural bounds, not legacy W/H',()=>{
 const bounds={minX:-80,minY:-40,maxX:970,maxY:740};
 assert.equal(insideTacticalBounds(pt(800,650),bounds),true);
 assert.equal(insideTacticalBounds(pt(-20,700),bounds),true);
 assert.equal(insideTacticalBounds(pt(975,700),bounds),false);
 assert.equal(insideTacticalBounds(pt(0,NaN),bounds),false);
});
test('armed directions bypass map-bound floor validation without hidden actor picking',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const stage=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(main,/if\(looking\|\|insideTacticalBounds\(pt,activeWorldBounds\(\)\)\)/);
 assert.match(main,/pointerAimWorld\(e\)/);
 assert.match(main,/aimTargetFromTap\(source,pt\)/);
 assert.match(stage,/screenToWorldAtHeight\(sx:number,sy:number,height:number\)/);
 assert.doesNotMatch(main,/if\(pt\.x>=0&&pt\.y>=0&&pt\.x<=W&&pt\.y<=H\)/);
});
