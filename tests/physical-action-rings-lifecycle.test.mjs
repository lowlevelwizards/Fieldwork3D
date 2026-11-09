import test from 'node:test';
import assert from 'node:assert/strict';
import {PhysicalActionRings} from '../src/ui/physical-action-rings.ts';

function fakeDocument(){
  const nodes=[],all=[];
  const doc={
    body:{append(node){nodes.push(node);node.attached=true;}},
    createElement(tag){
      const children=[];
      const node={tag,style:{},hidden:false,attached:false,removed:false,
        textContent:'',
        append(child){children.push(child);},
        get firstElementChild(){return children[0]??null;},
        remove(){this.removed=true;this.attached=false;
          const i=nodes.indexOf(this);if(i>=0)nodes.splice(i,1);}
      };
      all.push(node);return node;
    }
  };
  return {doc,nodes,all};
}
const picker=(id='rook')=>({
  id,p:{x:120,y:100},health:4,
  plan:[{kind:'tool',toolMethod:'pick',doorId:'d1'}],
  actionTimer:2.75,lastDoorId:'d1',
  treatmentActive:false,treatmentProgress:0
});
const project=p=>({x:p.x+20,y:p.y+10});

test('ten thousand active frames reuse one ring and one label',()=>{
  const {doc,nodes,all}=fakeDocument();
  const rings=new PhysicalActionRings(doc),actor=picker();
  rings.update([actor],[{id:'d1',style:'regular'}],false,project);
  assert.equal(nodes.length,0,'no ring allocated while planning');
  for(let i=0;i<10000;i++)
    rings.update([actor],[{id:'d1'}],true,project);
  assert.equal(nodes.length,1);
  assert.equal(all.length,2,'one parent and one child, not one pair per RAF');
  assert.equal(rings.size,1);
  assert.equal(nodes[0].firstElementChild.textContent,'PICK 50%');
  assert.equal(nodes[0].style.left,'119px');
  assert.equal(nodes[0].style.top,'53px');
});
test('hidden states reuse node; mission teardown and roster change release it',()=>{
  const {doc,nodes,all}=fakeDocument(),rings=new PhysicalActionRings(doc);
  const actor=picker();
  rings.update([actor],[],true,project);
  rings.update([actor],[],false,project);
  assert.equal(nodes.length,1);
  assert.equal(nodes[0].style.display,'none');
  rings.update([],[],true,project);
  assert.equal(nodes.length,0);
  assert.equal(rings.size,0);
  assert.equal(all[0].removed,true);
  rings.update([actor],[],true,project);
  rings.clear();
  assert.equal(nodes.length,0);
  assert.equal(rings.size,0);
});
test('treatment and reinforced lockpicking preserve progress and labels',()=>{
  const {doc,nodes}=fakeDocument(),rings=new PhysicalActionRings(doc);
  const actor=picker();
  actor.actionTimer=4.25;
  rings.update([actor],[{id:'d1',style:'reinforced'}],true,project);
  assert.equal(nodes[0].firstElementChild.textContent,'PICK 50%');
  actor.treatmentActive=true;actor.treatmentProgress=.7;
  rings.update([actor],[],true,project);
  assert.equal(nodes[0].firstElementChild.textContent,'MED 70%');
  actor.health=0;
  rings.update([actor],[],true,project);
  assert.equal(nodes[0].style.display,'none');
  assert.equal(nodes.length,1);
});
