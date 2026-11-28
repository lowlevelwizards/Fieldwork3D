import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudioNavigation} from '../src/studio/navigation.ts';
function setup(mode='quick',operatorId='rook'){
 const events=[];let allow=true;
 const nav=createStudioNavigation({mode,operatorId,returnTo:'host'}, {
  canLeave:()=>allow,onRoute:r=>events.push(r),onClose:c=>events.push(c)
 });
 return {nav,events,deny:()=>{allow=false;},allow:()=>{allow=true;}};
}
test('arsenal roundtrip restores exact operator/category across slot switches',()=>{
 const {nav}=setup();nav.selectCategory('head');nav.selectOperator('moss','primary');
 assert.equal(nav.openArsenal('primary'),true);nav.openArsenal('secondary');
 assert.deepEqual(nav.route,{workspace:'arsenal',operatorId:'moss',slot:'secondary'});
 assert.equal(nav.back(),true);assert.deepEqual(nav.route,{workspace:'operators',operatorId:'moss',category:'primary'});
});
test('blocked transition and close preserve route and return context',()=>{
 const {nav,events,deny,allow}=setup('campaign');nav.selectCategory('belt');deny();
 assert.equal(nav.openArsenal('primary'),false);assert.equal(nav.close(),false);
 assert.equal(nav.route.category,'belt');assert.equal(events.length,1);
 allow();nav.openArsenal('secondary');deny();assert.equal(nav.back(),false);
 allow();nav.back();assert.equal(nav.route.category,'belt');assert.equal(nav.close(),true);
 assert.deepEqual(events.at(-1),{mode:'campaign',operatorId:'rook',returnTo:'host'});
 assert.equal(nav.close(),false);assert.equal(nav.selectCategory('head'),false);
});
test('standalone library can open without operator but contextual slot cannot',()=>{
 const {nav}=setup('standalone',null);assert.equal(nav.openArsenal('primary'),false);
 assert.equal(nav.openArsenal(),true);nav.back();assert.equal(nav.route.operatorId,null);
 assert.throws(()=>setup('quick',null));
});
test('instances and immutable routes remain independent; repeated selections are inert',()=>{
 const a=setup(),b=setup('campaign','moss');a.nav.selectCategory('head');
 assert.equal(a.nav.selectCategory('head'),true);assert.equal(a.events.length,1);
 assert.equal(b.nav.route.category,null);assert.throws(()=>{a.nav.route.operatorId='other';});
});
test('reentrant host callbacks cannot change route or close twice',()=>{
 let nav;const results=[];nav=createStudioNavigation({mode:'quick',operatorId:'rook',returnTo:'board'}, {
  canLeave:()=>true,onRoute:()=>results.push(nav.close()),onClose:()=>results.push(nav.close())
 });
 nav.selectCategory('head');nav.close();assert.deepEqual(results,[false,false]);
});
