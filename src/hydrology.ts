/**
 * Ground Zero Builds 009 / 010: terrain-directed catchments, pond levels,
 * and volume-conserving overflow. Adapted in principle from LLW browser's
 * downhill/catchment/minimax-escape/volume-at-level approach.
 *
 * Unlike LLW's one-shot normalized runoff, this is incremental litres.
 * Atoms 011-014 add per-cell soil storage, rate-limited infiltration,
 * real evaporation, wind, and surface material differences.
 * No groundwater movement or fluid momentum.
 */
import {
  CELL_AREA, cellIndexAt, isEdgeCell,
  makeTerrainCells, type TerrainCell,
} from './terrain-model.ts';
import { CLOUD_COUNT, cloudAt, cloudCoverAtHour, cloudPresence } from './cloud-model.ts';
import { rainIntensityAtHour } from './rain-model.ts';
import { wrapHour } from './environment-conditions.ts';
import { evaporationMmPerHour } from './evaporation-model.ts';
import {
  infiltrationBudgetLiters, soilCapacityLiters, surfaceAt,
} from './surface-materials.ts';

export const PEAK_RAIN_MM_PER_HOUR = 28;
const EPS = 1e-8;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export type DrainageBasin = {
  id: number;
  sinkIndex: number;
  cellIndexes: number[];
  spillLevel: number;
  outletId: number; // -1 = outside the region
  capacityLiters: number;
  routeDepth: number;
};

export type Watershed = {
  cells: TerrainCell[];
  downhill: number[];
  cellBasin: number[];
  basins: DrainageBasin[];
  // Upslope contributing area measured in terrain cells (including self).
  flowAccumulation: number[];
  // Geographically derived channels; not hand-painted water overlays.
  channels: boolean[];
};

function addEdge(graph: Map<number, Map<number, number>>, a: number, b: number, saddle: number) {
  if (a === b) return;
  const edges = graph.get(a) ?? new Map<number, number>();
  const old = edges.get(b);
  if (old === undefined || saddle < old) edges.set(b, saddle);
  graph.set(a, edges);
}

/**
 * Find a strictly downhill route to a sink; border sinks drain OUTSIDE.
 * At a basin boundary the lowest saddle determines its eventual overflow.
 */
