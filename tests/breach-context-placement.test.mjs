import test from 'node:test';
import assert from 'node:assert/strict';
import {placeContextMenu,pathOverlapsRect} from '../src/breach-context-placement.ts';

const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*
  Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));

test('phone context palette avoids the selected operator and teammates',()=>{
  // 430px portrait screen: operators near a doorway at the map centre.
  const actors=[
    {x:146,y:470,w:70,h:115,weight:3},
    {x:218,y:470,w:70,h:115,weight:3},
  ];
  const pos=placeContextMenu({
    anchor:{x:192,y:515},width:144,height:128,
    viewportWidth:430,top:100,bottom:710,
    avoid:[...actors,{x:162,y:485,w:76,h:76,weight:3}],
  });
  const menu={...pos,w:144,h:128};
  for(const actor of actors)
    assert.equal(overlap(menu,actor),0,'palette should not cover an operator');
  assert.ok(pos.x>=8&&pos.x+144<=422);
  assert.ok(pos.y>=100&&pos.y+128<=710);
  // A clear, beside-the-selection position is valid too: the placement
  // algorithm now tests adjacent side positions before stable edge rails.
  // The menu must not cover the tapped target, even when not on a rail.
  assert.ok(!(pos.x<=192&&192<=pos.x+144&&
    pos.y<=515&&515<=pos.y+128),
    'phone palette must remain outside the selected point');
});

test('route segments crossing the panel are detected even with endpoints outside',()=>{
  assert.equal(pathOverlapsRect({a:{x:0,y:190},b:{x:430,y:190}},
    {x:200,y:145,w:120,h:100}),true);
  assert.equal(pathOverlapsRect({a:{x:0,y:10},b:{x:430,y:10}},
    {x:200,y:145,w:120,h:100}),false);
});

test('menu stays between header and bottom controls at narrow and edge anchors',()=>{
  for(const x of [0,8,210,410,430]){
    const pos=placeContextMenu({
      anchor:{x,y:690},width:144,height:144,viewportWidth:430,
      top:115,bottom:700,avoid:[],
    });
    assert.ok(pos.x>=8&&pos.x+144<=422);
    assert.ok(pos.y>=115&&pos.y+144<=700);
  }
});

test('a blocked route lane pushes the palette away from the route',()=>{
  const path={a:{x:0,y:390},b:{x:430,y:390}};
  const pos=placeContextMenu({
    anchor:{x:220,y:390},width:144,height:120,
    viewportWidth:430,top:100,bottom:700,
    paths:[path],
    avoid:[{x:185,y:350,w:70,h:80,weight:3}],
  });
  assert.equal(pathOverlapsRect(path,{...pos,w:144,h:120}),false);
});
