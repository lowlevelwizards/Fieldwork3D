import test from 'node:test';
import assert from 'node:assert/strict';
import {coverHeight,coverImpactFraction} from '../src/breach-cover-height.ts';
import {coverSupportSurface} from '../src/breach-contextual-support-contact.ts';

test('A3.9-H0 authored physical top overrides a catalog fixture height',()=>{
 const fixture={x:50,y:50,w:30,h:30,fixture:'shelf',
   low:false,topHeight:19};
 assert.equal(coverHeight(fixture),19);
 const surface=coverSupportSurface({x:26,y:50},fixture,'cover:0');
 assert.ok(surface);
 assert.equal(surface.height,19);
 assert.equal(coverImpactFraction({x:10,y:50},{x:90,y:50},
   20,20,fixture),null,'20-unit trajectory clears 19-unit cover');
 assert.notEqual(coverImpactFraction({x:10,y:50},{x:90,y:50},
   18,18,fixture),null,'18-unit trajectory strikes 19-unit cover');
});
test('A3.9-H0 toppled cover loses both ballistics and brace height',()=>{
 const cover={x:50,y:50,w:30,h:30,fixture:'shelf',
   topHeight:30,toppled:true};
 assert.equal(coverHeight(cover),7);
 assert.equal(coverSupportSurface({x:26,y:50},cover,'cover:0'),null);
 assert.equal(coverImpactFraction({x:10,y:50},{x:90,y:50},
   18,18,cover),null);
});
test('A3.9-H0 fixture fallbacks remain finite and explicit zero height remains valid',()=>{
 assert.equal(coverHeight({x:0,y:0,w:10,h:10,topHeight:0}),0);
 assert.equal(coverHeight({x:0,y:0,w:10,h:10,low:true}),12);
 assert.equal(coverHeight({x:0,y:0,w:10,h:10,low:false}),27);
});
