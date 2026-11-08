/** MAP 04: shared geometry builder for real world fixtures.
 * One model path for game and Asset Lab; the scene retains collision/intel
 * and lifecycle authority. Extracted from breach-3d without shape changes.
 */
import * as THREE from 'three';
import {type Obstacle} from '../breach-core.ts';
import {propDefinition} from './asset-catalog.ts';
import {fixturePixelSurface} from './pixel-surface-selection.ts';
import type {PixelSurface} from '../rendering/pixel-recipes.ts';
import {renderDetailedFixture} from './detailed-fixture-visuals.ts';
import {renderCharacterFixture} from './asset-character-visuals.ts';
import {renderFoliageCardFixture} from './foliage-card-visuals.ts';
import {conditionColor,conditionRoughness} from './asset-condition.ts';
export type FixtureVisualContext={
 box:(parent:THREE.Object3D,x:number,y:number,z:number,
   w:number,h:number,d:number,material:THREE.Material,cast?:boolean)=>THREE.Mesh;
 solid:(hex:number,roughness?:number,surface?:PixelSurface)=>THREE.MeshStandardMaterial;
};
export function renderFixtureVisual(group:THREE.Group,c:Obstacle,i:number,
 ctx:FixtureVisualContext,wood:THREE.Material,steel:THREE.Material,
 olive:THREE.Material,metal:THREE.Material):void{
      const fixture=c.fixture??'crate';
      const asset=propDefinition(fixture);
      const nativeSurface=fixturePixelSurface(fixture);
      // In normal gameplay the original context is reused without overrides.
      const visualCtx:FixtureVisualContext=!c.artCondition&&!c.artSurface?ctx:{
        box:ctx.box,solid:(hex,roughness,surface)=>{
          const chosen=c.artSurface&&(!surface||surface===nativeSurface)?c.artSurface:surface??nativeSurface;
          return ctx.solid(conditionColor(hex,chosen,c.artCondition??'clean'),
            conditionRoughness(roughness,chosen,c.artCondition??'clean'),chosen);
        },
      };
      const material=visualCtx.solid(i%3===0?0x87735e:i%3===1?0x677a76:0x787b65,
        .87,nativeSurface);
      const w=c.w,d=c.h;
      // First choice: silhouette-first shared models. Existing asset types
      // keep the same tactical footprint, clearance and cover rules.
      if(renderCharacterFixture(group,c,fixture,c.artVariant??i,visualCtx,wood,steel,olive,metal))
        return;
      if(fixture==='bar-counter'){
        const finish=visualCtx.solid(0x776951,.88,'wood');
        ctx.box(group,c.x,12,c.y,w-3,23,d-4,finish);
        ctx.box(group,c.x,27,c.y+d*.12,w+2,3,d+4,steel,false);
        ctx.box(group,c.x,7,c.y-d*.42,w*.87,3,3,wood,false);
      }else if(['reception-desk','transaction-counter','parts-counter'].includes(fixture)){
        const top=asset?.height??27;
        const front=visualCtx.solid(fixture==='parts-counter'?0x59635c:
          fixture==='reception-desk'?0x687778:0x746958,.84,
          fixture==='transaction-counter'?'wood':'painted-metal');
        const trim=visualCtx.solid(0xc5b99a,.68,'wood');
        ctx.box(group,c.x,top*.48,c.y,w-2,top*.89,d-2,front);
        ctx.box(group,c.x,top+.2,c.y,w+3,3,d+3,trim,false);
        ctx.box(group,c.x,top*.73,c.y+d*.5,w*.84,2.3,2,metal,false);
        for(const x of [-w*.44,w*.44])
          ctx.box(group,c.x+x,top*.49,c.y+d*.47,2,top*.82,2.2,metal,false);
        if(fixture==='reception-desk'){
          ctx.box(group,c.x,top+4,c.y-d*.3,w*.61,7,3,front,false);
          ctx.box(group,c.x,top+7,c.y-d*.3,w*.62,1.6,4,trim,false);
        }else if(fixture==='transaction-counter'){
          ctx.box(group,c.x-w*.22,top+5,c.y-d*.14,w*.29,9,d*.31,metal,false);
          ctx.box(group,c.x-w*.22,top+10,c.y-d*.14,w*.25,1,3,trim,false);
          ctx.box(group,c.x+w*.25,top+1,c.y+d*.12,w*.28,1.5,d*.35,metal,false);
        }else{
          for(const x of [-w*.26,w*.26])
            ctx.box(group,c.x+x,top*.45,c.y+d*.51,2,top*.6,1.4,metal,false);
          ctx.box(group,c.x,top*.35,c.y+d*.52,w*.67,2,2,metal,false);
        }
      }else if(fixture==='queue-stanchion'){
        const post=visualCtx.solid(0x697470,.76,'industrial-steel');
        ctx.box(group,c.x,1.5,c.y,w,3,d,metal);
        ctx.box(group,c.x,12,c.y,2,23,2,post);
        ctx.box(group,c.x,24,c.y,4,2.5,4,post,false);
      }else if(fixture==='entry-bench'){
        const finish=visualCtx.solid(0x846a50,.88,'wood');
        ctx.box(group,c.x,18,c.y,w,3,d,finish);
        for(const x of [-w*.38,w*.38])
          ctx.box(group,c.x+x,9,c.y,3,17,d*.82,wood);
        ctx.box(group,c.x,8,c.y-d*.42,w*.82,2,3,finish,false);
      }else if(fixture==='shoe-cubby'){
        const finish=visualCtx.solid(0x7e715d,.88,'wood');
        ctx.box(group,c.x,12,c.y,w,24,d,finish);
        for(const level of [8,16])
          ctx.box(group,c.x,level,c.y+d*.46,w-3,2,2,metal,false);
        for(const x of [-w*.23,w*.23])
          ctx.box(group,c.x+x,5,c.y+d*.53,w*.28,3,2,olive,false);
      }else if(fixture==='coat-rack'){
        const panel=visualCtx.solid(0x696e62,.85,'wood');
        ctx.box(group,c.x,20,c.y-d*.29,w,40,3,panel);
        for(const dx of [-w*.3,0,w*.3]){
          ctx.box(group,c.x+dx,30,c.y+d*.22,2,9,2,metal,false);
          ctx.box(group,c.x+dx,27,c.y+d*.36,5,2,2,metal,false);
        }
        ctx.box(group,c.x,8,c.y+d*.20,w*.90,16,d*.52,wood);
      }else if(fixture==='diner-booth'){
        const upholstery=visualCtx.solid(0x576d63,.91,'fabric');
        const trim=visualCtx.solid(0x7f6b55,.85,'wood');
        for(const z of [-d*.36,d*.36]){
          ctx.box(group,c.x,10,c.y+z,w-4,5,d*.22,upholstery);
          ctx.box(group,c.x,19,c.y+z+(z<0?-d*.1:d*.1),
            w-4,17,3.4,upholstery);
          ctx.box(group,c.x,5,c.y+z,w-5,10,d*.18,trim);
        }
        ctx.box(group,c.x,19,c.y,w-10,3,d*.34,trim);
        for(const x of [-w*.32,w*.32])
          ctx.box(group,c.x+x,9,c.y,3,17,3,steel);
        ctx.box(group,c.x,28,c.y-d*.49,w-3,1.5,2,metal,false);
      }else if(fixture==='bar-stool'){
        const seat=visualCtx.solid(0x695b48,.87,'wood');
        ctx.box(group,c.x,22,c.y,w*.82,3,d*.82,seat);
        for(const xx of [-1,1])for(const zz of [-1,1])
          ctx.box(group,c.x+xx*w*.28,11,c.y+zz*d*.28,2,22,2,steel);
        ctx.box(group,c.x,8,c.y,w*.75,1.8,2,steel,false);
        ctx.box(group,c.x,8,c.y,2,1.8,d*.75,steel,false);
      }else if(['bed','exam-bed','guest'].includes(fixture)){
        const height=asset?.height??19;
        ctx.box(group,c.x,height*.33,c.y,w,height*.66,d,material);
        ctx.box(group,c.x,height*.75,c.y,w-3,height*.20,d-3,olive,false);
        ctx.box(group,c.x-w*.32,height*.92,c.y,w*.22,2,d*.7,steel,false);
      }else if(['table','desk','counter','workbench','cart','dining-table','coffee-table','meeting-table'].includes(fixture)){
        const top=asset?.height??19;
        ctx.box(group,c.x,top,c.y,w,3,d,material);
        for(const sx of [-1,1])for(const sz of [-1,1])
          ctx.box(group,c.x+sx*(w/2-3),top/2,c.y+sz*(d/2-3),
            3,top,3,steel);
        if(fixture==='counter')ctx.box(group,c.x,top*.42,c.y,w-5,top*.76,d-5,wood);
        if(fixture==='cart'){
          ctx.box(group,c.x,4,c.y,w*.83,1.8,d*.84,olive);
          for(const sx of [-1,1])for(const sz of [-1,1])
            ctx.box(group,c.x+sx*w*.38,2,c.y+sz*d*.34,4,4,4,metal);
        }
      }else if(['fridge','cooler','wardrobe','locker','filing-cabinet'].includes(fixture)){
        const height=asset?.height??32;
        const body=ctx.solid(fixture==='cooler'?0x8da7a1:0xadb5b0,.82,
          fixture==='cooler'?'plastic':'metal');
        ctx.box(group,c.x,height/2,c.y,w,height,d,body);
        ctx.box(group,c.x+w*.42,height*.55,c.y+d/2+.7,2,height*.35,2,steel,false);
        if(fixture==='fridge'||fixture==='cooler')
          ctx.box(group,c.x,Math.min(20,height*.55),c.y+d/2+1,w-4,1.4,2,steel,false);
      }else if(['stove','microwave','kitchen-island','sink','checkout'].includes(fixture)){
        const height=asset?.height??23;
        ctx.box(group,c.x,height/2,c.y,w,height,d,material);
        if(fixture==='stove'){
          const burner=ctx.solid(0x222b2c);
          for(const dx of [-1,1])for(const dz of [-1,1]){
            const ring=new THREE.Mesh(new THREE.TorusGeometry(
              Math.max(2,Math.min(w,d)*.13),1.2,5,12),burner);
            ring.rotation.x=Math.PI/2;
            ring.position.set(c.x+dx*w*.23,height+.6,c.y+dz*d*.2);
            group.add(ring);
          }
        }else if(fixture==='sink'){
          ctx.box(group,c.x,height+.6,c.y,w*.66,1.2,d*.65,steel,false);
          ctx.box(group,c.x+w*.27,height+6,c.y,2,10,2,steel,false);
        }else if(fixture==='checkout'){
          ctx.box(group,c.x,height+4,c.y+d*.28,w*.4,8,d*.27,steel,false);
        }
      }else if(fixture==='toilet'||fixture==='bathtub'){
        const porcelain=ctx.solid(0xd9dfd5,.94,'porcelain');
        if(fixture==='toilet'){
          const top=asset?.height??19;
          ctx.box(group,c.x,top*.34,c.y+d*.17,w*.63,top*.67,d*.6,porcelain);
          ctx.box(group,c.x,top*.50,c.y-d*.34,w*.75,top,d*.25,porcelain);
          ctx.box(group,c.x,top*.61,c.y+d*.15,w*.7,2,d*.58,steel,false);
          ctx.box(group,c.x,top*.74,c.y+d*.17,w*.72,1.7,d*.59,porcelain,false); // rim
          ctx.box(group,c.x+w*.25,top*.50,c.y-d*.47,2,3,2,steel,false);
        }else{
          ctx.box(group,c.x,11,c.y,w,21,d,porcelain);
          ctx.box(group,c.x,15,c.y,w*.75,3,d*.68,steel,false);
          ctx.box(group,c.x,16.8,c.y,w*.67,1,d*.61,porcelain,false); // bath lip
          ctx.box(group,c.x-w*.39,22,c.y-d*.30,2,9,2,steel,false); // tap riser
          ctx.box(group,c.x-w*.36,25,c.y-d*.22,5,1.5,2,steel,false);
        }
      }else if(['shelf','gondola-shelf','wall-shelf','bookcase','rack'].includes(fixture)){
        // Stock and shelving fill the silhouette, matching the authoritative
        // obstacle/visibility envelope instead of suggesting a passable void.
        const tall=Math.max(27,asset?.height??27);
        const shelfWood=ctx.solid(fixture==='bookcase'?0x715d4a:0x6b6b60,.88,
          fixture==='bookcase'?'wood':'metal');
        ctx.box(group,c.x,tall/2,c.y,w,tall,d*.88,shelfWood);
        for(const level of [tall*.22,tall*.49,tall*.77]){
          ctx.box(group,c.x,level,c.y+d*.46,w,2,d*.2,steel,false);
          if(fixture==='gondola-shelf'||fixture==='rack'){
            for(const sx of [-1,1])
              ctx.box(group,c.x+sx*w*.26,level+4,c.y+d*.48,
                Math.max(5,w*.2),7,Math.max(4,d*.14),material,false);
          }
        }
      }else if(['cabinet','dresser','machine','laundry-machine','generator','control-panel','tool-chest'].includes(fixture)){
        const tall=asset?.height??27;
        ctx.box(group,c.x,tall/2,c.y,w,tall,d,material);
        for(const level of [tall*.32,tall*.65])
          ctx.box(group,c.x,level,c.y+d/2+1,w-4,1.5,2,steel,false);
        if(fixture==='generator'||fixture==='control-panel')
          for(const sx of [-1,0,1])
            ctx.box(group,c.x+sx*w*.27,tall*.8,c.y+d/2+1,
              3,3,2,ctx.solid(0xc6b182),false);
      }else if(['vehicle','sedan','pickup','van','suv'].includes(fixture)){
        // Purpose-shaped low-poly bodies, not a generic block on four sticks.
        // X is vehicle length and Z is width; collision uses the same footprint.
        const model=fixture==='vehicle'?'sedan':fixture;
        const paint=ctx.solid([0x647b72,0x9c8e74,0x71838c,0x99745d][i%4],.76,'metal');
        const glass=ctx.solid(0x557579,.25);
        const rubber=ctx.solid(0x252b2b,.94,'rubber');
        const chrome=ctx.solid(0x9ea7a0,.48,'metal');
        const radius=Math.max(2.2,Math.min(w*.085,d*.23));
        ctx.box(group,c.x,10,c.y,w,11,d*.91,paint);
        ctx.box(group,c.x,5,c.y,w*.9,4,d*.72,steel);
        for(const sx of [-1,1])for(const sz of [-1,1]){
          const tire=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,3,10),rubber);
          tire.rotation.x=Math.PI/2;
          tire.position.set(c.x+sx*w*.31,radius*.83,c.y+sz*d*.43);
          tire.castShadow=true;group.add(tire);
          const hub=new THREE.Mesh(new THREE.CylinderGeometry(radius*.42,radius*.42,3.3,10),chrome);
          hub.rotation.x=Math.PI/2;hub.position.copy(tire.position);
          group.add(hub);
        }
        if(model==='van'){
          const roof=asset?.height??42;
          ctx.box(group,c.x,(15+roof)/2,c.y,w*.78,roof-15,d*.86,paint);
          ctx.box(group,c.x-w*.32,(16+roof)/2,c.y-d*.44,
            w*.21,(roof-16)*.65,1,glass,false);
          ctx.box(group,c.x+w*.27,(16+roof)/2,c.y,2,(roof-16)*.62,d*.7,glass,false);
        }else{
          const truck=model==='pickup',high=model==='suv';
          const cabWidth=truck?w*.37:high?w*.63:w*.52;
          const cabCenter=truck?c.x-w*.20:c.x-w*.035;
          const cabHeight=Math.max(12,(asset?.height??32)-15);
          ctx.box(group,cabCenter,15+cabHeight*.5,c.y,
            cabWidth,cabHeight,d*.79,paint);
          const windshield=ctx.box(group,cabCenter+cabWidth*.40,
            16+cabHeight*.40,c.y,1.6,cabHeight*.65,d*.70,glass,false);
          windshield.rotation.z=-.15;
          const rearGlass=ctx.box(group,cabCenter-cabWidth*.43,
            16+cabHeight*.40,c.y,1.4,cabHeight*.59,d*.67,glass,false);
          rearGlass.rotation.z=.12;
          if(truck){
            const bedX=c.x+w*.27,bedW=w*.40;
            ctx.box(group,bedX,14,c.y,bedW,3,d*.82,paint);
            for(const sz of [-1,1])
              ctx.box(group,bedX,17,c.y+sz*d*.41,bedW,6,2,paint);
            ctx.box(group,c.x+w*.46,16,c.y,3,6,d*.85,paint);
          }else if(model==='sedan'){
            ctx.box(group,c.x+w*.36,12,c.y,w*.25,4,d*.85,paint);
            ctx.box(group,c.x-w*.38,12,c.y,w*.21,4,d*.85,paint);
          }
        }
        for(const sx of [-1,1]){
          ctx.box(group,c.x+sx*w*.51,8,c.y,w*.025,3,d*.84,chrome,false);
          const lamp=ctx.solid(sx>0?0xd8ca9e:0x954d48,.62);
          ctx.box(group,c.x+sx*w*.515,12,c.y-d*.26,1.2,4,d*.17,lamp,false);
          ctx.box(group,c.x+sx*w*.515,12,c.y+d*.26,1.2,4,d*.17,lamp,false);
        }
      }else if(fixture==='public-bench'){
        // Public seating needs a cast-metal support frame, visible slats
        // and unmistakable seat/back profile, not a generic box.
        const iron=visualCtx.solid(0x454f4a,.83,'industrial-steel');
        const timber=visualCtx.solid(0x7d745f,.94,'wood');
        const seat=11.2,back=asset?.height??26;
        for(const sx of [-.40,.40]){
          ctx.box(group,c.x+sx*w,seat*.46,c.y,3,seat*.92,d*.68,iron);
          ctx.box(group,c.x+sx*w,back*.60,c.y-d*.40,3,back*.70,3,iron);
          ctx.box(group,c.x+sx*w,seat+2.3,c.y+d*.12,2.5,2.5,d*.70,iron,false);
        }
        for(const z of [-.25,0,.25])
          ctx.box(group,c.x,seat,c.y+d*z,w*.89,2.1,d*.19,timber,false);
        for(const y of [16.5,21.0,25.1])
          ctx.box(group,c.x,y,c.y-d*.40,w*.88,2.7,2.2,timber,false);
      }else if(fixture==='chair'||fixture==='bench'){
        const seat=10.4;
        ctx.box(group,c.x,seat,c.y,w*.88,3,d*.87,wood);
        const chairHeight=asset?.height??25;
        ctx.box(group,c.x,(chairHeight+10)/2,c.y-d*.43,
          w*.87,chairHeight-10,3,material);
        for(const sx of [-1,1])for(const sz of [-1,1])
          ctx.box(group,c.x+sx*w*.35,seat*.48,c.y+sz*d*.34,
            2.8,seat,2.8,steel);
        ctx.box(group,c.x,seat+2,c.y,w*.68,.9,d*.66,olive,false);
      }else if(fixture==='sofa'||fixture==='armchair'){
        const back=asset?.height??24;
        ctx.box(group,c.x,6,c.y,w,9,d,material);
        ctx.box(group,c.x,back/2,c.y-d*.38,w,back,d*.24,material);
        for(const sx of [-1,1])ctx.box(group,c.x+sx*(w/2-3),8,c.y,5,13,d,steel);
        const count=fixture==='armchair'?1:2;
        for(let n=0;n<count;n++)ctx.box(group,c.x+(n-(count-1)/2)*w/count,
          11,c.y+2,Math.max(4,w/count-3),3,d*.63,olive,false);
      }else if(fixture==='tv-stand'){
        const height=asset?.height??21;
        ctx.box(group,c.x,height*.28,c.y,w,height*.56,d,wood);
        ctx.box(group,c.x,height*.74,c.y-d*.15,w*.78,height*.50,2,steel,false);
        ctx.box(group,c.x,height*.74,c.y-d*.15+1.1,
          w*.70,height*.42,.4,ctx.solid(0x667f80,.33),false);
      }else if(fixture==='barrel'||fixture==='tank'||fixture==='tire-stack'){
        const top=asset?.height??22,radius=Math.min(w,d)*.43;
        const cylinder=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,top,12),steel);
        cylinder.position.set(c.x,top/2,c.y);cylinder.castShadow=true;group.add(cylinder);
        if(fixture==='tire-stack')for(const level of [4,11,18]){
          const ring=new THREE.Mesh(new THREE.TorusGeometry(Math.max(2,radius-2),3,5,12),wood);
          ring.rotation.x=Math.PI/2;ring.position.set(c.x,level,c.y);
          ring.castShadow=true;group.add(ring);
        }
      }else if(fixture==='vehicle-lift'){
        ctx.box(group,c.x,2,c.y,w,4,d,steel);
        for(const sx of [-1,1])ctx.box(group,c.x+sx*(w*.43),
          (asset?.height??37)/2,c.y,5,asset?.height??37,6,metal);
        ctx.box(group,c.x,9,c.y,w*.8,4,d*.55,wood);
      }else if(renderFoliageCardFixture(group,c,i,visualCtx)){
        // Stable crossed alpha-cutout cards. Geometry/collisions still come
        // exclusively from the existing physical Obstacle footprint.
      }else if(['mailbox','trash-bin','bollard','hydrant','utility-cabinet',
        'parking-block','parking-sign','street-lamp','bike-rack',
        'vending-machine','wayfinding-sign','screened-dumpster'].includes(fixture)){
        const enamel=ctx.solid(0x777f79,.72,'metal');
        const dark=ctx.solid(0x343c3b,.86);
        const safety=ctx.solid(0xae8e52,.78);
        const signal=ctx.solid(0xb37c5a,.75);
        if(fixture==='mailbox'){
          // Street-facing mailbox: clear support, case, sloping cap and
          // hinged front flap; not an unmarked electrical junction box.
          const top=asset?.height??29;
          ctx.box(group,c.x,top*.39,c.y,3.7,top*.78,3.7,dark);
          ctx.box(group,c.x,top-5,c.y,w*.96,9,d*.90,enamel);
          const lid=ctx.box(group,c.x,top-.1,c.y-.6,w,2.1,d*.98,dark,false);
          lid.rotation.x=-.10;
          ctx.box(group,c.x,top-5,c.y+d*.461,w*.76,5.5,.9,dark,false);
          ctx.box(group,c.x,top-4.9,c.y+d*.515,w*.58,3.7,.6,enamel,false);
          ctx.box(group,c.x+w*.45,top-2,c.y,1.7,7,1.6,signal,false);
        }else if(fixture==='screened-dumpster'){
          // One physical refuse-bay footprint: low steel skip sheltered by
          // three slatted privacy walls with an unmistakable open service
          // mouth on +Z. No invisible extra enclosure colliders.
          const H=asset?.height??38;
          const slat=visualCtx.solid(0x777863,.91,'wood');
          const steel=visualCtx.solid(0x4a605a,.86,'painted-metal');
          const inner=visualCtx.solid(0x303b39,.9,'industrial-steel');
          for(const x of [-w*.46,w*.46])
            for(const z of [-d*.43,d*.21])
              ctx.box(group,c.x+x,H*.43,c.y+z,2.7,H*.85,3.0,steel);
          for(const y of [8,15,22,29,36]){
            ctx.box(group,c.x,y,c.y-d*.46,w*.97,4,2.2,slat,false);
            for(const side of [-1,1])
              ctx.box(group,c.x+side*w*.46,y,c.y-d*.105,
                2.2,4,d*.70,slat,false);
          }
          ctx.box(group,c.x,H*.38,c.y+d*.04,
            w*.73,H*.68,d*.58,steel);
          ctx.box(group,c.x,H*.74,c.y+d*.04,
            w*.76,3.3,d*.61,inner,false);
          ctx.box(group,c.x,H*.77,c.y-d*.12,
            w*.73,2.7,d*.34,inner,false);
          ctx.box(group,c.x,H*.30,c.y+d*.35,
            w*.38,H*.14,1.2,slat,false);
          for(const sign of [-1,1])
            ctx.box(group,c.x+sign*w*.35,3,c.y+d*.29,
              4.3,4.2,4.1,inner,false);
        }else if(fixture==='vending-machine'){
          // A real commercial vending cabinet, visually independent of
          // electrical infrastructure: bright product display, keypad,
          // coin/payment reader, collection hatch and weather hood.
          const H=asset?.height??44;
          const shell=visualCtx.solid(0x7b342c,.84,'painted-metal');
          const border=visualCtx.solid(0x293a3a,.88,'painted-metal');
          const glass=visualCtx.solid(0x45636a,.35,'glass');
          const inset=visualCtx.solid(0x233b3e,.92,'industrial-steel');
          const button=visualCtx.solid(0xc1b18b,.72,'painted-metal');
          ctx.box(group,c.x,H*.49,c.y,w*.99,H*.94,d*.97,shell);
          ctx.box(group,c.x,2,c.y,w*.99,4,d*.99,border);
          // +Z is the customer-facing side of the vending machine.
          ctx.box(group,c.x-w*.14,H*.60,c.y+d*.503,
            w*.62,H*.62,1.4,border,false);
          ctx.box(group,c.x-w*.14,H*.60,c.y+d*.578,
            w*.55,H*.55,.7,glass,false);
          for(let row=0;row<3;row++)for(let col=0;col<4;col++){
            const tone=[0x9b9869,0x788b82,0xb47b57,0x927d73][(col+row)%4];
            const pack=visualCtx.solid(tone,.82,'painted-metal');
            ctx.box(group,c.x-w*.355+col*w*.145,H*.79-row*H*.155,
              c.y+d*.52,w*.105,H*.090,1.5,pack,false);
          }
          ctx.box(group,c.x+w*.34,H*.54,c.y+d*.536,
            w*.16,H*.35,1.5,inset,false);
          for(let k=0;k<3;k++)ctx.box(group,c.x+w*.34,
            H*(.60-k*.079),c.y+d*.62,3,1.3,1.0,button,false);
          ctx.box(group,c.x+w*.32,H*.68,c.y+d*.625,
            4.4,3.2,1.1,button,false);
          ctx.box(group,c.x,H*.145,c.y+d*.533,
            w*.62,H*.13,1.7,border,false);
          ctx.box(group,c.x,H*.12,c.y+d*.635,
            w*.47,H*.055,.9,inset,false);
          // Built-in rain hood makes the rare outdoor unit a protected kiosk.
          ctx.box(group,c.x,H+.5,c.y+d*.12,w+4,2.2,d+4,border,false);
          ctx.box(group,c.x,H-2.2,c.y+d*.54,w*.89,1.7,1.4,button,false);
        }else if(fixture==='wayfinding-sign'){
          // Freestanding, street-facing entrance arrow, not an arbitrary
          // parking restriction sign. Symbolic geometry is legible zoomed out.
          const H=asset?.height??48;
          const post=visualCtx.solid(0x52635f,.82,'industrial-steel');
          const face=visualCtx.solid(0x42656a,.86,'painted-metal');
          const glyph=visualCtx.solid(0xd9d3ba,.74,'painted-metal');
          for(const x of [-w*.29,w*.29])
            ctx.box(group,c.x+x,H*.45,c.y,2.7,H*.90,2.7,post);
          ctx.box(group,c.x,H*.78,c.y,w,H*.29,3.2,face,false);
          ctx.box(group,c.x,H*.79,c.y+d*.20,w*.62,2.2,1.1,glyph,false);
          const arrowX=c.x+w*.23,arrowY=H*.79;
          const up=ctx.box(group,arrowX,arrowY+3,c.y+d*.26,
            w*.27,2.0,1.2,glyph,false);
          const down=ctx.box(group,arrowX,arrowY-3,c.y+d*.26,
            w*.27,2.0,1.2,glyph,false);
          up.rotation.z=-.67;down.rotation.z=.67;
          ctx.box(group,c.x,H*.95,c.y,w+1,1.5,3.8,post,false);
        }else if(fixture==='trash-bin'){
          ctx.box(group,c.x,(asset?.height??23)*.45,c.y,
            w*.86,(asset?.height??23)*.9,d*.86,dark);
          ctx.box(group,c.x,(asset?.height??23)-1.5,c.y,w,3,d,enamel);
          ctx.box(group,c.x,22.7,c.y-d*.20,w*.6,1,d*.15,dark,false);
        }else if(fixture==='bollard'){
          ctx.box(group,c.x,11,c.y,5,22,5,safety);
          ctx.box(group,c.x,20,c.y,5.8,3,5.8,dark,false);
          ctx.box(group,c.x,1.6,c.y,8,3.2,8,enamel);
        }else if(fixture==='hydrant'){
          // Low, chunky six-sided fire hydrant with actual valve caps,
          // top bonnet, nozzle neck and a cast base. Never a lamppost cube.
          const body=visualCtx.solid(0xa55749,.82,'painted-metal');
          const iron=visualCtx.solid(0x555c57,.88,'industrial-steel');
          const H=asset?.height??21;
          ctx.box(group,c.x,1.7,c.y,w*.91,3.4,d*.88,iron);
          const barrel=new THREE.Mesh(
            new THREE.CylinderGeometry(5.1,6.2,H*.69,6),body);
          barrel.position.set(c.x,H*.44,c.y);
          barrel.castShadow=true;group.add(barrel);
          const crown=new THREE.Mesh(
            new THREE.CylinderGeometry(4.1,5.2,4.5,6),body);
          crown.position.set(c.x,H*.81,c.y);
          crown.castShadow=true;group.add(crown);
          ctx.box(group,c.x,H*.97,c.y,4,2.7,4,iron,false);
          for(const sign of [-1,1]){
            ctx.box(group,c.x+sign*w*.37,H*.51,c.y,5.5,5.2,6,body);
            ctx.box(group,c.x+sign*w*.49,H*.51,c.y,
              2.2,7.4,7.4,iron,false);
            ctx.box(group,c.x+sign*w*.49,H*.51,c.y,
              2.6,3.5,3.5,body,false);
          }
          ctx.box(group,c.x,H*.14,c.y,w*.85,2.2,d*.85,body,false);
        }else if(fixture==='utility-cabinet'){
          // Service electrical enclosure, not a vending machine: muted
          // powder-coated steel, two accessible door leaves, flush louvres,
          // hinges, latch and a small warning emblem. No giant black screen
          // or vending-like gold product rows.
          const height=asset?.height??39;
          const shell=visualCtx.solid(0x7b8780,.88,'painted-metal');
          const doors=visualCtx.solid(0x85918a,.84,'painted-metal');
          const recess=visualCtx.solid(0x495653,.94,'industrial-steel');
          const caution=visualCtx.solid(0xc0a66b,.83,'painted-metal');
          ctx.box(group,c.x,1.5,c.y,w*.95,3,d*.95,enamel);
          ctx.box(group,c.x,height*.52,c.y,w*.92,height*.89,d*.92,shell);
          for(const sign of [-1,1]){
            ctx.box(group,c.x+sign*w*.226,height*.51,c.y+d*.473,
              w*.438,height*.77,1.15,doors,false);
            for(const yy of [height*.26,height*.73])
              ctx.box(group,c.x+sign*w*.425,yy,c.y+d*.522,
                1.3,3.2,1.4,recess,false);
            for(const yy of [8.5,11.3,14.1])
              ctx.box(group,c.x+sign*w*.225,yy,c.y+d*.54,
                w*.20,.75,1.15,recess,false);
          }
          ctx.box(group,c.x,height*.50,c.y+d*.534,1.0,height*.68,1.1,recess,false);
          ctx.box(group,c.x+w*.13,height*.52,c.y+d*.55,1.3,4.5,1.1,recess,false);
          ctx.box(group,c.x-w*.17,height*.65,c.y+d*.55,5,4,1.1,caution,false);
          ctx.box(group,c.x-w*.17,height*.65,c.y+d*.59,.8,2.6,1.2,recess,false);
        }else if(fixture==='parking-block'){
          // Real low concrete wheel stop with end reflectors (not a
          // dangerous striped barrier across the entire driving lane).
          const concrete=visualCtx.solid(0x979488,.97,'concrete');
          ctx.box(group,c.x,2.9,c.y,w,5.8,d*.83,concrete);
          ctx.box(group,c.x,6.1,c.y,w*.93,1.4,d*.69,concrete,false);
          for(const sx of [-.36,.36])
            ctx.box(group,c.x+w*sx,6.9,c.y,
              w*.11,.7,d*.52,safety,false);
        }else if(fixture==='parking-sign'){
          const height=asset?.height??44;
          ctx.box(group,c.x,height*.5,c.y,2,height,2,dark);
          ctx.box(group,c.x,height*.79,c.y,w*.9,13,1,enamel,false);
          ctx.box(group,c.x,height*.79,c.y+.9,w*.55,1.8,.7,safety,false);
        }else if(fixture==='street-lamp'){
          // Street-standard stepped pole with a cantilever luminaire
          // facing the carriageway (-Z in the front-facing local frame).
          // No extra real-time light sources or per-frame shadow updates.
          const height=asset?.height??97;
          const pole=visualCtx.solid(0x606f6a,.8,'industrial-steel');
          const crown=visualCtx.solid(0x3c4948,.83,'painted-metal');
          const diffuser=visualCtx.solid(0xc9c1a3,.9,'glass');
          ctx.box(group,c.x,3,c.y,9,6,9,dark);
          ctx.box(group,c.x,height*.33,c.y,5.0,height*.63,5,pole);
          ctx.box(group,c.x,height*.80,c.y,3.8,height*.39,3.8,pole);
          const arm=ctx.box(group,c.x,height*.955,
            c.y-d*.57,3.5,3.7,d*1.40,pole,false);
          arm.rotation.x=-.13;
          ctx.box(group,c.x,height*.98,c.y-d*1.23,
            13,3.3,8,crown,false);
          ctx.box(group,c.x,height*.954,c.y-d*1.23,
            11.5,1.0,7.2,diffuser,false);
          ctx.box(group,c.x,height*.46,c.y,5.7,2.2,5.7,crown,false);
        }else if(fixture==='bike-rack'){
          // Three continuous upright hoops in the YZ plane. The old
          // X rotation laid open semicircles horizontally like C glyphs.
          const height=asset?.height??24;
          const r=Math.min(7.4,d*.33);
          for(const sx of [-.31,0,.31]){
            const x=c.x+w*sx,top=height-r;
            const hoop=new THREE.Mesh(new THREE.TorusGeometry(r,1.45,6,12,Math.PI),enamel);
            hoop.rotation.y=Math.PI/2;
            hoop.position.set(x,top,c.y);hoop.castShadow=true;group.add(hoop);
            for(const sign of [-1,1]){
              ctx.box(group,x,top*.5,c.y+sign*r,2.9,top,2.9,enamel);
              ctx.box(group,x,1,c.y+sign*r,5.7,2,5.7,dark,false);
            }
          }
        }
      }else if(fixture==='window-boards'){
        const timber=ctx.solid(0x7d6b54,.9,'wood'),nails=ctx.solid(0x4d514e,.8,'metal');
        const across=w>=d;
        for(const height of [3.5,10.5,17.5,24.5,31.5]){
          ctx.box(group,c.x,height,c.y,
            across?w:8,6.9,across?8:d,timber);
          for(const end of [-.38,.38])
            ctx.box(group,c.x+(across?end*w:0),height,c.y+(across?0:end*d),
              2.3,2.3,across?8.5:8.5,nails,false);
        }
      }else if(fixture==='half-wall'){
        const masonry=visualCtx.solid(0x8f8877,.94,'brick');
        ctx.box(group,c.x,8,c.y,w,16,d,masonry);
        ctx.box(group,c.x,17,c.y,w+3,2.5,d+3,wood,false);
        ctx.box(group,c.x,1,c.y,w+2,2,d+2,metal,false);
      }else if(fixture==='porch-post'){
        const timber=visualCtx.solid(0x827258,.88,'wood');
        ctx.box(group,c.x,20,c.y,w,40,d,timber);
        ctx.box(group,c.x,2,c.y,w+4,4,d+4,metal,false);
        ctx.box(group,c.x,39,c.y,w+4,3,d+4,wood,false);
      }else if(fixture==='support-column'){
        const concrete=visualCtx.solid(0x807f77,.94,'concrete');
        ctx.box(group,c.x,20,c.y,w,40,d,concrete);
        ctx.box(group,c.x,2,c.y,w+5,4,d+5,metal,false);
        ctx.box(group,c.x,39,c.y,w+3,3,d+3,metal,false);
      }else if(fixture==='privacy-fence'){
        const planks=visualCtx.solid(0x816f56,.94,'wood');
        for(let x=-w/2+4;x<w/2;x+=9)
          ctx.box(group,c.x+x,17,c.y,7.6,34,4,planks);
        for(const y of [9,28])ctx.box(group,c.x,y,c.y-2,w,3,3,wood,false);
        for(const x of [-w*.47,w*.47])ctx.box(group,c.x+x,19,c.y,4,38,5,wood);
      }else if(fixture==='iron-fence'){
        const iron=visualCtx.solid(0x4b5554,.78,'industrial-steel');
        for(const x of [-w*.47,w*.47])ctx.box(group,c.x+x,19,c.y,3,38,3,iron);
        for(let x=-w/2+8;x<w/2-4;x+=10)
          ctx.box(group,c.x+x,19,c.y,1.8,35,1.8,iron,false);
        for(const y of [6,30])ctx.box(group,c.x,y,c.y,w,2,2.2,iron,false);
      }else if(fixture==='chain-link-fence'){
        const h=36;
        for(const side of [-1,1])ctx.box(group,c.x+side*w*.47,h/2,c.y,3,h,3,metal);
        for(const level of [3,18,34])ctx.box(group,c.x,level,c.y,w,1.8,1.7,steel,false);
        for(let x=-w/2+6;x<w/2;x+=9)ctx.box(group,c.x+x,h/2,c.y,1,31,1,metal,false);
      }else if(fixture==='fence'){
        const height=asset?.height??24;
        for(const sx of [-1,1])ctx.box(group,c.x+sx*w*.47,height/2,c.y,
          3,height,3,wood);
        for(const h of [height*.35,height*.75])
          ctx.box(group,c.x,h,c.y,w,2,3,steel,false);
      }else if(renderDetailedFixture(group,c,fixture,visualCtx,wood,steel,olive,metal)){
        // Fully modeled specialty prop; same path in the lab and live maps.
      }else{
        const tall=asset?.height??(c.low?12:27);
        ctx.box(group,c.x,tall/2,c.y,w,tall,d,material);
        if(fixture==='pallet')
          for(const h of [2,7,12])ctx.box(group,c.x,h,c.y,w+2,2,d+2,wood,false);
      }

}
