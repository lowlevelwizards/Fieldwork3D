import test from 'node:test';
import assert from 'node:assert/strict';
import {worldRouteLeafObstacle} from '../src/breach-squeeze-route.ts';
import {readFileSync} from 'node:fs';
const make=(id,open,fraction)=>({id,open,openFraction:fraction,kind:'hinged'});
test('D3.2.7: only the selected physical stalled partial leaf is excluded in route repair',()=>{
 assert.equal(worldRouteLeafObstacle(make('A',true,.6)),false);
 assert.equal(worldRouteLeafObstacle(make('A',true,.6),'A'),true);
 assert.equal(worldRouteLeafObstacle(make('A',true,.6),'B'),false);
 assert.equal(worldRouteLeafObstacle(make('A',true,.99),'B'),true);
 assert.equal(worldRouteLeafObstacle(make('A',false,0),'A'),false,
  'closed leaf remains eligible for normal authored opening');
 assert.equal(worldRouteLeafObstacle(make('A',true,.04),'A'),false,
  'barely unlatched leaf remains an opening operation');
});
test('D3.2.7: recovery only passes verified stalled leaf ID to physical route',()=>{
 const collision=readFileSync(new URL('../src/breach-motor-collision.ts',import.meta.url),'utf8');
 assert.match(collision,/routeWithSqueezeWorld\(a\.p,p,s\.doors,world,clearingDoorId\)/);
 const navigation=readFileSync(new URL('../src/breach-squeeze-route.ts',import.meta.url),'utf8');
 assert.match(navigation,/worldCanStand\(doors,world,stalledDoorId\)/);
 assert.match(navigation,/routeWithNormalWorld\(from,to,doors,world,/);
});
