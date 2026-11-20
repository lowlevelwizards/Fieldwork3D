/** P6.H: frame-only broadphase for tactical 3D ally presentation.
 *
 * A candidate must be within the original ~49u fixed-position directional
 * courtesy/40u stack window OR within 90u of the interpolated muzzle.
 * The old exact predicates, health/side filter and safetyBodyFor are still
 * evaluated by the caller, in the original roster order. No game authority.
 */
export type FrameActorPoint={p:{x:number;y:number}};
export class FrameActorNeighborhoodIndex<T extends FrameActorPoint>{
 private readonly cells=new Map<string,number[]>();
 private readonly actors:T[]=[];
 private readonly matches:T[]=[];
 private readonly candidateIndices:number[]=[];
 private readonly seen=new Set<number>();
 private readonly cellSize=64;
 rebuild(actors:readonly T[]):void{
  this.cells.clear();this.actors.length=0;
  this.matches.length=0;this.candidateIndices.length=0;this.seen.clear();
  for(const actor of actors){
   const idx=this.actors.length;
   this.actors.push(actor);
   if(!Number.isFinite(actor.p.x)||!Number.isFinite(actor.p.y))continue;
   const key=this.key(Math.floor(actor.p.x/this.cellSize),
    Math.floor(actor.p.y/this.cellSize));
   const cell=this.cells.get(key)??[];
   cell.push(idx);this.cells.set(key,cell);
  }
 }
 private key(x:number,y:number):string{return x+':'+y;}
 private collect(x:number,y:number,radius:number):void{
  if(!Number.isFinite(x)||!Number.isFinite(y))return;
  const minX=Math.floor((x-radius)/this.cellSize);
  const maxX=Math.floor((x+radius)/this.cellSize);
  const minY=Math.floor((y-radius)/this.cellSize);
  const maxY=Math.floor((y+radius)/this.cellSize);
  for(let cx=minX;cx<=maxX;cx++)for(let cy=minY;cy<=maxY;cy++){
   const entries=this.cells.get(this.key(cx,cy));
   if(!entries)continue;
   for(const idx of entries){
    if(this.seen.has(idx))continue;
    const pos=this.actors[idx].p;
    // Broadphase only: retain all points potentially accepted by the
    // unchanged stack, directional or interpolated muzzle safety tests.
    if(Math.abs(pos.x-x)>radius||Math.abs(pos.y-y)>radius)continue;
    this.seen.add(idx);this.candidateIndices.push(idx);
   }
  }
 }
 /** The returned scratch view is valid only until the next query/rebuild. */
 candidates(fixedX:number,fixedY:number,drawX:number,drawY:number):readonly T[]{
  this.matches.length=0;this.candidateIndices.length=0;this.seen.clear();
  // Forward <48 and lateral <8.5 can place a diagonal peer up to
  // hypot(48,8.5)=48.75 from the actor's feet. The conservative 49u
  // square is required to avoid rejecting legitimate angled courtesy.
  this.collect(fixedX,fixedY,49);
  this.collect(drawX,drawY,90);
  // Sorting source positions preserves the original deterministic iteration
  // order, including duplicate IDs and equal-distance friendlies.
  this.candidateIndices.sort((a,b)=>a-b);
  for(const idx of this.candidateIndices)this.matches.push(this.actors[idx]);
  return this.matches;
 }
 clear():void{this.rebuild([]);}
}
