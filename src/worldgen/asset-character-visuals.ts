/**
 * Fieldwork environmental art: secondary silhouette/personality pass.
 * The worldgen collision/catalog footprint stays authoritative. Every
 * assembly is reused by Asset Lab and battle scenes, with no new colliders.
 * Details are deliberately broad, flat-shaded, and readable at iso zoom.
 */
import * as THREE from 'three';
import type {Obstacle} from '../breach-core.ts';
import type {FixtureVisualContext} from './fixture-visuals.ts';
import {propDefinition} from './asset-catalog.ts';
import {fixturePixelSurface} from './pixel-surface-selection.ts';

export const CHARACTER_FIXTURE_IDS=new Set([
 'vehicle','sedan','pickup','van','suv',
 'bed','exam-bed','sofa','armchair','chair','dining-table','meeting-table',
 'coffee-table','desk','workbench','counter','kitchen-island','cart',
 'wardrobe','dresser','cabinet','locker','filing-cabinet','bookcase',
 'shelf','rack','gondola-shelf','wall-shelf','display-rack',
 'fridge','cooler','stove','sink','microwave','laundry-machine',
 'generator','control-panel','tool-chest','vehicle-lift','tank','barrel',
 'tire-stack','tv-stand','shed','dumpster','grill','shipping-container',
 'picnic-table','planter','lamp',
]);

/** Stable rotation of visual trims. It may be chosen per instance, but never
 * uses Math.random or changes a tactical footprint, cover flag or trajectory.
 */
export const characterVariant=(fixture:string,index:number):number=>{
 let h=2166136261;
 for(let k=0;k<fixture.length;k++)h=Math.imul(h^fixture.charCodeAt(k),16777619);
 return ((h>>>0)+Math.max(0,index))%3;
};

