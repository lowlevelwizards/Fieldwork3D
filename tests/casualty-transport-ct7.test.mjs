import test from 'node:test';import assert from 'node:assert/strict';
import {transportThroatContains,transportPatientInThroat,transportThroatOccupiedByOther} from '../src/breach-transport-door-clearance.ts';
test('CT7 a carried patient still occupies the aperture after carrier clears',()=>{
 const door={a:{x:0,y:-20},b:{x:0,y:20}};
 const carrier={id:'a',health:4,p:{x:30,y:0},carryingId:'b'};
 const body={id:'b',health:0,p:{x:5,y:0},carriedById:'a'};
 const peer={id:'c',health:4,p:{x:-25,y:0},carryingId:null};
 const s={operators:[carrier,body,peer],civilians:[]};
 assert.equal(transportThroatContains(carrier.p,door),false);
 assert.equal(transportPatientInThroat(s,carrier,door),true);
 assert.equal(transportThroatOccupiedByOther(s,peer,door),true);
 assert.equal(transportThroatOccupiedByOther(s,carrier,door),false);
 body.p={x:25,y:0};assert.equal(transportThroatOccupiedByOther(s,peer,door),false);
});
