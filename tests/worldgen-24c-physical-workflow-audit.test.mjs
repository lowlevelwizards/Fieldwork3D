import test from 'node:test';
import assert from 'node:assert/strict';
import {missingPhysicalWorkflowLinks} from '../src/worldgen/workflow-door-audit.ts';
import {generateSite} from '../src/breach-site.ts';
import {auditSite} from '../src/breach-site-audit.ts';

const room=(id,purpose,x,y)=>({id,purpose,x,y,w:120,h:120,kind:'room'});
const sale=room('sales','sales',0,0);
const checkout=room('checkout','checkout',120,0);
const stockroom=room('stockroom','stockroom',0,120);
const door=(id,ax,ay,bx,by)=>({id,a:{x:ax,y:ay},b:{x:bx,y:by}});
const fixture={
 archetype:'retail',rooms:[sale,checkout,stockroom],
 doors:[door('checkout-connection',120,32,120,80)],openings:[]
};

test('a wall alone cannot satisfy a physical operational connection',()=>{
 assert.deepEqual(missingPhysicalWorkflowLinks(fixture),
  [{a:'stockroom',b:'sales'}]);
 assert.deepEqual(missingPhysicalWorkflowLinks({...fixture,
  doors:[...fixture.doors,door('stock',35,120,83,120)]}),[]);
 assert.deepEqual(missingPhysicalWorkflowLinks({...fixture,
  openings:[{id:'stock-opening',a:{x:35,y:120},b:{x:83,y:120}}]}),[]);
});

test('missing spaces are not treated as required and physical audit is deterministic',()=>{
 assert.deepEqual(missingPhysicalWorkflowLinks({...fixture,
  rooms:[sale,checkout]}),[]);
 for(const seed of [3,14,25]){
  const site=generateSite(seed,'standard');
  const report=auditSite(site);
  assert.deepEqual(report.missingWorkflowLinks,missingPhysicalWorkflowLinks(site));
  assert.deepEqual(report.missingWorkflowLinks,
   auditSite(generateSite(seed,'standard')).missingWorkflowLinks);
 }
});