export function buildWatershed(cells: TerrainCell[] = makeTerrainCells()): Watershed {
  const count = cells.length;
  const downhill = Array<number>(count).fill(-1);
  for (const cell of cells) {
    let best = -1;
    let lowest = cell.height;
    for (const index of cell.neighbors) {
      const neighbor = cells[index];
      if (neighbor.height < lowest - EPS ||
        (neighbor.height < cell.height - EPS &&
         Math.abs(neighbor.height - lowest) <= EPS && (best < 0 || index < best))) {
        best = index;
        lowest = neighbor.height;
      }
    }
    downhill[cell.index] = best;
  }

  const sinks = cells.filter(c => downhill[c.index] < 0 && !isEdgeCell(c.index));
  const basinBySink = new Map(sinks.map((s,i)=>[s.index,i]));
  const cellBasin = Array<number>(count).fill(-2);
  const follow = (start: number): number => {
    if (cellBasin[start] !== -2) return cellBasin[start];
    const path: number[] = [];
    let at=start;
    while (cellBasin[at] === -2 && downhill[at] >= 0) {
      path.push(at);
      at=downhill[at];
    }
    const basin = cellBasin[at] === -2
      ? (basinBySink.get(at) ?? -1)
      : cellBasin[at];
    cellBasin[at]=basin;
    for (const index of path) cellBasin[index]=basin;
    return basin;
  };
  for(let index=0;index<count;index++)follow(index);

  const basins: DrainageBasin[] = sinks.map((sink,id)=>({
    id, sinkIndex:sink.index, cellIndexes:[], spillLevel:Infinity,
    outletId:-1, capacityLiters:0, routeDepth:0,
  }));
  for(const cell of cells){
    const id=cellBasin[cell.index];
    if(id>=0)basins[id].cellIndexes.push(cell.index);
  }

  // Catchment boundary graph: minimum saddle for each pair of drainage areas.
  // Outside (-1) is a real boundary drain, never an artificial lake.
  const adjacency = new Map<number, Map<number, number>>();
  for(const cell of cells){
    const basin=cellBasin[cell.index];
    if(isEdgeCell(cell.index) && basin>=0) {
      addEdge(adjacency,basin,-1,cell.height);
      addEdge(adjacency,-1,basin,cell.height);
    }
    for(const neighborIndex of cell.neighbors){
      const other=cellBasin[neighborIndex];
      if(basin===other)continue;
      const saddle=Math.max(cell.height,cells[neighborIndex].height);
      addEdge(adjacency,basin,other,saddle);
      addEdge(adjacency,other,basin,saddle);
    }
  }

  // Minimax escape search from the outside. The cost of a path is its
  // highest saddle, rather than the sum of elevations.
  const distance = Array<number>(basins.length).fill(Infinity);
  const parent = Array<number>(basins.length).fill(-1);
  const visited = Array<boolean>(basins.length).fill(false);
  for(const [id,saddle] of adjacency.get(-1) ?? []){
    if(id<0)continue;
    distance[id]=saddle;
    parent[id]=-1;
  }
  for(let step=0;step<basins.length;step++){
    let current=-1;
    for(let i=0;i<basins.length;i++){
      if(visited[i])continue;
      if(current<0 || distance[i]<distance[current]-EPS ||
        (Math.abs(distance[i]-distance[current])<=EPS && i<current)){
        current=i;
      }
    }
    if(current<0 || !Number.isFinite(distance[current]))break;
    visited[current]=true;
    for(const [next,saddle] of adjacency.get(current) ?? []){
      if(next<0 || visited[next])continue;
      const candidate=Math.max(distance[current],saddle);
      if(candidate < distance[next]-EPS){
        distance[next]=candidate;
        parent[next]=current;
      }
    }
  }

  for(const basin of basins){
    // Terrain borders ALWAYS provide an escape path.
    basin.spillLevel=Number.isFinite(distance[basin.id])
      ? Math.max(cells[basin.sinkIndex].height,distance[basin.id])
      : cells[basin.sinkIndex].height;
    basin.outletId=parent[basin.id];
    basin.capacityLiters=basin.cellIndexes.reduce((sum,index)=>
      sum + Math.max(0,basin.spillLevel-cells[index].height)*CELL_AREA*1000,0);
    const seen=new Set<number>();
    let downstream=basin.outletId;
    while(downstream>=0){
      if(seen.has(downstream))throw Error('Water routing cycle');
      seen.add(downstream);
      downstream=parent[downstream];
    }
    basin.routeDepth=seen.size;
  }
  // Accumulate each cell's entire upstream catchment along strictly
  // descending links. Highest terrain must contribute first.
  const flowAccumulation=Array<number>(cells.length).fill(1);
  const upstreamFirst=[...cells].sort((a,b)=>b.height-a.height||a.index-b.index);
  for(const cell of upstreamFirst){
    const next=downhill[cell.index];
    if(next>=0)flowAccumulation[next]+=flowAccumulation[cell.index];
  }
  const channels=cells.map((_,i)=>{
    // A measured contributing catchment distinguishes concentrated
    // stream channels from diffuse wet ground. Incised tributaries may
    // carry less flow until their upstream watershed grows.
    return flowAccumulation[i]>=7;
  });
  return {cells,downhill,cellBasin,basins,flowAccumulation,channels};
}

/** At a single level, connected basin cells below it can contain this volume. */
export function volumeAtLevel(
  watershed: Watershed, basin: DrainageBasin, surface: number,
): number {
  let sum=0;
  for(const index of basin.cellIndexes){
    sum+=Math.max(0,surface-watershed.cells[index].height)*CELL_AREA*1000;
  }
  return sum;
}

