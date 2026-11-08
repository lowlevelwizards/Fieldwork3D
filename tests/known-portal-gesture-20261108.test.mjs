import test from 'node:test';
import assert from 'node:assert/strict';
import {knownPortalStrokeRoute} from '../src/breach-known-portal-stroke.ts';

// A 36-unit true doorway between two solid wall ends. This is geometry
// supplied ONLY after intel confirms the portal; serving sills are omitted.
const door={a:{x:50,y:40},b:{x:50,y:60}};
const from={x:30,y:74},to={x:70,y:74},blocked={x:49,y:74};
const shortThroughOpening=[
  {x:40,y:55},{x:60,y:55},to
];

test('slightly offset finger stroke is accepted through a short known legal portal',()=>{
  assert.equal(knownPortalStrokeRoute(from,to,blocked,[door],
    shortThroughOpening),true);
});

test('unknown portals, blocked actual routes and distant wall crossings stay rejected',()=>{
  assert.equal(knownPortalStrokeRoute(from,to,blocked,[],
    shortThroughOpening),false);
  assert.equal(knownPortalStrokeRoute(from,to,blocked,[door],[]),false);
  assert.equal(knownPortalStrokeRoute(from,to,{x:50,y:120},[door],
    shortThroughOpening),false);
  assert.equal(knownPortalStrokeRoute(from,to,blocked,[door],[
    {x:30,y:140},{x:70,y:140},to
  ]),false);
});

test('route must physically cross the SAME portal, not a nearby unrelated gap',()=>{
  assert.equal(knownPortalStrokeRoute(from,to,blocked,[door],[
    {x:40,y:74},{x:60,y:74},to
  ]),false);
  assert.equal(knownPortalStrokeRoute(from,to,blocked,[{
    a:{x:70,y:40},b:{x:70,y:60}
  }],shortThroughOpening),false);
});
