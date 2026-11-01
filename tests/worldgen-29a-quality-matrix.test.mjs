import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeSiteQuality,sampleSiteQuality}
 from '../src/worldgen/quality-matrix.ts';
import {auditGeneratedSite} from '../src/breach-site-audit.ts';
import {readFileSync} from 'node:fs';

test('quality aggregation ranks actual errors before cosmetic scores',()=>{
 const entry=(seed,archetype,score,errors=[])=>({
  seed,archetype,designQuality:{score},errors,
  incompleteZones:score?['Z']:[],serviceIssues:[],
  operationalRouteIssues:score?[{reason:'unreachable'}]:[]
 });
 const report=summarizeSiteQuality([
  entry(4,'clinic',4),entry(2,'office',0),
  entry(1,'clinic',9,['unreachable enemy'])
 ]);
 assert.equal(report.sampled,3);
 assert.equal(report.invalidSites,1);
 assert.equal(report.worst[0].seed,1);
 assert.deepEqual(report.byArchetype.map(x=>x.archetype),['clinic','office']);
 assert.equal(report.byArchetype[0].unreachableWorkFaces,2);
 assert.equal(report.byArchetype[0].averagePenalty,6.5);
});
test('seed matrix uses real site audits and preserves deterministic scores',()=>{
 const a=sampleSiteQuality([2,3],'small'),b=sampleSiteQuality([2,3],'small');
 assert.deepEqual(a,b);
 assert.equal(a.sampled,2);
 assert.equal(a.byArchetype.reduce((n,r)=>n+r.count,0),2);
 const site=auditGeneratedSite(2,'small');
 assert.ok(Number.isFinite(site.designQuality.score));
 assert.ok(site.designQuality.score>=0);
 assert.throws(()=>sampleSiteQuality(Array.from({length:49},(_,i)=>i),'small'),
  /capped at 48/);
});
test('Map Lab surfaces actual composite quality rather than a fake success label',()=>{
 const source=readFileSync(new URL('../src/map-lab-main.ts',import.meta.url),'utf8');
 assert.match(source,/FUNCTIONAL QUALITY:/);
 assert.match(source,/result\.designQuality\.score/);
});
