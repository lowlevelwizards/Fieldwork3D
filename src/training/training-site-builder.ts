/** Small authored killhouse using the SAME wall, door and cover structures
 * as real missions. No proxy physics, fabricated reachability or AI. */
import type {Site,Room} from '../breach-site.ts';
import {equipmentTrainingSite} from '../equipment-training-range.ts';
import {TRAINING_LAYOUT_LABELS,type TrainingConfig} from './training-courses.ts';
import {TRIALS} from './training-trials.ts';
const p=(x:number,y:number)=>({x,y});
const wall=(x:number,y:number,u:number,v:number)=>({a:p(x,y),b:p(u,v)});
const DOOR_Y=[172,342,512] as const;
const targets=[
 {x:152,y:181},{x:162,y:348},{x:175,y:520},
 {x:528,y:178},{x:516,y:348},{x:505,y:522}
] as const;
export function buildTrainingSite(config:TrainingConfig):Site{
 if(config.activity==='range')return equipmentTrainingSite();
 const trial=config.activity==='trial'?TRIALS[config.trial??'discrimination']:null;
 const options=trial?{...config,layout:trial.layout,
  targetDensity:trial.targetDensity,lighting:trial.lighting,
  squadSize:trial.squadSize,doors:'closed' as const}:config;
 const doors:Site['doors']=[];
 const walls:Site['walls']=[];
 const addDoor=(id:string,x:number,y:number,u:number,v:number,index:number)=>{
  const open=options.doors==='open'||(options.doors==='mixed'&&index%3===0);
  doors.push({id,a:p(x,y),b:p(u,v),kind:'hinged',
   style:index%5===0?'glazed':index%4===0?'reinforced':'wood',
   hinge:index%2===0?'a':'b',open,openedAt:open?0:-1,
   locked:options.doors==='mixed'&&index%5===4});
 };
 // The staging side is fully sealed except for the real entry leaf.
 walls.push(wall(80,100,600,100),wall(80,100,80,600),
  wall(600,100,600,600),wall(80,600,320,600),wall(364,600,600,600));
 addDoor('KH ENTRY',320,600,364,600,0);
 // Corridor walls are cut around real 44-unit portal openings.
 for(const [side,x] of [[0,280],[1,400]] as const){
  let last=100;
  for(let tier=0;tier<3;tier++){
   const start=DOOR_Y[tier],end=start+44;
   walls.push(wall(x,last,x,start));
   addDoor('KH '+(side===0?'L':'R')+(tier+1),
    x,start,x,end,1+side*3+tier);
   last=end;
  }
  walls.push(wall(x,last,x,600));
 }
 // Room subdivisions: compound adds physical inter-room doors, while
 // the other variants retain intact walls; every bay still has a hall entry.
 const openedPartitions=options.layout==='compound'||options.layout==='linear';
 for(const x of [80,400]){
  const end=x===80?280:600;
  for(const [tier,y] of [280,440].entries()){
   if(openedPartitions){
    const gapX=x+(options.layout==='linear'?
     (x===80?88:62):90);
    walls.push(wall(x,y,gapX,y),wall(gapX+42,y,end,y));
    addDoor('KH LINK '+x+'-'+tier,gapX,y,gapX+42,y,7+tier+(x===80?0:2));
   }else walls.push(wall(x,y,end,y));
  }
 }
 // Training's branching/layout variation is intentional, deterministic
 // cover placement rather than a second procedural map generation system.
 const rooms:Room[]=[
  {id:'hall',x:280,y:100,w:120,h:500,kind:'hall',tone:2,purpose:'corridor'}
 ];
 for(const [side,x] of [['L',80],['R',400]] as const){
  for(let n=0;n<3;n++){
   const y=[100,280,440][n],h=[180,160,160][n];
   rooms.push({id:side+(n+1),x,y,w:200,h,
    kind:'room',tone:(n+Number(side==='R'))%3,
    purpose:n===0?'entry drill':n===1?'target discrimination':'room clearing'});
  }
 }
 const count=options.targetDensity==='none'?0:
  options.targetDensity==='sparse'?3:
  options.targetDensity==='standard'?4:6;
 const choices=options.layout==='linear'?[0,1,2,5,4,3]:
  options.layout==='branch'?[0,3,1,4,2,5]:
  options.layout==='compound'?[5,2,3,0,4,1]:[0,3,2,5,1,4];
 const cover:Site['cover']=choices.slice(0,count).map((index,i)=>({
  id:'kh-target-'+(i+1),x:targets[index].x,y:targets[index].y,
  w:20,h:30,low:false,
  fixture:trial?.noShootSlots.includes(i)?'target-no-shoot':'target-plate'
 }));
 // Additional low obstacles live away from openings and the hallway.
 cover.push(
  {id:'kh-bench-1',x:225,y:235,w:45,h:18,low:true,fixture:'shooting-bench'},
  {id:'kh-bench-2',x:465,y:475,w:42,h:18,low:true,fixture:'shooting-bench'});
 if(options.layout==='branch'||options.layout==='compound')
  cover.push({id:'kh-box',x:340,y:278,w:24,h:22,low:true,fixture:'tool-workbench'});
 return {
  training:true,programLocked:true,seed:101_000+
    (['linear','branch','hall','compound'].indexOf(options.layout)*100)+count*10+
    (options.doors==='open'?1:options.doors==='mixed'?2:0),
  name:(trial?'TRIAL · ':'KILLHOUSE · ')+TRAINING_LAYOUT_LABELS[options.layout],
  ...(trial?{trainingTrial:{id:trial.id,version:1 as const}}:{}),
  archetype:'warehouse',scale:'small',
  layout:'corridor',condition:'occupied',conditionLevel:0,
  scenarioStyle:'routine',roomCount:rooms.length,rooms,walls,doors,cover,
  bounds:{minX:0,minY:0,maxX:680,maxY:720},
  entrance:p(342,600),spawn:[p(293,655),p(319,658),p(346,658),p(374,655)],
  enemies:[],enemyHeadings:[],objective:p(340,130),extract:p(340,660)
 };
}
