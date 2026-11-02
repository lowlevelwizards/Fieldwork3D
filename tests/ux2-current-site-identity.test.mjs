import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {currentSiteIdentity} from '../src/ui/current-site-identity.ts';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
const audit=readFileSync(new URL('../scripts/capture-breach.mjs',import.meta.url),'utf8');

test('current site identity distinguishes the current map from next-site preferences',()=>{
 assert.deepEqual(currentSiteIdentity({seed:23,scale:'medium'},true),{
  text:'CURRENT SITE · MEDIUM · SEED 23',seed:'23'
 });
 assert.deepEqual(currentSiteIdentity({seed:4294967295,scale:'expanded'},true),{
  text:'CURRENT SITE · EXPANDED · SEED 4294967295',seed:'4294967295'
 });
 assert.equal(currentSiteIdentity({seed:23},true).text,'CURRENT SITE · STANDARD · SEED 23');
});
test('never reveal procedural campaign seed or fake a seed for training',()=>{
 assert.deepEqual(currentSiteIdentity({seed:23,scale:'large'},false),{
  text:'CURRENT SITE · OPERATION',seed:null
 });
 assert.deepEqual(currentSiteIdentity({seed:45,training:true},true),{
  text:'CURRENT SITE · TRAINING RANGE',seed:null
 });
 assert.deepEqual(currentSiteIdentity(null,true),{
  text:'CURRENT SITE · TACTICAL TRAINING',seed:null
 });
});
test('settings present reproducible current seed, not hidden room layout in HUD',()=>{
 assert.match(html,/<output id="siteIdentity" class="site-identity"/);
 assert.match(html,/NEXT SITE SIZE/);
 assert.match(main,/currentSiteIdentity\(state.site,campaignMode==='quick'\)/);
 assert.match(main,/siteIdentityOutput\.dataset\.siteSeed=identity\.seed/);
 assert.match(main,/else delete siteIdentityOutput\.dataset\.siteSeed/);
 assert.match(main,/\(state\.intel\.mode==='floor-plan'\?state\.site\.roomCount:'\?'\)/);
});
test('mobile audit validates the actual new site rather than outdated HUD seed text',()=>{
 assert.match(audit,/locator\('#siteIdentity'\)\.getAttribute\('data-site-seed'\)/);
 assert.match(audit,/waitForFunction\(previous=>/);
 assert.doesNotMatch(audit,/siteTitle\.includes\('SEED'\)/);
 assert.match(audit,/siteTitle\?\.includes\('4 OPERATORS'\)/);
});
