import test from 'node:test';
import assert from 'node:assert/strict';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {newCampaign,setCampaignWardrobe,acceptContract,resolveOperation,readCampaign}
 from '../src/campaign-state.ts';
import {dispatchPilotAppearanceAllowed} from '../src/dispatch-pilot-appearance.ts';
import {applyStudioCampaignEdits} from '../src/operator-studio-batch-save.ts';
import {weaponOwnershipIssues} from '../src/equipment-weapon-ownership.ts';
import {commitCampaignToSlot,loadCampaignSlot}
 from '../src/campaign-save-slots.ts';

test('D6 supported personal details and uniform finishes preserve SWAT issued kit',()=>{
 const base=newDispatchPilotCampaign(120),p=base.operators[0],before=JSON.stringify(base);
 const look={...p.wardrobe,skinTone:'fair-neutral',hairStyle:'crop',
  hairTone:'auburn',sleeveState:'cuffed',trouserHem:'unbloused',
  gloveSolid:'charcoal',fabricSolids:{
   ...p.wardrobe.fabricSolids,top:'navy',trousers:'charcoal'}};
 assert.equal(dispatchPilotAppearanceAllowed(p.wardrobe,look,p.loadout),true);
 const next=setCampaignWardrobe(base,p.id,look);
 assert.notStrictEqual(next,base);
 const changed=next.operators[0];
 assert.equal(changed.wardrobe.skinTone,'fair-neutral');
 assert.equal(changed.wardrobe.fabricSolids.top,'navy');
 assert.equal(changed.wardrobe.gloveSolid,'charcoal');
 assert.deepEqual(changed.loadout,p.loadout);
 assert.equal(changed.weaponSerialId,p.weaponSerialId);
 assert.deepEqual(changed.wardrobe.markings,p.wardrobe.markings);
 assert.deepEqual(changed.wardrobe.styles,p.wardrobe.styles);
 assert.equal(JSON.stringify(base),before);
 assert.deepEqual(weaponOwnershipIssues(next),[]);
 assert.deepEqual(readCampaign(JSON.stringify(next)),next);
});

test('D6 forged helmet, markings, facewear, armor and helmet accessory edits fail closed',()=>{
 const c=newDispatchPilotCampaign(121),p=c.operators[0],w=p.wardrobe;
 const invalid=[
  {...w,styles:{...w.styles,headwear:'ach'}},
  {...w,styles:{...w.styles,top:'polo-shirt'}},
  {...w,styles:{...w.styles,armorStyle:'field-plate'}},
  {...w,markings:{...w.markings,chest:'label-police'}},
  {...w,policeVisorPosition:'lowered'},
  {...w,helmetField:{...w.helmetField,irStrobe:true}},
  {...w,fabricCamo:{...w.fabricCamo,top:'multicam'}},
  {...w,fabricSolids:{...w.fabricSolids,top:'rust'}},
  {...w,gloveSolid:'coyote'},
  {...w,gloveSolid:undefined},
  {...w,fabricSolids:{...w.fabricSolids,top:undefined}}
 ];
 for(const candidate of invalid){
  assert.equal(dispatchPilotAppearanceAllowed(w,candidate,p.loadout),false);
  assert.strictEqual(setCampaignWardrobe(c,p.id,candidate),c);
 }
});

test('D6 Studio campaign batch is atomic; unsupported edit cancels ALL operators',()=>{
 const c=newDispatchPilotCampaign(123),[a,b]=c.operators;
 const legal={id:a.id,wardrobe:{...a.wardrobe,skinTone:'deep-cool'}};
 const second={id:b.id,wardrobe:{...b.wardrobe,hairStyle:'tied-back'}};
 const accepted=applyStudioCampaignEdits(c,[legal,second]);
 assert.ok(accepted);
 assert.equal(accepted.operators[0].wardrobe.skinTone,'deep-cool');
 assert.equal(accepted.operators[1].wardrobe.hairStyle,'tied-back');
 assert.strictEqual(applyStudioCampaignEdits(c,[
  legal,{id:b.id,wardrobe:{...b.wardrobe,styles:{...b.wardrobe.styles,headwear:'pasgt'}}}
 ]),null);
 assert.equal(c.operators[0].wardrobe.skinTone,a.wardrobe.skinTone);
 assert.strictEqual(applyStudioCampaignEdits(
  acceptContract(c,c.contracts[0].id),[legal]),null);
 const legacy=newCampaign(123),old=legacy.operators[0];
 assert.notStrictEqual(setCampaignWardrobe(legacy,old.id,{
  ...old.wardrobe,styles:{...old.wardrobe.styles,headwear:'ach'}}),legacy);
});

test('D6 recruited SWAT operators can save supported looks without changing ownership',async()=>{
 const {hireRecruit}=await import('../src/campaign-state.ts');
 const recruited=hireRecruit(newDispatchPilotCampaign(224));
 const p=recruited.operators.at(-1);
 const modified=setCampaignWardrobe(recruited,p.id,{
  ...p.wardrobe,gloveSolid:'navy'});
 assert.equal(modified.operators.at(-1).wardrobe.gloveSolid,'navy');
 assert.deepEqual(weaponOwnershipIssues(modified),[]);
});

test('D6.3 full Dispatch lifecycle retains individualized uniform through an operation',()=>{
 const original=newDispatchPilotCampaign(880);
 const member=original.operators[0];
 const look={...member.wardrobe,skinTone:'deep-neutral',
  gloveSolid:'navy',fabricSolids:{...member.wardrobe.fabricSolids,top:'charcoal'}};
 const edited=setCampaignWardrobe(original,member.id,look);
 assert.equal(edited.operators[0].wardrobe.gloveSolid,'navy');
 const values=new Map();
 const storage={getItem:key=>values.get(key)??null,
  setItem:(key,value)=>values.set(key,value),
  removeItem:key=>values.delete(key)};
 assert.equal(commitCampaignToSlot(edited,'dispatch',storage),true);
 const loaded=loadCampaignSlot('dispatch',storage);
 const accepted=acceptContract(loaded,loaded.contracts[0].id);
 const job=accepted.contracts.find(x=>x.id===accepted.activeContractId);
 const report={id:'d6-sw-1',contractId:job.id,day:accepted.day,
  outcome:'success',grade:'B',elapsed:33,participatingIds:[member.id],
  casualties:[],objective:true,events:[]};
 const continued=resolveOperation(accepted,report);
 assert.equal(commitCampaignToSlot(continued,'dispatch',storage),true);
 const after=loadCampaignSlot('dispatch',storage);
 assert.equal(after.operators[0].wardrobe.skinTone,'deep-neutral');
 assert.equal(after.operators[0].wardrobe.gloveSolid,'navy');
 assert.equal(after.operators[0].wardrobe.fabricSolids.top,'charcoal');
 assert.deepEqual(weaponOwnershipIssues(after),[]);
 assert.equal(after.history.some(x=>x.id===report.id),true);
});
