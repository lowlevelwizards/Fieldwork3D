/** Build 25.00: small, authored training site using the live tactical
 * movement, shot, door, cover, operator IK and replay pipelines. It is never
 * a separate shooting/physics implementation or a Campaign contract.
 */
import type {Site} from './breach-site.ts';
const point=(x:number,y:number)=>({x,y});
const segment=(x:number,y:number,u:number,v:number)=>({
 a:point(x,y),b:point(u,v)});
export function equipmentTrainingSite():Site{
 return {
  training:true,programLocked:true,seed:250025,
  name:'FIELD EQUIPMENT RANGE',archetype:'warehouse',scale:'small',
  condition:'occupied',conditionLevel:0,scenarioStyle:'routine',
  layout:'workshop',roomCount:3,
  rooms:[
   {id:'range',x:115,y:120,w:410,h:410,kind:'room',tone:1,purpose:'shooting range'},
   {id:'entry',x:240,y:545,w:170,h:90,kind:'hall',tone:2,purpose:'entry practice'},
   {id:'utility',x:120,y:545,w:105,h:90,kind:'room',tone:0,purpose:'equipment practice'}
  ],
  walls:[
   segment(115,120,525,120),segment(115,120,115,530),
   segment(525,120,525,530),segment(115,530,240,530),
   // Framed door bays: no free path around the locked or glazed leaves.
   segment(240,530,280,530),segment(322,530,340,530),
   segment(385,530,400,530),segment(400,530,525,530),
   segment(240,530,240,635),segment(410,530,410,635),
   segment(240,635,310,635),segment(355,635,410,635),
   segment(120,545,225,545),segment(120,545,120,635),
   segment(120,635,225,635),
   segment(225,545,225,570),segment(225,610,225,635)
  ],
  doors:[
   {id:'RANGE ENTRY',a:point(310,635),b:point(355,635),
    open:false,openedAt:-1,style:'wood',kind:'hinged',hinge:'a'},
   {id:'REINFORCED DEMO',a:point(280,530),b:point(322,530),
    open:false,openedAt:-1,style:'reinforced',kind:'hinged',hinge:'a',
    locked:true,latchIntegrity:3},
   {id:'GLAZED DEMO',a:point(340,530),b:point(385,530),
    open:false,openedAt:-1,style:'glazed',kind:'hinged',hinge:'b'},
   {id:'UTILITY BAY',a:point(225,570),b:point(225,610),
    open:false,openedAt:-1,style:'wood',kind:'hinged',hinge:'b'}
  ],
  cover:[
   {x:185,y:205,w:18,h:32,low:false,fixture:'target-plate'},
   {x:320,y:205,w:18,h:32,low:false,fixture:'target-plate'},
   {x:455,y:205,w:18,h:32,low:false,fixture:'target-plate'},
   {x:230,y:348,w:75,h:24,low:true,fixture:'shooting-bench'},
   {x:410,y:365,w:60,h:22,low:true,fixture:'shooting-bench'},
   {x:172,y:583,w:40,h:22,low:true,fixture:'tool-workbench'}
  ],
  entrance:point(331,635),
  spawn:[point(295,687),point(315,690),point(344,690),point(365,685)],
  enemies:[],enemyHeadings:[],
  objective:point(320,250),extract:point(330,693)
 };
}