export function solveWaterLevel(
  watershed: Watershed, basin: DrainageBasin, litres: number,
): number | null {
  if (litres <= EPS || basin.capacityLiters <= EPS) return null;
  const floor=watershed.cells[basin.sinkIndex].height;
  if (litres>=basin.capacityLiters-EPS) return basin.spillLevel;
  let lower=floor,upper=basin.spillLevel;
  for(let i=0;i<27;i++){
    const middle=(lower+upper)*.5;
    if(volumeAtLevel(watershed,basin,middle)<litres)lower=middle;
    else upper=middle;
  }
  return (lower+upper)*.5;
}

type ActiveCloud = { x:number;z:number;rx:number;rz:number;presence:number };
function visibleClouds(hour:number,cover:number): ActiveCloud[] {
  const clouds: ActiveCloud[]=[];
  for(let index=0;index<CLOUD_COUNT;index++){
    const cloud=cloudAt(index,hour);
    const presence=cloudPresence(cover,cloud.rank);
    if(presence<=.0001)continue;
    // Same local rainfall footprint used by Build 007, no made-up basins.
    clouds.push({
      x:cloud.x,z:cloud.z,rx:2*cloud.scale,rz:1.65*cloud.scale,presence,
    });
  }
  return clouds;
}
function cloudExposure(cell:TerrainCell, clouds:ActiveCloud[]):number {
  let exposure=0;
  for(const c of clouds){
    const dx=(cell.x-c.x)/c.rx;
    const dz=(cell.z-c.z)/c.rz;
    const distance=dx*dx+dz*dz;
    if(distance<1)exposure+=(1-distance)*c.presence;
  }
  return clamp01(exposure);
}

export type WaterState = {
  basins:{sinkIndex:number;litres:number}[];
  exportedLiters:number;
  totalDepositedLiters:number;
  soilLiters?:number[];
  evaporatedLiters?:number;
  // 018-020: moving overland/stream water, temporary inundation,
  // and explicit external headwater supply from the north.
  runoffLiters?:number[];
  floodLiters?:number[];
  importedLiters?:number;
};

const RIVER_HEADWATER_LITRES_PER_HOUR=16;
const CHANNEL_BANKFULL_DEPTH_M=.066;
const CHANNEL_AREA_FRACTION=.55;

/**
 * One 32×32 local watershed. Sources: rain on each actual physical cell
 * plus explicitly metered north-boundary headwater inflow.
 *
 * Water has a residence time in each cell and moves along strictly
 * descending routes; downstream discharge responds after a genuine delay.
 * Runoff exceeds channel capacity into a temporary flood reservoir, then
 * drains toward the outlet. All transfers are conserved in litres.
 */
export class TerrainWater {
  readonly watershed:Watershed;
  private readonly water:number[];
  private readonly runoff:number[];
  private readonly flood:number[];
  private exported=0;
  private deposited=0;
  private imported=0;
  private evaporated=0;
  private readonly soil:number[];
  private readonly soilCaps:number[];
  private readonly northInletIndex:number;

