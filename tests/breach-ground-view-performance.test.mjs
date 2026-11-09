import test from 'node:test';
import assert from 'node:assert/strict';
import {groundView,groundViewCandidate} from '../src/breach-ground-view.ts';

function reference(x,y,heading,px,py){
  const dx=px-x,dy=py-y;
  const delta=Math.atan2(Math.sin(Math.atan2(dy,dx)-heading),
    Math.cos(Math.atan2(dy,dx)-heading));
  return Math.hypot(dx,dy)<240&&Math.abs(delta)<1.15;
}

test('cheap ground FOV keeps the precise directional cone over moving viewpoints',()=>{
  let samples=0;
  for(const heading of [-Math.PI,-2.7,-1.5,-.3,0,.5,1.4,2.9,Math.PI]){
    const v=groundView(137.75,492.125,heading);
    for(const radius of [1,8,40,120,239.9,240.1,300]){
      for(let degrees=-180;degrees<=180;degrees+=3){
        const angle=degrees*Math.PI/180;
        const x=v.x+Math.cos(angle)*radius,y=v.y+Math.sin(angle)*radius;
        assert.equal(groundViewCandidate(v,x,y),
          reference(v.x,v.y,heading,x,y),
          'heading='+heading+' radius='+radius+' angle='+angle);
        samples++;
      }
    }
  }
  assert.ok(samples>7000);
});

test('ground FOV rejects radius boundary and rear hemisphere',()=>{
  const view=groundView(0,0,Math.PI/4);
  assert.equal(groundViewCandidate(view,240,0),false);
  assert.equal(groundViewCandidate(view,-20,-20),false);
  assert.equal(groundViewCandidate(view,10,10),true);
});

test('radial threshold preserves Math.hypot at constructed 240-unit circle',()=>{
  // Tiny squared-distance rounding differences must not reveal boundary
  // terrain or permit operator observation beyond the legacy strict radius.
  const x=203.5,y=392.125;
  let checked=0;
  for(const heading of [-Math.PI,-2.5,-1.25,-.4,0,.7,1.9,Math.PI]){
    const v=groundView(x,y,heading);
    for(let degrees=-180;degrees<180;degrees+=3){
      const angle=degrees*Math.PI/180;
      const px=x+Math.cos(angle)*240,py=y+Math.sin(angle)*240;
      assert.equal(groundViewCandidate(v,px,py),
        reference(x,y,heading,px,py),
        'radius boundary at '+heading+' / '+degrees);
      checked++;
    }
  }
  assert.equal(checked,960);
});
