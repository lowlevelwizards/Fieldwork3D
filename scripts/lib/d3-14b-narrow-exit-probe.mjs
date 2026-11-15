/** D3.14B offline-only, bounded 4-unit oriented squeeze escape graph.
 * An observed legal narrow step is NOT permission to teleport, rotate
 * through furniture, cross a door or end the player-authored MOVE.
 * Explore the same physical profile used by production, then report
 * whether a complete first join back to the EXISTING disposable route
 * is possible. No actor writes, no world state, no per-tick execution.
 */
export function observeNarrowLeafExit(from,goal,next,canNarrow,canFull,{
 maxNodes=240,maxDepth=12,step=4,maxRadius=52
}={}){
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const startGoal=dist(from,goal),startNext=dist(from,next);
 const angles=Array.from({length:16},(_,i)=>i*Math.PI/8);
 const queue=[{p:{...from},path:[]}],visited=new Set();
 const key=p=>Math.round(p.x/2)+':'+Math.round(p.y/2);
 visited.add(key(from));
 let expansions=0,attempts=0,swept=0,bestGoal=startGoal,bestNext=startNext;
 let bestPath=[],joined=null;
 // Deterministic breadth-first exploration; one request per offline run.
 for(let q=0;q<queue.length&&expansions<maxNodes;q++){
  const state=queue[q];
  const dg=dist(state.p,goal),dn=dist(state.p,next);
  if(dg<bestGoal){bestGoal=dg;bestPath=state.path;}
  if(dn<bestNext)bestNext=dn;
  if(state.path.length>=2&&dn<56&&
     (canFull(state.p,next)||canNarrow(state.p,next))){
   joined={stage:state.path,next:{...next},
    joinProfile:canFull(state.p,next)?'full':'squeeze',
    stageLength:state.path.reduce((acc,node,i)=>acc+
      dist(i?state.path[i-1]:from,node),0)};
   break;
  }
  if(state.path.length>=maxDepth)continue;
  expansions++;
  for(let i=0;i<16;i++){
   const p={x:state.p.x+Math.cos(angles[i])*step,
    y:state.p.y+Math.sin(angles[i])*step};
   if(dist(p,from)>maxRadius)continue;
   const k=key(p);
   if(visited.has(k))continue;
   attempts++;
   if(!canNarrow(state.p,p))continue;
   swept++;
   visited.add(k);
   queue.push({p,path:[...state.path,p]});
  }
 }
 return {startGoal,startNext,expansions,attempts,swept,
  candidates:queue.length,bestGoal,bestNext,bestPath,
  joined,exhausted:expansions>=maxNodes};
}
