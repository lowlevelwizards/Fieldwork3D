import test from 'node:test';
import assert from 'node:assert/strict';
import {relationshipScore,allowSecondaryConnection,auditRoomRelationships}
 from '../src/worldgen/room-relationships.ts';
import {generateSite} from '../src/breach-site.ts';

test('functional adjacency rewards actual workflows over intrusive shortcuts',()=>{
 assert.ok(relationshipScore('clinic','exam','hallway')<
           relationshipScore('clinic','exam','waiting'));
 assert.ok(relationshipScore('restaurant','kitchen','service')<
           relationshipScore('restaurant','kitchen','restroom'));
 assert.ok(relationshipScore('garage','bay','workshop')<
           relationshipScore('garage','bay','waiting'));
 assert.ok(relationshipScore('motel','guest','hallway')<
           relationshipScore('motel','guest','laundry'));
 assert.equal(allowSecondaryConnection('clinic','exam','waiting'),false);
 assert.equal(allowSecondaryConnection('house','living','dining'),true);
});
test('relationship diagnostics are deterministic over live building sites',()=>{
 for(let seed=1;seed<=22;seed++){
  const a=generateSite(seed),b=generateSite(seed);
  assert.deepEqual(a.rooms,b.rooms);
  assert.deepEqual(auditRoomRelationships(a),auditRoomRelationships(b));
 }
});
