/** R4: accessory contact is not the same thing as protective-armor contact.
 * Plate carriers compress sewn-on front pockets; an unarmored chest rig
 * must instead rest OUTSIDE their actual rendered outer faces.
 * Measurements mirror the box/flap authors in operator-field-blouse-prototypes
 * and operator-new-upper-garments. Chest local: +X front, +Y up.
 */
export type RigFrontObstruction=Readonly<{
 low:number;high:number;front:number;label:string
}>;
const pocket=(y:number,height:number,front:number,label:string):
 RigFrontObstruction=>({low:y-height*.5,high:y+height*.5,front,label});
export const RIG_GARMENT_OBSTRUCTIONS:Readonly<
 Record<string,readonly RigFrontObstruction[]>>={
 'bdu-shirt':[
  pocket(2.10,3.18,5.61+1.40*.5,'BDU upper bellows'),
  pocket(3.50,.78,6.32+.30*.5,'BDU upper flap'),
  pocket(-4.05,3.32,5.61+1.52*.5,'BDU lower bellows'),
  pocket(-2.59,.78,6.32+.30*.5,'BDU lower flap')
 ],
 'acu-shirt':[
  pocket(1.20,3.13,5.61+1.33*.5,'ACU chest pocket'),
  pocket(2.64,.76,6.29+.30*.5,'ACU chest flap'),
  pocket(-3.80,2.53,5.53+1.20*.5,'ACU utility pocket'),
  pocket(-2.67,.66,6.14+.27*.5,'ACU utility flap')
 ],
 'smock-jacket':[
  pocket(2.06,3.02,5.59+.42+1.13*.5,'smock upper bellows'),
  pocket(2.06+3.02*.43,.62,5.59+1.13*.92+.26*.5,
   'smock upper flap'),
  pocket(-7.55,3.32,5.82+.42+1.20*.5,'smock lower bellows'),
  pocket(-7.55+3.32*.43,.62,5.82+1.20*.92+.26*.5,
   'smock lower flap')
 ],
 'gorka-jacket':[
  pocket(-3.85,2.78,6.12+1.02*.5,'Gorka pocket'),
  pocket(-2.55,.62,6.66+.24*.5,'Gorka reinforced flap'),
  pocket(4.73,2.0,5.79+.19*.5,'Gorka reinforced front yoke')
 ]
};
/** Real front occupied extent for each authored rig, not the nominal
 * shoulder point. Pocket checks must include the full front rig height.
 */
export const RIG_FRONT_SPANS:Readonly<Record<string,readonly [number,number]>>={
 'chest-placard':[-4.58,.48],
 'micro-rig':[-4.64,-.66],
 'light-rig':[-4.65,.40],
 'chicom-rig':[-5.59,.89],
 'bandolier':[-4.38,3.66],
 'split-front':[-4.83,1.05],
 'full-chest':[-6.55,3.10],
 'lbv':[-5.80,3.55],
 'field-webbing':[-5.6,1.0],
 'belt-harness':[-5.8,1.0],
 'sadf-webbing':[-5.90,1.10]
};
export function rigGarmentFrontClearance(
 top:string,rig:string,baseFront:number):number{
 const range=RIG_FRONT_SPANS[rig];
 if(!range)return baseFront;
 let front=baseFront;
 for(const obstacle of RIG_GARMENT_OBSTRUCTIONS[top]??[])
  if(obstacle.high>=range[0]&&obstacle.low<=range[1])
   front=Math.max(front,obstacle.front);
 return front;
}
