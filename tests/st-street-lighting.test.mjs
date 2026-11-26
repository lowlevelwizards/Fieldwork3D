import test from 'node:test';import assert from 'node:assert/strict';
import {planSiteLighting,siteLightingTopology} from '../src/equipment-site-lighting.ts';
import {createSitePowerState} from '../src/equipment-site-power.ts';
test('physical ST lamps share existing circuit and fixture cap, night on/day and blackout off',()=>{
 const lamp={id:'p-lamp',fixture:'street-lamp',x:300,y:300,w:18,h:18,orientation:0,low:true};
 const site={seed:4,condition:'occupied',rooms:[],cover:[lamp],streetInfrastructure:{version:1}};
 const topology=siteLightingTopology(site);
 assert.equal(topology.length,1);assert.equal(topology[0].kind,'street');
 assert.equal(topology[0].mainCircuit,'mains:1');
 assert.equal(topology[0].p.y,300+18*1.23);
 for(const mode of ['day','evening','night','blackout','emergency']){
  const state=createSitePowerState(site,mode),expected=mode==='evening'||mode==='night'?1:0;
  assert.equal(planSiteLighting(site,mode,state).sources.length,expected);
  assert.equal(planSiteLighting(site,mode).sources.length,expected);
 }
 const state=createSitePowerState(site,'night');state.circuits['mains:1']=false;
 assert.equal(planSiteLighting(site,'night',state).sources.length,0);
 assert.equal(siteLightingTopology({...site,streetInfrastructure:undefined}).length,0);
});
