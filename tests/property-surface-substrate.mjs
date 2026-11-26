/** Shared public/private property-surface acceptance, used by both the
 * MAP16 and architecture suite. Public street fixtures are physically
 * defined by planPublicStreet, NOT by a private exterior forecourt zone.
 * Private ground decals still must fit entirely inside their own zone.
 */
import assert from 'node:assert/strict';
import {planPublicStreet} from '../src/worldgen/public-street-layout.ts';

export function assertPropertySurfaceSubstrate(site,mark){
 const zone=site.exteriorZones?.find(z=>z.id===mark.zoneId);
 const p=site.streetInfrastructure;
 if(p&&mark.id.startsWith('street:')&&mark.zoneId==='public-street'){
  const contains=r=>r&&Math.abs(r.x-mark.x)+mark.width/2<=r.width/2+.001&&Math.abs(r.y-mark.y)+mark.depth/2<=r.depth/2+.001;
  const exact=r=>r&&r.x===mark.x&&r.y===mark.y&&r.width===mark.width&&r.depth===mark.depth;
  const substrates=mark.kind==='sidewalk-joint'?p.frontage.sidewalkPieces:
   ['road-patch','road-manhole','street-drain','road-centerline','road-edge-line'].includes(mark.kind)?[p.frontage.road,p.junction?.road]:[];
  const full=mark.kind==='street-verge'?p.verge:mark.kind==='street-shoulder'?p.shoulder:
   mark.kind==='street-driveway-link'?p.accessConnection:mark.kind==='street-side-road'?(p.junction?.road??p.curbside):null;
  const publicSlabs=[...p.frontage.sidewalkPieces.map(r=>({kind:'sidewalk',r})),...p.frontage.curb.map(r=>({kind:'curb-edge',r})),{kind:'path',r:p.frontage.approach},{kind:'curb-ramp',r:p.frontage.curbRamp}];
  assert.ok(exact(full)||substrates.some(contains)||publicSlabs.some(s=>s.kind===mark.kind&&exact(s.r)), 'ST mark outside its authoritative substrate: '+mark.kind);
  return;
 }
 assert.ok(zone,'missing authored exterior zone: '+mark.zoneId);
 if(mark.id.startsWith('street:')){
  assert.equal(zone.id,'arrival-forecourt',
   'public street must attach to the public frontage identity');
  const street=planPublicStreet(site);
  assert.ok(street,'public marking must originate from an actual street plan');
  const rects=[
   ...street.sidewalkPieces.map(r=>({kind:'sidewalk',r})),
   ...(street.approach?[{kind:'path',r:street.approach}]:[]),
   ...street.curb.map(r=>({kind:'curb-edge',r})),
   ...(street.curbRamp?[{kind:'curb-ramp',r:street.curbRamp}]:[])
  ];
  assert.ok(rects.some(({kind,r})=>kind===mark.kind&&
    r.x===mark.x&&r.y===mark.y&&r.width===mark.width&&
    r.depth===mark.depth),
    'public street mark must exactly match the authoritative street plan');
  return;
 }
 assert.ok(mark.x-mark.width/2>=zone.x-zone.w/2-1,
  'private mark extends left of its own exterior zone');
 assert.ok(mark.x+mark.width/2<=zone.x+zone.w/2+1,
  'private mark extends right of its own exterior zone');
 assert.ok(mark.y-mark.depth/2>=zone.y-zone.h/2-1,
  'private mark extends above its own exterior zone');
 assert.ok(mark.y+mark.depth/2<=zone.y+zone.h/2+1,
  'private mark extends below its own exterior zone');
}
