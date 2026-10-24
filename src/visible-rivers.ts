import { extractChannelChains } from './drainage-visual-model.ts';

/**
 * The downhill graph contains individual sheet-runoff connections, not
 * necessarily streams. LLW's short-weak-stub principle adapted to the live
 * 32x32 water ledger: remove weak branches visually only, never reroute flow.
 */
export function selectVisibleRiverLinks(
  downhill:readonly number[],active:readonly boolean[],
  catchment:readonly number[],gridSize:number,
  pondAdjacent:readonly boolean[]=[],
):boolean[]{
  if(downhill.length!==active.length||active.length!==catchment.length)
    throw new Error('Mismatched channel arrays');
  const keep=Array.from(active);
  for(let pass=0;pass<3;pass++){
    let changed=false;
    for(const chain of extractChannelChains(downhill,keep,catchment)){
      const first=chain[0],last=chain[chain.length-1];
      const length=chain.length-1;
      const maxCatchment=Math.max(...chain.slice(0,-1).map(i=>catchment[i]));
      const fromBoundary=first<gridSize||first>=gridSize*(gridSize-1)||
        first%gridSize===0||first%gridSize===gridSize-1;
      const joinsPond=chain.some(i=>pondAdjacent[i]);
      // A full river inlet, a substantial tributary or a pond mouth stays.
      // Tiny single-cell runoff teeth become soil moisture/gullies instead.
      if(length>=3||maxCatchment>=30||fromBoundary||joinsPond)continue;
      for(const i of chain.slice(0,-1)){
        if(keep[i]){keep[i]=false;changed=true;}
      }
    }
    if(!changed)break;
  }
  return keep;
}