  constructor(watershed:Watershed=buildWatershed(),saved?:unknown){
    this.watershed=watershed;
    this.water=watershed.basins.map(()=>0);
    this.runoff=watershed.cells.map(()=>0);
    this.flood=watershed.cells.map(()=>0);
    this.soil=watershed.cells.map(()=>0);
    this.soilCaps=watershed.cells.map(c=>soilCapacityLiters(c.x,c.z));
    // Upstream watershed lies north of this test section. We introduce
    // metered water at its northern channel entrance, not magical rivers.
    const north=watershed.cells.filter(c=>c.index<32);
    this.northInletIndex=north.reduce((best,c)=>
      c.height<best.height?c:best,north[0]).index;
    if(saved && typeof saved==='object'){
      const record=saved as Partial<WaterState>;
      const valid=(n:unknown):n is number=>
        typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<1e10;
      if(Array.isArray(record.basins)){
        const bySink=new Map(watershed.basins.map(b=>[b.sinkIndex,b.id]));
        for(const entry of record.basins){
          if(!entry||!Number.isInteger(entry.sinkIndex)||!valid(entry.litres))continue;
          const cell=entry.sinkIndex;
          if(cell<0||cell>=this.runoff.length)continue;
          const target=bySink.get(cell);
          // If a previous depression no longer exists after sculpting
          // the valley, preserve its old water as mobile surface water.
          if(target!==undefined)this.water[target]+=entry.litres;
          else this.runoff[cell]+=entry.litres;
        }
      }
      if(Array.isArray(record.runoffLiters)&&record.runoffLiters.length===this.runoff.length){
        for(let i=0;i<this.runoff.length;i++){
          if(valid(record.runoffLiters[i]))this.runoff[i]+=record.runoffLiters[i];
        }
      }
      if(Array.isArray(record.floodLiters)&&record.floodLiters.length===this.flood.length){
        for(let i=0;i<this.flood.length;i++){
          if(valid(record.floodLiters[i]))this.flood[i]=record.floodLiters[i];
        }
      }
      if(Array.isArray(record.soilLiters)&&record.soilLiters.length===this.soil.length){
        for(let i=0;i<this.soil.length;i++){
          const litres=record.soilLiters[i];
          if(!valid(litres))continue;
          this.soil[i]=Math.min(litres,this.soilCaps[i]);
          // After a terrain/material remap, excess soil water enters the
          // overland reservoir; no silent mass deletion.
          this.runoff[i]+=Math.max(0,litres-this.soilCaps[i]);
        }
      }
      if(valid(record.exportedLiters))this.exported=record.exportedLiters;
      if(valid(record.totalDepositedLiters))this.deposited=record.totalDepositedLiters;
      if(valid(record.evaporatedLiters))this.evaporated=record.evaporatedLiters;
      if(valid(record.importedLiters))this.imported=record.importedLiters;
      this.routeOverflow();
    }
  }

  migrateLegacy(volumes:unknown):void{
    if(!Array.isArray(volumes)||volumes.length!==9)return;
    const positions=[
      [-3.22,-2.40],[-.94,-3.25],[2.48,-2.20],[3.15,.65],
      [.52,1.85],[-3.10,2.36],[1.13,3.42],[-.62,-.10],[-1.72,1.13],
    ];
    for(let i=0;i<positions.length;i++){
      const litres=volumes[i];
      if(typeof litres!=='number'||!Number.isFinite(litres)||litres<=0)continue;
      const index=cellIndexAt(positions[i][0],positions[i][1]);
      this.runoff[index]+=litres;
      this.deposited+=litres;
    }
  }

  private routeOverflow():void{
    for(const b of [...this.watershed.basins].sort((a,c)=>c.routeDepth-a.routeDepth)){
      const excess=Math.max(0,this.water[b.id]-b.capacityLiters);
      // Saved basins must round-trip bit-for-bit when only tiny floating
      // residuals exceed the measured spill capacity.
      if(excess<=EPS)continue;
      this.water[b.id]-=excess;
      if(b.outletId>=0)this.water[b.outletId]+=excess;
      else this.exported+=excess;
    }
  }

  /** Channel water volume supported before it spills over the banks. */
  channelCapacityLiters(index:number):number{
    const channel=this.watershed.channels[index];
    return CELL_AREA*1000*(channel
      ? CHANNEL_BANKFULL_DEPTH_M*CHANNEL_AREA_FRACTION
      : .012);
  }