export function renderCharacterFixture(group:THREE.Group,c:Obstacle,
 fixture:string,index:number,ctx:FixtureVisualContext,
 wood:THREE.Material,steel:THREE.Material,
 olive:THREE.Material,metal:THREE.Material):boolean{
 if(!CHARACTER_FIXTURE_IDS.has(fixture))return false;
 const w=c.w,d=c.h,H=propDefinition(fixture)?.height??27;
 const variation=characterVariant(fixture,index);
 const baseColors=[0x687e76,0x9e8765,0x9c725b];
 const main=ctx.solid(baseColors[variation],.86,fixturePixelSurface(fixture));
 const dark=ctx.solid(0x333d3c,.92,'metal');
 const cream=ctx.solid(0xbdb79e,.9,'metal');
 const light=ctx.solid(0xc4b89e,.89,'metal');
 const glass=ctx.solid(0x557780,.32);
 const rubber=ctx.solid(0x293332,.97,'rubber');
 const red=ctx.solid(0xa16d57,.9,'metal');
 const accent=ctx.solid(variation===1?0xb69b57:0x82988d,.86,'metal');
 const b=(x:number,y:number,z:number,bw:number,bh:number,bd:number,
 mat:THREE.Material=main,cast=true)=>{
   const mesh=ctx.box(group,c.x+x,y,c.y+z,
     Math.max(.4,bw),Math.max(.3,bh),Math.max(.4,bd),mat,cast);
   return mesh;
 };
 const stand=(top:number,spanW=w*.78,spanD=d*.72)=>{
   for(const sx of [-1,1])for(const sz of [-1,1])
    b(sx*spanW*.5,top*.48,sz*spanD*.5,2.8,top*.96,2.8,steel);
 };
 const cyl=(x:number,y:number,z:number,r:number,height:number,
 mat:THREE.Material,axis:'x'|'y'|'z'='y',sides=9)=>{
   const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,height,sides),mat);
   mesh.position.set(c.x+x,y,c.y+z);
   if(axis==='x')mesh.rotation.z=Math.PI/2;
   if(axis==='z')mesh.rotation.x=Math.PI/2;
   mesh.castShadow=true;group.add(mesh);return mesh;
 };
 // 3D slab whose side profile is nonrectangular: a recognizable automotive
 // roof/hood rather than nested cubes. Extrusion width is bounded by c.h.
 const prism=(profile:readonly (readonly [number,number])[],
    width:number,mat:THREE.Material)=>{
   const shape=new THREE.Shape();
   shape.moveTo(profile[0][0],profile[0][1]);
   for(let k=1;k<profile.length;k++)shape.lineTo(profile[k][0],profile[k][1]);
   shape.closePath();
   const geo=new THREE.ExtrudeGeometry(shape,{
     depth:width,steps:1,bevelEnabled:false,curveSegments:1});
   const mesh=new THREE.Mesh(geo,mat);
   mesh.position.set(c.x,0,c.y-width/2);
   mesh.castShadow=true;group.add(mesh);return mesh;
 };
 const pane=(corners:readonly (readonly [number,number,number])[],
   mat:THREE.Material=glass)=>{
    const coordinates=corners.flatMap(([x,y,z])=>[c.x+x,y,c.y+z]);
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(coordinates,3));
    geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,mat);
    mesh.castShadow=false;mesh.receiveShadow=false;group.add(mesh);
 };
 const wheels=(centers:readonly number[],radius:number,axle=d*.43)=>{
   const rim=new THREE.CylinderGeometry(radius,radius,3.8,10);
   const hub=new THREE.CylinderGeometry(radius*.44,radius*.44,4.3,10);
   const tyres=new THREE.InstancedMesh(rim,rubber,centers.length*2);
   const caps=new THREE.InstancedMesh(hub,metal,centers.length*2);
   const temp=new THREE.Object3D();let n=0;
   for(const x of centers)for(const sign of [-1,1]){
     temp.position.set(c.x+x,radius*.91,c.y+sign*axle);
     temp.rotation.set(Math.PI/2,0,0);temp.scale.set(1,1,1);
     temp.updateMatrix();tyres.setMatrixAt(n,temp.matrix);
     temp.position.z+=sign*.75;temp.updateMatrix();caps.setMatrixAt(n,temp.matrix);
     n++;
   }
   tyres.instanceMatrix.needsUpdate=true;caps.instanceMatrix.needsUpdate=true;
   tyres.castShadow=true;group.add(tyres,caps);
 };
 if(['vehicle','sedan','pickup','van','suv'].includes(fixture)){
   const model=fixture==='vehicle'?'sedan':fixture;
   const pickup=model==='pickup',van=model==='van',suv=model==='suv';
   const cabTop=H-(van?1.6:2);
   const cabBottom=van?17.5:18;
   const tireRadius=Math.min(d*.177,8.3);
   const paint=ctx.solid(
     variation===0?0x667f76:variation===1?0xb39a6c:0x946e5e,.82,'metal');
   const trim=ctx.solid(0x77807b,.72,'metal');
   // Lower sill, separate nose and tail heights establish the front (+X).
   b(0,10.7,0,w*.94,11.4,d*.91,paint);
   b(0,5.5,0,w*.90,4,d*.77,dark);
   b(w*.35,17.2,0,w*.24,6,d*.82,paint);
   if(!pickup)b(-w*.35,16.3,0,w*.23,5.2,d*.83,paint);
   wheels([-w*.31,w*.31],tireRadius);
   // Four-point sloped cabin profile: sedan = low arch, van = squared box,
   // pickup = short passenger compartment and an OPEN rear load bed.
   const rear=pickup?w*.00:van?-w*.43:suv?-w*.35:-w*.30;
   const rearRoof=pickup?w*.10:van?-w*.35:suv?-w*.30:-w*.18;
   const frontRoof=pickup?w*.34:van?w*.25:suv?w*.20:w*.10;
   const front=pickup?w*.42:van?w*.39:suv?w*.31:w*.28;
   const cabinWidth=d*(van?.80:.73);
   prism([[rear,cabBottom],[front,cabBottom],
     [frontRoof,cabTop],[rearRoof,cabTop]],cabinWidth,paint);
   // Glazing is actually inset into the angled cabin sides, not entire box
   // faces made blue. Front/rear door glass lengths reflect the body style.
   const sideZ=cabinWidth*.501;
   for(const sign of [-1,1]){
     const side=sign*sideZ;
     const frontX=frontRoof-(frontRoof-rearRoof)*.07;
     const midX=(frontRoof+rearRoof)*.47;
     const bottomY=cabBottom+3,upperY=cabTop-3;
     const upperLeft=pickup?rearRoof+w*.035:rearRoof+w*.05;
     const rightBottom=front-(front-frontRoof)*.19;
     const frontGlass:[number,number,number][]=[
       [midX,bottomY,side],[rightBottom,bottomY,side],
       [frontX,upperY,side],[midX+.5,upperY,side],
     ];
     const rearGlass:[number,number,number][]=[
       [rear+(rearRoof-rear)*.28,bottomY,side],
       [midX-1,bottomY,side],[midX-1,upperY,side],
       [upperLeft,upperY,side],
     ];
     // For -Z, reverse vertex order so the outward normal faces camera.
     const emit=(corners:[number,number,number][])=>{
       const ordered=sign===1?corners:[...corners].reverse();
       pane(ordered);
     };
     emit(frontGlass);
     if(!pickup&&!van)emit(rearGlass);
     // Chunky door seams, lower rub rail, handle and outward mirrors.
     const doorAt=pickup?w*.20:van?w*.13:0;
     b(doorAt,cabBottom*.73,sign*d*.455,1.1,9,1.3,dark,false);
     b(doorAt-w*.06,18.6,sign*d*.464,5,1.2,1.1,cream,false);
     b(0,8.2,sign*d*.47,w*.79,2,1.2,dark,false);
     b(front*.78,20,sign*d*.45,5.3,3.8,2.6,dark,false);
     // Wheel arches are visible dark cutouts under the colored fenders.
     for(const x of [-w*.31,w*.31])
       b(x,tireRadius*1.54,sign*d*.455,tireRadius*1.42,
         2.8,2.4,dark,false);
   }
   // Frontal windscreen follows the pitched cabin. The broad polygon
   // is less expensive and more coherent than two thin overlapping boxes.
   pane([
     [frontRoof,cabTop-2,-cabinWidth*.41],
     [front*.965,cabBottom+2,-cabinWidth*.41],
     [front*.965,cabBottom+2,cabinWidth*.41],
     [frontRoof,cabTop-2,cabinWidth*.41],
   ],glass);
   b(w*.49,10.1,0,3.4,4,d*.92,trim,false);
   b(-w*.49,10.0,0,3.4,4,d*.90,trim,false);
   b(w*.482,14,0,2.3,3.8,d*.42,dark,false); // front grille
   b(-w*.486,13.8,0,2,3.5,d*.32,dark,false); // licence plate
   for(const sign of [-1,1]){
     b(w*.489,16,sign*d*.32,1.7,3.3,d*.21,cream,false);
     b(-w*.489,15.5,sign*d*.32,1.7,3,d*.19,red,false);
   }
   if(pickup){
     // Visibly hollow cargo bed: lip, rails and tailgate.
     b(-w*.29,12.2,0,w*.39,3.4,d*.71,dark);
     for(const sign of [-1,1])
       b(-w*.28,17.5,sign*d*.41,w*.40,8.5,2.7,paint);
     b(-w*.485,17,0,3.1,8,d*.84,paint);
     if(variation===1)
       b(-w*.35,22,0,w*.20,8,d*.05,trim,false); // service crossbar
   }else if(van){
     // Sliding cargo door and inset panel clarify that it's a delivery van.
     for(const sign of [-1,1]){
       b(-w*.13,H*.50,sign*d*.412,w*.36,H*.43,1,dark,false);
       b(-w*.13,H*.50,sign*d*.424,w*.33,H*.37,1,paint,false);
       b(-w*.31,H*.48,sign*d*.437,5,2.1,1.1,trim,false);
     }
     b(-w*.42,H*.59,0,3,H*.49,d*.70,trim,false);
     if(variation===2)b(-w*.09,H+.15,0,w*.25,1.3,d*.39,cream,false);
   }else if(suv){
     // Overland/ranger SUV: rack rails and spare wheel on rear hatch.
     for(const sign of [-1,1])
       b(0,H-1,sign*d*.29,w*.57,2.3,2.5,dark,false);
     for(const x of [-w*.25,w*.15])b(x,H,0,2.5,1.5,d*.62,trim,false);
     cyl(-w*.491,15,0,tireRadius*.68,2.4,rubber,'x');
   }else if(variation===1){
     // Occasional service / taxi sedan, without changing the chassis.
     b(0,cabTop+1.2,0,12,2.6,5.5,accent,false);
     b(0,cabTop+2.7,0,7,1,4,cream,false);
   }
   return true;
 }
 if(['bed','exam-bed'].includes(fixture)){
   const clinical=fixture==='exam-bed';
   const top=clinical?H*.65:H*.48;
   const frame=clinical?steel:wood;
   b(0,top*.55,0,w*.94,top*.79,d*.91,frame);
   b(0,top+.45,0,w*.91,3,d*.85,clinical?cream:main);
   b(-w*.34,top+2.8,0,w*.25,4,d*.65,light,false); // pillow
   b(-w*.47,top+3.3,0,3.5,6,d*.92,frame);
   if(clinical){
     b(w*.30,top+1.4,0,w*.26,3,d*.77,glass,false); // foot panel
     for(const sx of [-1,1])b(sx*w*.35,4,0,3.5,8,d*.22,steel);
     b(w*.12,7,d*.46,3.2,10,2,steel,false); // adjustment handle
   }else{
     for(const sx of [-1,1])b(sx*w*.44,4,0,3.2,8,d*.83,wood);
     b(w*.14,top+2,0,w*.38,1.8,d*.82,accent,false); // folded blanket
   }
   return true;
 }
 if(fixture==='sofa'||fixture==='armchair'){
   const single=fixture==='armchair';
   const base=ctx.solid(variation===2?0x8f7467:0x6d8176,.92,'fabric');
   b(0,7,0,w*.94,12,d*.88,base);
   b(0,H*.59,-d*.39,w*.95,H*.75,d*.20,base); // raised back
   for(const sx of [-1,1]){
     b(sx*w*.44,10,0,w*.12,18,d*.91,base);
     b(sx*w*.44,19,0,w*.13,3,d*.65,light,false); // arms
     b(sx*w*.37,2.4,0,3.6,4.8,d*.62,dark);
   }
   const seats=single?1:2;
   for(let j=0;j<seats;j++){
     const x=(j-(seats-1)/2)*w*.48;
     b(x,14.3,d*.07,w*(single?.70:.40),3.3,d*.69,accent,false);
     b(x,H*.70,-d*.28,w*(single?.66:.40),H*.29,3.1,
      j===0?cream:base,false);
   }
   if(!single&&variation===1)b(w*.22,18.0,d*.14,5.5,4,6,red,false);
   return true;
 }
 if(fixture==='chair'){
   const seat=11;
   b(0,seat,0,w*.82,3,d*.82,main);
   stand(seat,w*.67,d*.63);
   b(0,(H+seat)/2,-d*.38,w*.78,H-seat,3.2,main);
   b(0,H-2,-d*.40,w*.78,3.5,4,wood,false);
   if(variation===0)for(const sx of [-1,1])
     b(sx*w*.26,(H+seat)/2,-d*.39,2.8,H-seat-5,2.0,steel,false);
   return true;
 }
 if(['desk','workbench','dining-table','meeting-table','coffee-table',
      'counter','kitchen-island','cart'].includes(fixture)){
   const counter=['counter','kitchen-island'].includes(fixture);
   const work=fixture==='workbench',desk=fixture==='desk';
   const meeting=fixture==='meeting-table',coffee=fixture==='coffee-table';
   const cart=fixture==='cart';
   const top=H;
   const thick=counter?3.5:work?4:3;
   // Leg positions vary by purpose and leave readable negative space.
   if(!counter){
     stand(top-thick,w*.76,d*.67);
     if(meeting)b(0,5,0,w*.85,2.8,d*.48,steel);
   }else b(0,top*.43,0,w*.89,top*.82,d*.85,wood);
   b(0,top-thick/2,0,w*.99,thick,d*.98,
     work?steel:counter?cream:wood);
   if(counter){
     for(const sx of [-.25,.25])
       b(sx*w,top*.43,d*.44,w*.42,top*.70,1.2,main,false);
     b(0,top*.47,d*.47,w*.75,1.0,1.5,dark,false);
     if(fixture==='kitchen-island'){
       b(0,top-1.2,-d*.41,w*.78,2,d*.12,wood,false);
       for(const sx of [-.31,.31])
         b(sx*w,top*.42,-d*.46,w*.20,top*.60,1,steel,false);
     }
   }else if(desk){
     b(-w*.25,top*.63,d*.28,w*.27,top*.40,d*.37,wood);
     for(const yy of [top*.43,top*.68])
       b(-w*.25,yy,d*.49,w*.22,1.4,.8,dark,false);
     b(w*.1,top-3,-d*.24,w*.48,2,2.5,steel,false);
   }else if(work){
     b(0,5,0,w*.79,1.8,d*.80,wood);
     for(const sx of [-1,1])
       b(sx*w*.36,top*.55,-d*.41,3.6,top*.75,2.8,steel);
     b(0,top*.83,-d*.43,w*.73,6,2.3,dark,false);
     for(const sx of [-.22,.20])
       b(sx*w,top*.84,-d*.48,3,3,1.2,accent,false);
   }else if(cart){
     b(0,5,0,w*.88,2,d*.81,steel);
     for(const sx of [-1,1])for(const sz of [-1,1])
       cyl(sx*w*.34,3,sz*d*.34,2.7,2.0,rubber,'z',7);
     b(-w*.47,top*.73,0,2,top*.54,d*.65,steel);
   }else if(coffee){
     b(0,4,0,w*.80,1.6,d*.74,olive,false);
   }else if(meeting){
     b(0,top+.6,0,w*.35,1.0,d*.13,dark,false);
   }else{ // dining table: visible aprons and end supports
     b(0,top*.72,-d*.34,w*.80,3,2.2,steel,false);
     b(0,top*.72,d*.34,w*.80,3,2.2,steel,false);
   }
   return true;
 }
 if(['wardrobe','dresser','cabinet','locker','filing-cabinet','bookcase',
   'shelf','rack','gondola-shelf','wall-shelf','display-rack'].includes(fixture)){
   const shelves=['bookcase','shelf','rack','gondola-shelf','wall-shelf','display-rack'].includes(fixture);
   const clothes=['wardrobe','locker'].includes(fixture);
   const metalCase=['locker','filing-cabinet','rack','gondola-shelf','display-rack'].includes(fixture);
   const shell=metalCase?steel:wood;
   b(0,H*.50,-d*.04,w*.96,H*.97,d*.87,shell);
   b(0,H*.50,d*.455,w*.87,H*.91,1,dark,false);
   if(shelves){
     // Dense silhouettes at a distance, but distinct stocked rows up close.
     const count=fixture==='rack'?3:fixture==='wall-shelf'?2:4;
     for(let k=0;k<count;k++){
       const y=H*(k+.28)/(count+.25);
       b(0,y,d*.47,w*.90,2.5,d*.16,metalCase?steel:wood,false);
       for(const x of [-.25,.05,.29]){
         const j=(k+variation+(x<0?1:0))%3;
         b(x*w,y+H*.085,d*.40,w*.18,H*.15,d*.15,
           j===0?accent:j===1?cream:main,false);
       }
     }
     for(const sx of [-1,1])
       b(sx*w*.465,H*.49,d*.33,2.2,H*.96,2.3,shell);
     if(fixture==='gondola-shelf'||fixture==='display-rack')
       b(0,H*.94,d*.49,w*.89,H*.10,d*.16,accent,false);
   }else if(clothes){
     const segments=fixture==='locker'?2:2;
     for(let k=0;k<segments;k++){
       const x=(k-(segments-1)/2)*w*.46;
       b(x,H*.50,d*.43,w*.43,H*.85,1.5,
         variation===2?main:metalCase?steel:wood,false);
       b(x+w*.08,H*.53,d*.48,1.3,6,1.4,light,false);
       if(fixture==='locker')for(const yy of [H*.25,H*.78])
         b(x,yy,d*.49,w*.22,.8,1,dark,false);
     }
     b(0,H*.96,0,w,2.4,d,metal);
   }else{
     const drawers=fixture==='filing-cabinet'?4:fixture==='dresser'?3:2;
     for(let k=0;k<drawers;k++){
       const y=H*(k+.60)/(drawers+.15);
       b(0,y,d*.46,w*.83,H/(drawers+1)*.79,1.2,
         fixture==='filing-cabinet'?steel:main,false);
       b(0,y,d*.5,w*.22,1.3,1.1,metal,false);
     }
     b(0,H-.8,0,w,1.6,d,wood,false);
   }
   return true;
 }
 if(['fridge','cooler','stove','sink','microwave','laundry-machine'].includes(fixture)){
   const white=ctx.solid(variation===0?0xb7b8ad:0x8d9a95,.86,'metal');
   const h=H;
   b(0,h*.50,0,w*.96,h*.98,d*.95,white);
   b(0,1.7,0,w*.98,3.4,d*.90,dark);
   if(fixture==='fridge'||fixture==='cooler'){
     // A split seam, actual grab handles and vent toe-kick.
     const split=fixture==='fridge'?.34:.55;
     b(0,h*split,d*.485,w*.90,1.2,1,steel,false);
     b(w*.29,h*.73,d*.50,2,h*.23,1.8,metal,false);
     b(w*.29,h*.18,d*.50,2,h*.17,1.8,metal,false);
     if(fixture==='cooler'){
       b(0,h*.58,d*.488,w*.69,h*.48,.9,glass,false);
       for(const yy of [.45,.61,.77])
         b(0,h*yy,d*.51,w*.64,1.1,1,cream,false);
     }
   }else if(fixture==='stove'){
     b(0,h+.25,0,w*.90,1.2,d*.87,dark,false);
     for(const dx of [-.24,.24])for(const dz of [-.22,.22])
       cyl(dx*w,h+1.4,dz*d,2.5,.7,steel);
     b(0,h*.45,d*.48,w*.75,h*.44,1, dark,false);
     b(0,h*.47,d*.51,w*.62,h*.29,1,glass,false);
     for(const dx of [-.28,-.09,.1,.29])
       b(dx*w,h*.89,d*.52,2,1.7,1.3,metal,false);
   }else if(fixture==='sink'){
     b(0,h+.35,0,w*.85,1.3,d*.80,steel);
     b(-w*.06,h+.55,0,w*.55,.5,d*.52,dark,false);
     b(w*.20,h+4.8,-d*.28,2,8,2,metal,false);
     b(w*.08,h+8.0,-d*.18,w*.26,1.4,2,metal,false);
     b(0,h*.58,d*.49,w*.72,h*.5,.9,wood,false);
   }else if(fixture==='microwave'){
     b(0,h*.52,d*.47,w*.76,h*.55,1.4,dark,false);
     b(-w*.12,h*.55,d*.49,w*.48,h*.40,1,glass,false);
     b(w*.36,h*.57,d*.49,2,h*.34,1.1,steel,false);
     b(w*.35,h*.32,d*.50,2,2,1.2,light,false);
   }else{ // laundry machine
     const ring=new THREE.Mesh(new THREE.TorusGeometry(
       Math.min(w,d)*.26,2.2,5,12),steel);
     ring.position.set(c.x,h*.51,c.y+d*.49);group.add(ring);
     cyl(0,h*.51,d*.50,Math.min(w,d)*.19,1,glass,'z');
     b(0,h*.90,d*.49,w*.73,3,1,cream,false);
     b(w*.25,h*.90,d*.52,2,1.2,1,red,false);
   }
   return true;
 }
 if(['generator','control-panel','tool-chest','vehicle-lift','tank','barrel','tire-stack','tv-stand'].includes(fixture)){
   const h=H;
   if(fixture==='vehicle-lift'){
     for(const sx of [-1,1]){
       b(sx*w*.40,h*.5,0,5,h,d*.16,metal);
       b(sx*w*.40,h*.93,0,8,4,d*.19,accent,false);
       b(sx*w*.40,h*.60,d*.24,3,h*.36,3,steel);
     }
     b(0,3.5,0,w*.87,6,d*.53,dark);
     for(const sx of [-1,1])
       b(sx*w*.22,8,0,w*.31,3,d*.46,steel);
     b(-w*.43,h*.72,d*.24,6,7,2.3,cream,false);
   }else if(fixture==='tank'){
     cyl(0,h*.5,0,d*.41,h*.92,steel);
     b(0,2,0,w*.70,4,d*.73,dark);
     for(const yy of [h*.24,h*.78])
       b(0,yy,d*.42,w*.59,1.8,1.2,accent,false);
     b(w*.25,h*.92,0,4,5,4,metal);
   }else if(fixture==='barrel'||fixture==='tire-stack'){
     const tire=fixture==='tire-stack',levels=tire?3:1;
     for(let k=0;k<levels;k++){
       const height=h/levels,mid=(k+.5)*height;
       cyl(0,mid,0,d*.42,height*(tire?.90:.96),tire?rubber:main);
       if(tire)cyl(0,mid+height*.12,0,d*.21,1.0,dark);
     }
     if(!tire)for(const yy of [h*.14,h*.82])
       cyl(0,yy,0,d*.43,1.3,metal);
   }else if(fixture==='tv-stand'){
     b(0,h*.25,0,w*.94,h*.46,d*.82,wood);
     b(0,h*.52,d*.37,w*.65,h*.28,1.3,dark,false);
     b(0,h*.49,d*.45,w*.38,1.0,1.5,metal,false);
     b(0,h*.73,-d*.22,w*.81,h*.54,1.7,dark);
     b(0,h*.73,-d*.12,w*.72,h*.46,.65,glass,false);
     b(0,3.2,0,w*.80,1.5,d*.65,steel);
   }else{
     const tool=fixture==='tool-chest',controls=fixture==='control-panel';
     b(0,h*.5,0,w*.92,h*.92,d*.90,controls?steel:main);
     b(0,2,0,w*.90,4,d*.83,dark);
     if(tool){
       for(const yy of [.30,.51,.72]){
         b(0,h*yy,d*.48,w*.79,h*.17,1.5,steel,false);
         b(0,h*yy,d*.53,w*.21,1.6,1.4,cream,false);
       }
       b(0,h*.98,0,w*.94,2.3,d*.95,metal);
       for(const sx of [-1,1])cyl(sx*w*.35,3,0,3,2,rubber,'z');
     }else{
       b(0,h*.66,d*.48,w*.73,h*.55,2,controls?dark:steel,false);
       if(controls){
         for(const sx of [-.26,.02,.27])
           b(sx*w,h*.71,d*.54,4,4,1, sx<0?red:accent,false);
         b(0,h*.40,d*.53,w*.56,h*.13,1,glass,false);
         b(w*.36,h*.92,-d*.18,3,7,3,steel);
       }else{
         for(const sx of [-1,1])b(sx*w*.37,h*.42,d*.48,2,h*.60,2,dark,false);
         for(const yy of [.34,.49,.64,.79])
           b(0,h*yy,d*.52,w*.46,1.1,1.3,metal,false);
         b(w*.22,h*.92,0,6,7,5,steel);
       }
     }
   }
   return true;
 }
 if(['shed','dumpster','grill','shipping-container','picnic-table','planter','lamp'].includes(fixture)){
   // Finishing touches on the detailed family, emphasizing usable form and
   // logical asymmetry rather than a second set of ornamental boxes.
   if(fixture==='shed'){
     b(0,H*.38,0,w*.91,H*.73,d*.88,wood);
     prism([[-w*.53,H*.75],[0,H],[w*.53,H*.75]],d*.98,steel);
     b(0,H*.34,d*.448,w*.35,H*.62,1.4,dark,false);
     b(w*.13,H*.33,d*.46,2.2,2.2,1.3,cream,false);
     b(-w*.34,H*.55,d*.45,w*.16,H*.24,1.4,glass,false);
     b(w*.32,H*.17,d*.46,w*.12,H*.16,1.5,accent,false);
   }else if(fixture==='dumpster'){
     b(0,H*.43,0,w*.92,H*.79,d*.91,main);
     b(0,H*.86,-d*.24,w*.91,3,d*.47,dark);
     b(0,H*.86,d*.24,w*.91,3,d*.47,dark);
     for(const sx of [-1,1]){
       b(sx*w*.46,H*.48,0,2.4,H*.83,d*.94,steel);
       b(sx*w*.34,2.4,0,5,4.8,5,rubber);
     }
     b(0,H*.42,d*.465,w*.40,H*.24,.8,cream,false);
     for(const sx of [-.29,.29])
       b(sx*w,H*.54,d*.468,3,H*.33,1.1,dark,false);
   }else if(fixture==='grill'){
     b(0,H*.58,0,w*.79,H*.32,d*.77,dark);
     b(0,H*.85,-d*.09,w*.83,H*.27,d*.78,steel);
     b(0,H*.93,-d*.25,w*.25,2,1.6,wood,false);
     for(const sx of [-1,1])b(sx*w*.30,H*.30,0,3,H*.52,3,metal);
     for(const sx of [-.28,.28])
       b(sx*w,H*.49,d*.39,2.6,2.2,1.1,red,false);
     b(w*.49,H*.64,0,w*.19,2.8,d*.60,wood); // folding side tray
   }else if(fixture==='shipping-container'){
     b(0,H*.50,0,w*.97,H*.97,d*.92,red);
     b(0,H*.985,0,w,2,d*.98,dark);
     for(const sign of [-1,1]){
       for(let k=-5;k<=5;k++)
         b(k*w/12,H*.50,sign*d*.468,2.1,H*.86,1.5,steel,false);
       b(sign*w*.488,H*.50,0,3,H,d*.97,steel);
     }
     b(-w*.494,H*.49,0,1.8,H*.88,d*.84,dark,false);
     for(const zz of [-.27,.27])
       b(-w*.505,H*.50,zz*d,2.1,H*.78,2.3,metal,false);
     b(-w*.508,H*.59,0,2,2.1,d*.45,cream,false);
   }else if(fixture==='picnic-table'){
     b(0,H-2,0,w*.78,4,d*.49,wood);
     for(const sign of [-1,1]){
       b(0,H*.51,sign*d*.38,w*.91,3.1,d*.19,wood);
       for(const sx of [-1,1]){
         const leg=b(sx*w*.32,H*.37,sign*d*.23,3,H*.67,3,steel);
         leg.rotation.z=sx*-.22;
       }
     }
   }else if(fixture==='planter'){
     b(0,H*.23,0,w*.80,H*.46,d*.78,red);
     b(0,H*.46,0,w*.91,2,d*.88,wood);
     b(0,H*.65,0,w*.35,H*.35,d*.35,steel);
     for(const [sx,sz] of [[-.25,0],[.24,-.11],[.01,.25]]){
       const crown=new THREE.Mesh(
         new THREE.IcosahedronGeometry(Math.min(w,d)*.21,0),
         ctx.solid(variation===1?0x718563:0x526d5b,.9,'foliage'));
       crown.position.set(c.x+sx*w,H*.83,c.y+sz*d);
       crown.castShadow=true;group.add(crown);
     }
   }else{
     b(0,1.1,0,w*.46,2.2,d*.46,steel);
     b(0,H*.46,0,2.4,H*.86,2.4,metal);
     prism([[-w*.45,H*.75],[w*.45,H*.75],
       [w*.32,H],[-w*.32,H]],d*.86,cream);
     b(0,H*.75,0,w*.33,1.3,d*.36,accent,false);
   }
   return true;
 }
 // If a new ID is added to CHARACTER_FIXTURE_IDS, do not silently use a cube.
 return false;
}
