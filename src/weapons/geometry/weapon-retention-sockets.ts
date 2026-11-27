/** WR2.0: proposed game-art anchors from the actual installed part envelopes.
 * Inputs are unscaled weapon-local bounds, never physics/ballistic sockets.
 * Evaluate once when a silhouette/configuration changes, not on render ticks.
 * These are candidate artwork seats, pending visual validation in WR2. */
export type RetentionPoint=Readonly<{x:number;y:number;z:number}>;
export type PartEnvelope=Readonly<{min:RetentionPoint;max:RetentionPoint}>;
export type RetentionEnvelopes=Readonly<{
 receiver:PartEnvelope;stock?:PartEnvelope|null;handguard?:PartEnvelope|null;
}>;
export type WeaponRetentionSockets=Readonly<{
 rear:RetentionPoint;front:RetentionPoint|null;single:RetentionPoint;
 supported:readonly ('single'|'two')[];
}>;
function valid(b:PartEnvelope|undefined|null):b is PartEnvelope{
 return !!b&&(['x','y','z'] as const).every(k=>
  Number.isFinite(b.min[k])&&Number.isFinite(b.max[k])&&b.max[k]>b.min[k]);
}
function seat(b:PartEnvelope,t:number,y:number):RetentionPoint{
 return {x:b.min.x+(b.max.x-b.min.x)*t,
  y:b.min.y+(b.max.y-b.min.y)*y,z:b.max.z};
}
/** No arbitrary cross-family fixed coordinates. Missing front art yields
 * no two-point candidate instead of inventing a floating front attachment.
 * Stockless silhouettes use the rear receiver envelope. */
export function deriveWeaponRetentionSockets(
 b:RetentionEnvelopes
):WeaponRetentionSockets|null{
 if(!valid(b.receiver))return null;
 const stock=valid(b.stock)&&b.stock.min.x<b.receiver.min.x-.5?
  b.stock:null;
 const rear=stock?seat(stock,.22,.50):seat(b.receiver,.12,.65);
 const single=seat(b.receiver,.12,.75);
 const candidate=valid(b.handguard)?seat(b.handguard,.82,.50):null;
 const front=candidate&&candidate.x>rear.x+1?candidate:null;
 return {rear,front,single,supported:front?['single','two']:['single']};
}
