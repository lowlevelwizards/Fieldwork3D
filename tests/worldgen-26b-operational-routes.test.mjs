import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectOperationalRoutes} from '../src/worldgen/operational-route-audit.ts';
import {auditGeneratedSite} from '../src/breach-site-audit.ts';

const room={id:'R',kind:'room',purpose:'reception',x:0,y:0,w:190,h:160};
const counter={x:95,y:56,w:56,h:24,fixture:'reception-desk',orientation:0};
const site=(cover=[counter])=>({rooms:[room],cover,doors:[],openings:[]});

test('physical route audit distinguishes clear-but-unreachable from blocked',()=>{
 const result=inspectOperationalRoutes(site(),p=>p.y>50);
 assert.deepEqual(result,[{fixture:'reception-desk',x:95,y:56,
  side:'staff',reason:'unreachable'}]);
 const obstructed={x:95,y:27,w:28,h:20,fixture:'crate'};
 const result2=inspectOperationalRoutes(site([counter,obstructed]),()=>true);
 assert.deepEqual(result2,[{fixture:'reception-desk',x:95,y:56,
  side:'staff',reason:'blocked-face'}]);
 assert.deepEqual(inspectOperationalRoutes(site(),()=>false,0),[]);
});

test('real seeded audits include deterministic operational route diagnostics',()=>{
 const a=auditGeneratedSite(14,'small');
 const b=auditGeneratedSite(14,'small');
 assert.deepEqual(a.operationalRouteIssues,b.operationalRouteIssues);
 assert.ok(Array.isArray(a.operationalRouteIssues));
 assert.ok(a.operationalRouteIssues.every(x=>
  ['customer','staff'].includes(x.side)&&
  ['blocked-face','unreachable'].includes(x.reason)));
});
