/** D3.9C: OFFLINE-only five-second evidence; not used by game/RAF.
 * A long map journey is not a stall. Lateral rerouting or stepping away
 * from a goal is not a failure when the body is actually advancing.
 */
export type CWindow={
 active:boolean;kind:string|null;goalReduction:number|null;
 travel:number;net:number;blockedSeconds:number;squeezeSeconds:number;
 passageSeconds:number;openingSeconds:number;
 orderIssue:string|null;attempts:number;badWindows:number
};
export type CWindowResult={
 status:'arrived-or-complete'|'authored-hold'|'waiting-for-passage'|
 'opening-door'|'physical-obstruction'|'movement-loop'|
 'sustained-still'|'moving-goalward'|'moving-detour'|'repositioning';
 suspicious:boolean;consecutivePoorWindows:number
};
export function classifyCProgressWindow(w:CWindow):CWindowResult{
 const done=(status:CWindowResult['status'],suspicious=false,
  count=0):CWindowResult=>({status,suspicious,consecutivePoorWindows:count});
 if(!w.active)return done('arrived-or-complete');
 if(['wait','watch','sync','stack','holdClear'].includes(w.kind??''))
  return done('authored-hold');
 if(w.passageSeconds>=3)return done('waiting-for-passage');
 if(w.openingSeconds>=3)return done('opening-door');
 if(w.orderIssue||w.blockedSeconds>=3)
  return done('physical-obstruction',true,w.badWindows+1);
 // 5s window: walking 20+ units only to stay within 9 units of the
 // starting spot is stronger evidence of looping than distance-to-goal.
 // A long physical detour can temporarily go AWAY from the objective.
 const loop=w.travel>=24&&w.net<=9&&
   (w.goalReduction===null||w.goalReduction<=9);
 const still=w.travel<5&&w.net<4;
 const poor=loop||still;
 const count=poor?w.badWindows+1:0;
 // Require 2 consecutive poor windows before reporting a systemic loop.
 if(loop)return done('movement-loop',count>=2,count);
 if(still)return done('sustained-still',count>=2,count);
 if(w.goalReduction!==null&&w.goalReduction>=8)
  return done('moving-goalward');
 if(w.net>=10)return done('moving-detour');
 return done('repositioning');
}
