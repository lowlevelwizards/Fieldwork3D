/** Quiet, deterministic whole-body presence. This never steps a foot.
 * Zeroes at active aim/firing/down states; depends only on fixed pose time.
 */
export type IdlePresenceInput={time:number;speed:number;aiming:boolean;
 firing:boolean;down:boolean;surrender:boolean;reload:boolean;
 posture:'stand'|'crouch'};
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
export function idlePresence(input:IdlePresenceInput){
 const fade=1-clamp(input.speed/11,0,1);
 const engaged=input.aiming||input.firing||input.down||
   input.surrender||input.reload;
 const strength=engaged?0:fade*(input.posture==='crouch'?.65:1);
 const breath=Math.sin(input.time*1.75)*strength;
 const shift=Math.sin(input.time*.63+.4)*strength;
 return {breath:breath*.065,headYaw:shift*.014,
   headPitch:Math.sin(input.time*.89+1.1)*strength*.009,
   weightShift:shift*.10,strength};
}
