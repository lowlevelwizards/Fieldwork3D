import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {activateSite,passable,route} from '../src/breach-core.ts';
test('exterior arrival grounds always align with actual frontage, on both map sizes',()=>{
 let courts=0;const sides=new Set();
 for(let seed=1;seed<=60;seed++)for(const scale of ['standard','expanded']){
  const s=generateSite(seed,scale);
  const front=s.exteriorZones?.find(z=>z.id==='arrival-forecourt');
  assert.ok(front,'missing entry ground '+seed);
  sides.add(s.entrySide);
  const b=s.bounds,center={x:front.x,y:front.y};
  const side=s.entrySide;
  if(side==='north')assert.ok(center.y<s.entrance.y);
  if(side==='south')assert.ok(center.y>s.entrance.y);
  if(side==='east')assert.ok(center.x>s.entrance.x);
  if(side==='west')assert.ok(center.x<s.entrance.x);
  assert.ok(front.x>=b.minX&&front.x<=b.maxX&&
    front.y>=b.minY&&front.y<=b.maxY);
  courts+=(s.exteriorZones??[]).filter(z=>z.id.startsWith('court-')).length;
  activateSite(s);
  try{assert.ok(passable(s.entrance));
    assert.ok(route(s.spawn[0],s.objective).length);}
  finally{activateSite(null);}
 }
 assert.equal(sides.size,4);
 assert.ok(courts>=3,'irregular plots should expose courtyard surfaces');
});
