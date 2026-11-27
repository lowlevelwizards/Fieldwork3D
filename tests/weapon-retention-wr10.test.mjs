import test from 'node:test';import assert from 'node:assert/strict';
import {hasGroundedPrimary,ownGroundedPrimary,usesUnslungPlacement} from '../src/breach-grounded-primary.ts';
test('WR10 exact world identity distinguishes temporary placement from evidence',()=>{
 const a={id:'a',side:'blue',groundedPrimaryId:7,weaponConfiguration:{slots:{sling:'sling-none'}}};
 const item={id:7,ownerId:'a',status:'loose',temporaryPlacement:true};
 const s={droppedFirearms:[item],doors:[],coverState:[],civilians:[]};
 assert.ok(hasGroundedPrimary(a));assert.equal(ownGroundedPrimary(s,a),item);
 assert.equal(usesUnslungPlacement(s,a),true);
 item.status='secured';assert.equal(ownGroundedPrimary(s,a),undefined);
 assert.equal(hasGroundedPrimary(a),true);
 assert.equal(ownGroundedPrimary({...s,droppedFirearms:[{...item,status:'loose',ownerId:'b'}]},a),undefined);
});
