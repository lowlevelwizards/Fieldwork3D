/** Pure tactical position score: a protected firing lane beats empty cover. */
export type CoverAssessment={
 protected:boolean;shotClear:boolean;travel:number;range:number;
 allyConflict:boolean;nearDoor:boolean;approachExposed:boolean;
};
export function coverScore(q:CoverAssessment):number{
 return (q.protected?130:0)+(q.shotClear?92:-195)
  -(q.allyConflict?225:0)-(q.nearDoor?35:0)
  -(q.approachExposed?35:0)
  -q.travel*.34-q.range*.025;
}