  private transport(dt:number):void {
    // Explicit one-hop-per-step transport: no instantaneous catchment
    // teleportation or routing across dozens of cells in a single tick.
    const arrivals=new Float64Array(this.runoff.length);
    const floodArrivals=new Float64Array(this.flood.length);
    for(const cell of this.watershed.cells){
      const i=cell.index;
      const downstream=this.watershed.downhill[i];
      if(this.runoff[i]>EPS){
        const channel=this.watershed.channels[i];
        const tau=channel?.105:.34;
        const sent=this.runoff[i]*(1-Math.exp(-dt/tau));
        this.runoff[i]-=sent;
        if(downstream>=0)arrivals[downstream]+=sent;
        else {
          const basin=this.watershed.cellBasin[i];
          if(basin>=0)this.water[basin]+=sent;
          else this.exported+=sent;
        }
      }
      if(this.flood[i]>EPS){
        // Overbank water spreads and drains more slowly than channel water.
        const sent=this.flood[i]*(1-Math.exp(-dt/.52));
        this.flood[i]-=sent;
        if(downstream>=0)floodArrivals[downstream]+=sent;
        else{
          const basin=this.watershed.cellBasin[i];
          if(basin>=0)this.water[basin]+=sent;
          else this.exported+=sent;
        }
      }
    }
    for(const cell of this.watershed.cells){
      const i=cell.index;
      this.runoff[i]+=arrivals[i];
      this.flood[i]+=floodArrivals[i];
      // Overtopping is determined by local channel capacity, not by
      // the artistic shader. It is actual stored floodwater.
      const over=Math.max(0,this.runoff[i]-this.channelCapacityLiters(i));
      if(over>0){
        this.runoff[i]-=over;
        this.flood[i]+=over;
      }
    }
  }

  advance(startHour:number,hours:number,overrideCover:number|null):number{
    if(!Number.isFinite(hours)||hours<=0)return 0;
    const steps=Math.max(1,Math.ceil(hours/.035));
    const dt=hours/steps;
    let newRain=0;
    for(let step=0;step<steps;step++){
      const hour=wrapHour(startHour+(step+.5)*dt);
      const cover=overrideCover===null?cloudCoverAtHour(hour):clamp01(overrideCover);
      const intensity=rainIntensityAtHour(hour,cover,overrideCover!==null);
      const rainfallLitresPerCell=PEAK_RAIN_MM_PER_HOUR*intensity*dt*CELL_AREA;
      const clouds=intensity>0?visibleClouds(hour,cover):[];
      const intake=this.watershed.cells.map(c=>
        infiltrationBudgetLiters(c.x,c.z,dt));

      // Measured runoff is born exactly where rain exceeds intake.
      if(intensity>0)for(const cell of this.watershed.cells){
        const exposure=cloudExposure(cell,clouds);
        if(exposure<=0)continue;
        const amount=rainfallLitresPerCell*exposure;
        newRain+=amount;
        const available=Math.max(0,this.soilCaps[cell.index]-this.soil[cell.index]);
        const absorbed=Math.min(amount,available,intake[cell.index]);
        this.soil[cell.index]+=absorbed;
        intake[cell.index]-=absorbed;
        this.runoff[cell.index]+=amount-absorbed;
      }

      // Explicit upstream regional boundary condition (not rain).
      const inlet=RIVER_HEADWATER_LITRES_PER_HOUR*dt;
      this.runoff[this.northInletIndex]+=inlet;
      this.imported+=inlet;

      this.transport(dt);

      // Pond water can infiltrate under its submerged basin cells.
      for(const basin of this.watershed.basins){
        if(this.water[basin.id]<=EPS)continue;
        const level=solveWaterLevel(this.watershed,basin,this.water[basin.id]);
        if(level===null)continue;
        for(const index of basin.cellIndexes){
          if(this.water[basin.id]<=EPS)break;
          if(this.watershed.cells[index].height>=level-EPS)continue;
          const capacity=Math.max(0,this.soilCaps[index]-this.soil[index]);
          const absorbed=Math.min(capacity,intake[index],this.water[basin.id]);
          if(absorbed<=0)continue;
          this.water[basin.id]-=absorbed;
          this.soil[index]+=absorbed;
          intake[index]-=absorbed;
        }
      }

      // The new mobile water reservoirs also lose measured evaporation.
      const evap=evaporationMmPerHour(hour,cover)*dt*CELL_AREA;
      for(const cell of this.watershed.cells){
        const i=cell.index;
        const soilEvap=Math.min(this.soil[i],
          evap*surfaceAt(cell.x,cell.z).evaporationMultiplier);
        this.soil[i]-=soilEvap;
        this.evaporated+=soilEvap;
        const exposed=this.watershed.channels[i]? .55: .85;
        const runoffEvap=Math.min(this.runoff[i],evap*exposed);
        this.runoff[i]-=runoffEvap;
        this.evaporated+=runoffEvap;
        const floodEvap=Math.min(this.flood[i],evap*.8);
        this.flood[i]-=floodEvap;
        this.evaporated+=floodEvap;
      }
      for(const basin of this.watershed.basins){
        if(this.water[basin.id]<=EPS)continue;
        const level=solveWaterLevel(this.watershed,basin,this.water[basin.id]);
        if(level===null)continue;
        let wetCells=0;
        for(const index of basin.cellIndexes){
          if(this.watershed.cells[index].height<level-EPS)wetCells++;
        }
        const amount=Math.min(this.water[basin.id],evap*wetCells);
        this.water[basin.id]-=amount;
        this.evaporated+=amount;
      }
      this.routeOverflow();
    }
    this.deposited+=newRain;
    return newRain;
  }

