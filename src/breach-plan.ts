/** 053: Player-authored instructions are not generated navigation vertices. */
export type Pt={x:number;y:number};
export type PlanKind='recover-medical'|'evacuate'|'treat'|'move'|'door'|'wait'|'holdClear'|'look'|'sync'|'pie'|'reload'|'flash'|'interact';
export type MoveMode='advance'|'strafe'|'sprint';
export type FirePolicy='engage'|'hold'|'return'|'focus'|'suppress';
/** Persistent world-facing instruction, independent of any movement route. */
export type AimMode='free'|'fixed'|'track';
export type AimInstruction={mode:AimMode;angle?:number;point?:Pt};
export type PieSide='cw'|'ccw';
export type DoorMethod='open'|'close'|'kick'|'hold';
export type PlanNode={
  id:number;kind:PlanKind;p:Pt;facing?:number;doorId?:string;
  objectId?:string;interaction?:'push'|'open-window'|'close-window';
  method?:DoorMethod;duration?:number;syncCode?:string;holdOnContact?:boolean;
  postureState?:'stand'|'crouch';paceState?:'walk'|'run';
  moveMode?:MoveMode;pivot?:Pt;pieSide?:PieSide;pieDegrees?:number;arc?:Pt[];
  aimMode?:AimMode;aimPoint?:Pt;aimLabel?:'look'|'strafe'|'pie';
  patientId?:string;woundId?:number;
  transportMode?:'drag'|'carry';
  stackDoorId?:string;
  firePolicyState?:FirePolicy;firePoint?:Pt;fireTargetId?:string;
};
export type PlanHistory={undo:PlanNode[][];redo:PlanNode[][]};
export const copyNodes=(nodes:PlanNode[]):PlanNode[]=>
  nodes.map(n=>({...n,p:{...n.p},
    pivot:n.pivot?{...n.pivot}:undefined,
    aimPoint:n.aimPoint?{...n.aimPoint}:undefined,
    firePoint:n.firePoint?{...n.firePoint}:undefined,
    arc:n.arc?.map(p=>({...p}))}));
export const makeHistory=():PlanHistory=>({undo:[],redo:[]});
export function record(history:PlanHistory,prior:PlanNode[]){
  history.undo.push(copyNodes(prior));
  if(history.undo.length>40)history.undo.shift();
  history.redo=[];
}
export function undo(history:PlanHistory,current:PlanNode[]):PlanNode[]|null{
  const before=history.undo.pop();if(!before)return null;
  history.redo.push(copyNodes(current));return before;
}
export function redo(history:PlanHistory,current:PlanNode[]):PlanNode[]|null{
  const after=history.redo.pop();if(!after)return null;
  history.undo.push(copyNodes(current));return after;
}
export const lastPoint=(origin:Pt,nodes:PlanNode[]):Pt=>
  nodes.length?{...nodes[nodes.length-1].p}:{...origin};
export function modifyNode(nodes:PlanNode[],id:number,patch:Partial<PlanNode>){
  const node=nodes.find(n=>n.id===id);
  if(!node)return false;
  if(patch.p)node.p={...patch.p};
  for(const prop of ['facing','kind','doorId','method','duration','syncCode','holdOnContact','moveMode','postureState','paceState','pieSide','aimMode','aimLabel',
    'firePolicyState','fireTargetId','objectId','interaction'] as const){
    const val=patch[prop];
    if(val!==undefined){
      // Values have different property types; assign to the matching key.
      Object.assign(node,{[prop]:val});
    }
  }
  return true;
}
export const targetAngle=(a:Pt,b:Pt)=>Math.atan2(b.y-a.y,b.x-a.x);
export const length=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export const angleDifference=(a:number,b:number)=>
  Math.atan2(Math.sin(b-a),Math.cos(b-a));
