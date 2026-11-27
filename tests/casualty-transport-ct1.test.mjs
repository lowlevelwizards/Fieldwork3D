import test from 'node:test';import assert from 'node:assert/strict';
import {acquireTransport,releaseTransport,hasTransportLink} from '../src/breach-transport-custody.ts';
const actor=(id,health=4)=>({id,health,carryingId:null,carriedById:null,transportLatched:false});
test('CT1 reciprocal transport cannot overwrite another carrier, or acquire self',()=>{
 const a=actor('a'),b=actor('b',0),c=actor('c');
 assert.equal(acquireTransport(a,a,'drag'),false);
 assert.equal(acquireTransport(a,b,'drag'),true);
 assert.equal(hasTransportLink(a,b),true);
 assert.equal(acquireTransport(c,b,'carry'),false);
 assert.equal(releaseTransport(c,b),false);
 a.transportLatched=true;assert.equal(releaseTransport(a,b),true);
 assert.equal(a.transportLatched,false);assert.equal(b.transportMode,null);
 assert.equal(acquireTransport(c,b,'carry'),true);
});
