/**
 * Build 017 — a continuous north-to-south valley, not disconnected
 * procedural basins. World -Z = north; +Z = south. Height in metres.
 *
 * The visible 10 m slab is a physical watershed test section, NOT a
 * 1:1 representation of all 180 km of Verdigris.
 * Channel beds and floodplain shapes are authored by repeatable geometric
 * processes (generation-time incision and sediment flattening).
 */
export const WORLD_SIZE = 10;
export const WORLD_HALF = WORLD_SIZE / 2;
export const GRID_CELLS = 32;
export const CELL_SIZE = WORLD_SIZE / GRID_CELLS;
export const CELL_AREA = CELL_SIZE * CELL_SIZE;
export const SUBSTRATE_BOTTOM = -0.8;
const clamp=(v:number,min=0,max=1)=>Math.max(min,Math.min(max,v));
const smooth=(v:number)=>{const t=clamp(v);return t*t*(3-2*t);};

/** Main course always runs north to south, gently wandering within valley. */
export function valleyAxisX(z:number):number{
  return .33*Math.sin(z*.48)+.16*Math.sin(z*.92+.6);
}
export type ChannelProfile={centerX:number;widthM:number;incisionM:number};
/** Tributary centerlines converge with the main river, no disjoint ponds. */
export function tributaryAt(z:number,side:'west'|'east'):ChannelProfile|null{
  if(side==='west'){
    const t=(z+3.7)/4.85;
    if(t<0||t>1)return null;
    return {centerX:-4.6+4.6*smooth(t),widthM:.32,incisionM:.063};
  }
  const t=(z+1.85)/4.65;
  if(t<0||t>1)return null;
  return {centerX:4.55-4.55*smooth(t),widthM:.34,incisionM:.055};
}
export function localChannelProximity(x:number,z:number):number{
  const axis=Math.abs(x-valleyAxisX(z));
  let factor=Math.exp(-Math.pow(axis/.48,2));
  for(const side of ['west','east'] as const){
    const arm=tributaryAt(z,side);
    if(!arm)continue;
    // Taper gully at its upstream head and widen before confluence.
    const t=side==='west'?(z+3.7)/4.85:(z+1.85)/4.65;
    const fade=smooth(t*6)*smooth((1-t)*8);
    factor=Math.max(factor,Math.exp(-Math.pow((x-arm.centerX)/arm.widthM,2))*fade);
  }
  return clamp(factor);
}
export function terrainHeight(x:number,z:number):number {
  const axis=valleyAxisX(z);
  const distance=Math.abs(x-axis);
  const northToSouth=(z+WORLD_HALF)/WORLD_SIZE;
  // A clear longitudinal fall connects the headwater inlet to the outlet.
  const floor=.20-.40*northToSouth;
  // Broad gently rounded bottom with pronounced flanks and ridges.
  const flank=.30*Math.pow(distance/5.2,1.65);
  const highSlope=smooth((distance-1.25)/3.4);
  const undulation=(.027*Math.sin(z*.95+x*.56)+.018*Math.cos(x*1.44-z*.73))
    *highSlope;
  // Floodplain deposition flattens the immediate valley floor.
  const floodplain=.018*smooth((distance-.72)/1.2);
  const mainIncision=.082*Math.exp(-Math.pow(distance/.46,2));
  let tributaryIncision=0;
  for(const side of ['west','east'] as const){
    const arm=tributaryAt(z,side);
    if(!arm)continue;
    const t=side==='west'?(z+3.7)/4.85:(z+1.85)/4.65;
    tributaryIncision=Math.max(tributaryIncision,
      arm.incisionM*Math.exp(-Math.pow((x-arm.centerX)/arm.widthM,2))
      *smooth(t*6)*smooth((1-t)*8));
  }
  // Small isolated depressions persist at the base of some side slopes.
  // They retain stormwater locally before spilling toward tributary gullies;
  // the major drainage remains the connected southward river corridor.
  const sidePond1=.21*Math.exp(
    -Math.pow((x+2.85)/.99,2)-Math.pow((z+.93)/.92,2));
  const sidePond2=.19*Math.exp(
    -Math.pow((x-2.45)/.94,2)-Math.pow((z-1.15)/.96,2));
  return floor+flank+undulation+floodplain
    -Math.max(mainIncision,tributaryIncision)-sidePond1-sidePond2;
}

export type TerrainCell={
  index:number;x:number;z:number;height:number;
  neighbors:readonly number[];
};
export function makeTerrainCells():TerrainCell[]{
  const cells:TerrainCell[]=[];
  for(let row=0;row<GRID_CELLS;row++) for(let col=0;col<GRID_CELLS;col++){
    const index=row*GRID_CELLS+col;
    const x=-WORLD_HALF+(col+.5)*CELL_SIZE;
    const z=-WORLD_HALF+(row+.5)*CELL_SIZE;
    const neighbors:number[]=[];
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
      if(dr===0&&dc===0)continue;
      const r=row+dr,c=col+dc;
      if(r>=0&&r<GRID_CELLS&&c>=0&&c<GRID_CELLS)
        neighbors.push(r*GRID_CELLS+c);
    }
    cells.push({index,x,z,height:terrainHeight(x,z),neighbors});
  }
  return cells;
}
export function isEdgeCell(index:number):boolean{
  const row=Math.floor(index/GRID_CELLS),col=index%GRID_CELLS;
  return row===0||col===0||row===GRID_CELLS-1||col===GRID_CELLS-1;
}
export function cellIndexAt(x:number,z:number):number{
  const col=Math.max(0,Math.min(GRID_CELLS-1,Math.floor((x+WORLD_HALF)/CELL_SIZE)));
  const row=Math.max(0,Math.min(GRID_CELLS-1,Math.floor((z+WORLD_HALF)/CELL_SIZE)));
  return row*GRID_CELLS+col;
}
