import { GRID_CELLS,CELL_SIZE,WORLD_HALF,terrainHeight } from './terrain-model.ts';
import { type TerrainWater } from './hydrology.ts';
import { clipWaterTriangle, type WaterVertex } from './water-surface-geometry.ts';

/** Standing-water surfaces use a *basin-wide* constant elevation. Their
 * shorelines are clipped to each original terrain triangle rather than a
 * colored 32x32 water tile. No water is created by this mesh builder.
 */
export function buildPondMeshes(water:TerrainWater):{
  position:number[];color:number[];normal:number[];triangles:number;
}{
  const position:number[]=[],color:number[]=[],normal:number[]=[];
  let triangles=0;
  const emit=(a:WaterVertex,b:WaterVertex,c:WaterVertex)=>{
    for(const tri of clipWaterTriangle(a,b,c)){
      // orient toward +Y regardless of sampled basin boundary winding
      const cross=(tri[1].x-tri[0].x)*(tri[2].z-tri[0].z)-
        (tri[1].z-tri[0].z)*(tri[2].x-tri[0].x);
      const pts=cross<0?tri:[tri[0],tri[2],tri[1]];
      triangles++;
      for(const v of pts){
        const depth=Math.max(0,v.waterY-v.groundY);
        const t=Math.min(1,depth/.09);
        position.push(v.x,v.waterY+.009,v.z);
        color.push(.34-.17*t,.54-.16*t,.55-.11*t,
          .72*Math.min(1,depth/.025));
        normal.push(0,1,0);
      }
    }
  };
  const p=(x:number,z:number,y:number):WaterVertex=>({
    x,z,groundY:terrainHeight(x,z),waterY:y,coverage:1,
  });
  for(const basin of water.watershed.basins){
    const level=water.surfaceLevel(basin.id);
    if(level===null)continue;
    for(const index of basin.cellIndexes){
      const cell=water.watershed.cells[index];
      if(cell.height>=level)continue;
      const row=Math.floor(index/GRID_CELLS),col=index%GRID_CELLS;
      const x=-WORLD_HALF+col*CELL_SIZE,z=-WORLD_HALF+row*CELL_SIZE;
      const tl=p(x,z,level),tr=p(x+CELL_SIZE,z,level);
      const br=p(x+CELL_SIZE,z+CELL_SIZE,level),bl=p(x,z+CELL_SIZE,level);
      const center=p(cell.x,cell.z,level);
      emit(tl,center,tr);emit(tr,center,br);
      emit(br,center,bl);emit(bl,center,tl);
    }
  }
  return {position,color,normal,triangles};
}

/** Fixed, saved-style volume fixture makes a genuine level pond for
 * screenshot audits; the actual gameplay solver controls the basin level.
 */
export function makeReferencePond(watershedWater:TerrainWater):TerrainWater{
  const basins=watershedWater.watershed.basins;
  const available=basins.filter(b=>b.capacityLiters>2)
    .sort((a,b)=>b.capacityLiters-a.capacityLiters);
  if(!available.length)return watershedWater;
  const basin=available[0],litres=basin.capacityLiters*.63;
  return new (watershedWater.constructor as typeof TerrainWater)(
    watershedWater.watershed,{
      basins:[{sinkIndex:basin.sinkIndex,litres}],
      totalDepositedLiters:litres,
    });
}