  basinLiters(id:number):number{return this.water[id]??0;}
  runoffLiters(index:number):number{return this.runoff[index]??0;}
  floodLiters(index:number):number{return this.flood[index]??0;}
  importedLiters():number{return this.imported;}
  totalChannelLiters():number{return this.runoff.reduce((a,b)=>a+b,0);}
  totalFloodLiters():number{return this.flood.reduce((a,b)=>a+b,0);}
  totalPondLiters():number{return this.water.reduce((a,b)=>a+b,0);}
  totalLiters():number{
    return this.totalPondLiters()+this.totalChannelLiters()+this.totalFloodLiters();
  }
  exportedLiters():number{return this.exported;}
  totalDepositedLiters():number{return this.deposited;}
  evaporatedLiters():number{return this.evaporated;}
  soilLiters(index:number):number{return this.soil[index]??0;}
  soilCapacity(index:number):number{return this.soilCaps[index]??0;}
  soilFraction(index:number):number{
    return this.soilCaps[index]>0?this.soil[index]/this.soilCaps[index]:0;
  }
  totalSoilLiters():number{return this.soil.reduce((a,b)=>a+b,0);}
  /** Rain + imported upstream water = all retained and exported stores. */
  massBalanceError():number{
    return this.deposited+this.imported-this.totalLiters()
      -this.totalSoilLiters()-this.exported-this.evaporated;
  }
  surfaceLevel(id:number):number|null{
    const basin=this.watershed.basins[id];
    return basin?solveWaterLevel(this.watershed,basin,this.water[id]):null;
  }
  waterDepthAtCell(index:number):number{
    const basin=this.watershed.cellBasin[index];
    const pondLevel=basin>=0?this.surfaceLevel(basin):null;
    const pondDepth=pondLevel===null?0:
      Math.max(0,pondLevel-this.watershed.cells[index].height);
    const channelArea=this.watershed.channels[index]?
      CELL_AREA*CHANNEL_AREA_FRACTION:CELL_AREA;
    const moving=this.runoff[index]/(1000*channelArea);
    const flooded=this.flood[index]/(1000*CELL_AREA);
    return Math.max(pondDepth,moving+flooded);
  }
  snapshot():WaterState{
    return {
      basins:this.watershed.basins.map(b=>({
        sinkIndex:b.sinkIndex,litres:this.water[b.id],
      })),
      exportedLiters:this.exported,
      totalDepositedLiters:this.deposited,
      soilLiters:[...this.soil],
      evaporatedLiters:this.evaporated,
      runoffLiters:[...this.runoff],
      floodLiters:[...this.flood],
      importedLiters:this.imported,
    };
  }
  clear():void{
    this.water.fill(0);this.soil.fill(0);this.runoff.fill(0);this.flood.fill(0);
    this.exported=0;this.deposited=0;this.imported=0;this.evaporated=0;
  }
}
