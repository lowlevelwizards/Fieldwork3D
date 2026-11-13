/** A3.0 isolated fixtures. No Breach production module imports this file. */
import type {Site} from './breach-site.ts';
import type {Pt,Door,Segment,Obstacle} from './breach-core.ts';
import {newSession,team,enemies,planMove,type Session} from './breach-game.ts';
export type A3Scene='clear'|'rear-stack'|'offset-left'|'offset-right'|
 'mixed-crouch'|'crossing'|'doorway'|'furniture';
export type A3Intent='hold'|'look'|'watch'|'engage';
export type A3Weapon='carbine'|'rifle'|'smg'|'shotgun';
export type A3Config={scenario:A3Scene;seed:number;operators:1|2|3|4;
 posture:'stand'|'crouch';intent:A3Intent;weapon:A3Weapon};
export const A3_SCENES:readonly {id:A3Scene;label:string;note:string}[]=[
 {id:'clear',label:'Unobstructed sight',note:'One clear front lane'},
 {id:'rear-stack',label:'Centered rear stack',note:'Friendly between muzzle and target'},
 {id:'offset-left',label:'Staggered left',note:'Friendly slightly above the firing ray'},
 {id:'offset-right',label:'Staggered right',note:'Friendly slightly below the firing ray'},
 {id:'mixed-crouch',label:'Mixed-height stack',note:'Current planar guard despite teammate crouching'},
 {id:'crossing',label:'Moving teammate',note:'Actual session tick and motor movement'},
 {id:'doorway',label:'Doorframe obstruction',note:'Real hinged leaf and wall clearance'},
 {id:'furniture',label:'Furniture obstruction',note:'Height-aware actual cover test'}
];
export const DEFAULT_A3_CONFIG:A3Config={
 scenario:'rear-stack',seed:31063,operators:4,posture:'stand',
 intent:'watch',weapon:'carbine'
};
const p=(x:number,y:number):Pt=>({x,y});
export function a3Fixture(config:A3Config):Site{
 const scene=config.scenario;
 const positions:[Pt,Pt,Pt,Pt]=[p(145,223),p(186,223),
   p(183,251),p(151,258)];
 if(scene==='clear'){positions[1]=p(190,310);}
 if(scene==='offset-left')positions[1]=p(187,209);
 if(scene==='offset-right')positions[1]=p(187,241);
 if(scene==='mixed-crouch')positions[1]=p(187,223);
 if(scene==='crossing')positions[1]=p(187,260);
 if(scene==='doorway')positions[1]=p(175,288);
 if(scene==='furniture')positions[1]=p(177,286);
 const walls:Segment[]=scene==='doorway'?[
  {a:p(270,40),b:p(270,185)},{a:p(270,255),b:p(270,415)}
 ]:[];
 const doors:Door[]=scene==='doorway'?[{
  id:'TEST',a:p(270,185),b:p(270,255),open:false,
  openedAt:-1,kind:'hinged',hinge:'a',swing:1,style:'wood'
 }]:[];
 const cover:Obstacle[]=scene==='furniture'?
  [{x:259,y:224,w:29,h:47,fixture:'counter',low:false}]:[];
 return {
  seed:config.seed,name:'A3 PHYSICALITY '+scene,layout:'open',
  training:false,rooms:[],roomCount:0,walls,doors,cover,windows:[],
  entrance:p(90,223),spawn:positions,enemies:[p(390,223)],
  enemyHeadings:[Math.PI],objective:p(425,223),extract:p(80,350),
  bounds:{minX:20,minY:20,maxX:490,maxY:440}
 };
}
/** Entirely isolated game session. Real Breach actors/motor/fire safety,
 * not the old Physicality Lab's approximate traffic solver. */
export function createA3Session(config:A3Config):Session{
 const session=newSession(0,config.seed,'full-view','standard','hold',
  a3Fixture(config),{enableCivilians:false});
 const blues=team(session),red=enemies(session)[0];
 for(let i=0;i<blues.length;i++){
  const a=blues[i];
  if(i>=config.operators){a.health=0;continue;}
  a.heading=0;a.weaponYaw=0;a.velocity=0;a.pace='walk';
  a.posture=i===1&&config.scenario==='mixed-crouch'?
   'crouch':config.posture;
  a.firePolicy='hold';a.aim=config.intent==='engage'?1:0;
  a.weapon=config.weapon;a.weaponConfiguration=undefined;
  a.aimInstruction=config.intent==='watch'||config.intent==='look'?
   {mode:'fixed',angle:0}:null;
  a.nav=[];a.plan=[];a.targetId=null;
  a.priorP={...a.p};
 }
 if(red){
  red.magazine=0;red.reserve=0;red.aim=0;
  red.heading=Math.PI;red.weaponYaw=Math.PI;
  red.encounterReactionUntil=Infinity;
 }
 // Simulated movement is enabled only for the explicitly moving fixture.
 // No automatic AI-generated plan is needed to reconstruct a static stack.
 if(config.scenario==='crossing'&&config.operators>=2){
  const mover=blues[1];
  planMove(session,mover.id,p(187,178));
 }
 session.phase='running';session.started=true;
 return session;
}
