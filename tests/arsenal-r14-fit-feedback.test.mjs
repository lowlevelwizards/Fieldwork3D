import test from 'node:test';
import assert from 'node:assert/strict';
import {arsenalFitFeedback} from '../src/arsenal/fit-feedback.ts';
const p=(valid,reasons=[],requiresConfirmation=false)=>({
 valid,requestedSlot:'stock',requestedPartId:'bad',changes:[],
 requiresConfirmation,reasons
});
test('incompatible entries tell the user why; never imply forced installation',()=>{
 const no=arsenalFitFeedback(p(false,['Requires a different receiver']));
 assert.equal(no.state,'incompatible');
 assert.match(no.label,/TAP FOR WHY/);
 assert.match(no.explanation,/Choose Model/);
 assert.match(no.explanation,/Nothing was changed/);
 const rail=arsenalFitFeedback(p(false,['This optic needs a compatible mount']));
 assert.match(rail.explanation,/optic mount/);
});
test('dependency changes, direct fits and equipped parts remain distinct',()=>{
 assert.equal(arsenalFitFeedback(p(true,[],true)).state,'requires');
 assert.equal(arsenalFitFeedback(p(true)).state,'fits');
 assert.equal(arsenalFitFeedback(p(true),true).state,'equipped');
});
