import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {propertySurfaceCenterHeight,exteriorZoneRenderLift,
 PROPERTY_SURFACE_THICKNESS} from '../src/rendering/property-surface-elevation.ts';
import {planPublicStreet} from '../src/worldgen/public-street-layout.ts';

const top=kind=>propertySurfaceCenterHeight(kind)+PROPERTY_SURFACE_THICKNESS/2;

test('intentionally overlapping opaque surface kinds never share a top plane',()=>{
 for(const [above,below] of [
  ['path','service-pad'],
  ['path','patio-paver'],
  ['path','planting-bed'],
  ['reserved-parking','path'],
  ['loading-zone','service-pad'],
  ['maintenance-bay','service-pad'],
  ['waste-collection','service-pad'],
 ])assert.ok(top(above)-top(below)>=.029,above+' must clear '+below);
 assert.ok(Math.abs(top('sidewalk')-(-1.04))<1e-8,
  'sidewalk height must still meet curb ramp without a step');
 assert.ok(top('reserved-parking')<top('sidewalk')-.04,
  'parking paint must not protrude through the sidewalk slab');
});

test('each exterior zone overlay has depth clearance on both sides',()=>{
 const source=readFileSync(new URL('../src/rendering/breach-site-exterior-builder.ts',
  import.meta.url),'utf8');
 // Guard the real builder, not just a duplicated local constant.
 assert.ok(source.includes('zone.x,zone.y,zone.w,zone.h,-1.435+lift'));
 const lifts=['rear-property','side-passage','court-0','arrival-forecourt']
  .map(exteriorZoneRenderLift);
 for(let i=0;i<lifts.length-1;i++){
  const zoneBase=-1.45+lifts[i],overlay=-1.435+lifts[i];
  const nextBase=-1.45+lifts[i+1];
  assert.ok(overlay-zoneBase>=.014,'overlay above its own zone');
  assert.ok(nextBase-overlay>=.019,'next zone above previous overlay');
 }
});

test('curb joins sidewalk without opaque coplanar overlap on all four streets',()=>{
 for(const entrySide of ['north','south','east','west']){
  const site={entrySide,entrance:{x:350,y:330},
   rooms:[{id:'R',x:225,y:230,w:250,h:200}],
   bounds:{minX:0,minY:0,maxX:700,maxY:700},
   exteriorZones:[{id:'arrival-forecourt',kind:'yard',x:350,y:500,w:250,h:85}]
  };
  const street=planPublicStreet(site);
  assert.ok(street?.sidewalk&&street.curb.length===1,entrySide);
  const vertical=entrySide==='north'||entrySide==='south';
  const sign=entrySide==='south'||entrySide==='east'?1:-1;
  const curb=street.curb[0],walk=street.sidewalk;
  const curbAcross=vertical?curb.depth:curb.width;
  const curbCenter=vertical?curb.y:curb.x;
  const walkAcross=vertical?walk.depth:walk.width;
  const walkCenter=vertical?walk.y:walk.x;
  const curbPropertyEdge=curbCenter-sign*curbAcross/2;
  const sidewalkStreetEdge=walkCenter+sign*walkAcross/2;
  assert.ok(Math.abs(curbPropertyEdge-sidewalkStreetEdge)<1e-8,
   entrySide+': curb and sidewalk must butt, not overlap');
 }
});
