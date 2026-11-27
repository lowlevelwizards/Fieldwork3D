import test from 'node:test';import assert from 'node:assert/strict';
import {transportProfile,linkedTransportPatient} from '../src/breach-transport-navigation.ts';
test('CT3 transport uses distinct profiles and only reciprocal patient',()=>{
 const a={id:'a',carryingId:'b'},b={id:'b',carriedById:'a'};
 assert.equal(linkedTransportPatient({operators:[a,b],civilians:[]},a),b);
 assert.equal(linkedTransportPatient({operators:[a],civilians:[{...b,carriedById:'c'}]},a),undefined);
 assert.ok(transportProfile('drag').bodyRadius<transportProfile('carry').bodyRadius);
 assert.ok(transportProfile('drag').waypointTolerance<3);
});
