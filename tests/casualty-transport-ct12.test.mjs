import test from 'node:test';import assert from 'node:assert/strict';
import {projectedTransportPatient,transportContextAllowed} from '../src/breach-transport-controls.ts';
import {contextActionChoices} from '../src/ui/context-actions.ts';
test('CT12 projected pickup, ordinary move and queued set down remain distinct from custody',()=>{
 const pickup={kind:'evacuate',transportPickup:true,patientId:'b'},move={kind:'move'},release={kind:'interact',interaction:'release-capture-target',objectId:'b'};
 assert.equal(projectedTransportPatient(null,[pickup,move]),'b');
 assert.equal(projectedTransportPatient(null,[pickup,move,release]),null);
 assert.equal(projectedTransportPatient('b',[move]),'b');
 const base={door:false,node:true,flashRemaining:2,posture:'stand',pace:'walk',firePolicy:'engage',reserve:30,magazine:30,secondaryIssued:true,treatTargetName:'Moss'};
 const actions=contextActionChoices({...base,carryingCaptureTarget:true,transportQueued:true});
 assert.ok(actions.some(a=>a.id==='ctxReleaseCapture'&&a.label==='SET DOWN HERE'));
 assert.ok(!actions.some(a=>a.id==='ctxReload'||a.id==='ctxTreat'||a.id==='ctxFlash'));
 assert.equal(transportContextAllowed('ctxSwitchWeapon'),false);
});
