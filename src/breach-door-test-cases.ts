/** A single authored real-session door test map, not an approximation of
 * the production motor. Used by the interactive Door Range and Node audits.
 * Geometry is fixed; only hinge, pre-open angle and known fixtures vary.
 */
import type {Door,Obstacle,Pt,Segment} from './breach-core.ts';
import type {Site} from './breach-site.ts';
export type DoorRangeCaseId=
 'inward-left'|'outward-left'|'inward-right'|'outward-right'|
 'ajar-outward'|'wide-open'|'swing-furniture'|'near-frame'|
 'locked'|'wedged';
export type DoorRangeCase={
 id:DoorRangeCaseId;label:string;description:string;
 hinge:'a'|'b';swing:-1|1;initialFraction?:number;
 cover?:readonly Obstacle[];locked?:boolean;wedged?:boolean
};
export const DOOR_RANGE_CASES:readonly DoorRangeCase[]=[
 {id:'inward-left',label:'Inward · left hinge',description:'Four-operator normal entry',hinge:'a',swing:-1},
 {id:'outward-left',label:'Outward · left hinge',description:'Leaf swings toward the approaching team',hinge:'a',swing:1},
 {id:'inward-right',label:'Inward · right hinge',description:'Mirror the hinge without changing the plan',hinge:'b',swing:1},
 {id:'outward-right',label:'Outward · right hinge',description:'Outside-leaf bypass from the opposite edge',hinge:'b',swing:-1},
 {id:'ajar-outward',label:'Ajar · outward',description:'Real partly opened leaf, no ghost collision',hinge:'a',swing:1,initialFraction:.45},
 {id:'wide-open',label:'Pushed wide',description:'Door can open beyond the normal stop',hinge:'a',swing:1,initialFraction:1.35},
 {id:'swing-furniture',label:'Furniture blocks swing',description:'Physical obstruction should be reported, not crossed',hinge:'a',swing:-1,cover:[{x:322,y:295,w:18,h:22,fixture:'cabinet'}]},
 {id:'near-frame',label:'Furniture near frame',description:'Legal entry remains possible next to the jamb',hinge:'a',swing:-1,cover:[{x:352,y:305,w:16,h:18,fixture:'shelf'}]},
 {id:'locked',label:'Locked door',description:'No automatic penetration through a lock',hinge:'a',swing:-1,locked:true},
 {id:'wedged',label:'Wedged door',description:'A physically prevented opening must remain blocked',hinge:'a',swing:-1,wedged:true}
];
const p=(x:number,y:number):Pt=>({x,y});
const wall=(x:number,y:number,u:number,v:number):Segment=>({a:p(x,y),b:p(u,v)});
export function doorRangeCase(id:DoorRangeCaseId):DoorRangeCase{
 const found=DOOR_RANGE_CASES.find(c=>c.id===id);
 if(!found)throw Error('Unknown door test case '+id);
 return found;
}
export function doorRangeSite(id:DoorRangeCaseId):Site{
 const c=doorRangeCase(id);
 const door:Door={id:'ENTRY',a:p(290,260),b:p(332,260),
  kind:'hinged',hinge:c.hinge,swing:c.swing,
  open:c.initialFraction!==undefined,openedAt:c.initialFraction!==undefined?0:-1,
  locked:c.locked??false,wedged:c.wedged??false};
 return {
  seed:7400+DOOR_RANGE_CASES.findIndex(x=>x.id===id),
  name:'DOOR RANGE / '+c.label,training:true,layout:'corridor',
  scale:'small',roomCount:0,rooms:[],windows:[],
  walls:[wall(90,260,290,260),wall(332,260,550,260)],
  doors:[door],cover:c.cover?.map(o=>({...o}))??[],
  entrance:p(311,260),spawn:[
   p(300,200),p(308,173),p(316,146),p(325,119)
  ],enemies:[],objective:p(516,430),extract:p(516,445),
  bounds:{minX:0,minY:0,maxX:640,maxY:500}
 };
}
/** Session construction initializes open leaves at their usual angle.
 * Override AFTER initialization for the deliberately ajar/wide test cases.
 * No cross-session global site is activated here. */
export function prepareDoorRangeCase(
 session:{doors:Door[]},id:DoorRangeCaseId
):void{
 const c=doorRangeCase(id);
 if(c.initialFraction===undefined)return;
 const d=session.doors.find(x=>x.id==='ENTRY');
 if(!d)throw Error('Door test case requires ENTRY');
 d.open=true;d.openFraction=c.initialFraction;
 d.pushTarget=Math.max(1,c.initialFraction);d.angularVelocity=0;
}
