/** One authoritative Session assembly path. The public newSession API
 * performs the first intel observation after this completes. Do not move
 * RNG draws or global presentation adoption across these boundaries.
 */
import {newTacticalState,activateSite,COVER,initialDoors,type Pt} from './breach-core.ts';
import {length,targetAngle} from './breach-plan.ts';
import {generateSite,seeded,type Site,type SiteScale} from './breach-site.ts';
import type {EncounterContext} from './worldgen/encounter-types.ts';
import type {OperationKind} from './breach-operations.ts';
import type {IntelMode} from './breach-intel.ts';
import {initialIntel,bindIntelWorld} from './breach-intel.ts';
import {withActions} from './breach-actor-initial-state.ts';
import {issueWeaponPreset,starterWeaponPreset} from './breach-weapon-issue.ts';
import {freshMagazineIssue} from './arsenal/live-magazine-capacity.ts';
import {enemyKitForEncounter} from './breach-enemy-loadouts.ts';
import {createCivilian} from './breach-civilian-types.ts';
import {civilianRefugePoints} from './breach-civilian-refuge.ts';
import {materialForFixture,MATERIALS} from './breach-materials.ts';
import {initializeWindows} from './breach-windows.ts';
import {initDoor} from './breach-door.ts';
import {registerSessionWorldGeometry,sessionWorldGeometry,setPresentationWorldSession} from './breach-world-context.ts';
import {OBJECTIVE,EXTRACTION,SCENARIOS} from './breach-scenario-defaults.ts';
import type {Session,TeamActor} from './breach-game.ts';

const d=(a:Pt,b:Pt)=>length(a,b);
const clone=(p:Pt):Pt=>({...p});
const angle=(a:Pt,b:Pt)=>targetAngle(a,b);

/** Omitted seed keeps 052's historic static study for regression tests.
 * The actual game passes a unique seed on each newly loaded site.
 */
export function assembleSession(index=0,siteSeed?:number,
  intelMode:IntelMode='floor-plan',scale:SiteScale='standard',
  missionOverride?:OperationKind,prebuiltSite?:Site,
  encounterContext:EncounterContext={}):Session{
  const site=prebuiltSite??(siteSeed===undefined?undefined:
    generateSite(siteSeed>>>0,scale,undefined,
      {...encounterContext,mission:missionOverride??encounterContext.mission}));
  activateSite(site??null);
  const seed=newTacticalState();
  const variant=((index%SCENARIOS.length)+SCENARIOS.length)%SCENARIOS.length;
  const sample=SCENARIOS[variant];
  const operators=seed.operators.map(withActions);
  if(site){
    // Two more independently commanded operators, not cloned simulations.
    const rook=operators.find(a=>a.id==='rook')!;
    for(const [id,name] of [['ash','ASH'],['vale','VALE']]){
      const base={...rook,id,name,p:{...rook.p},path:[],
        lastSpotted:null,shots:0,fireCd:0,health:2};
      operators.push(withActions(base));
    }
    const friendly=operators.filter(a=>a.side==='blue');
    friendly.forEach((a,i)=>{
      const issue=issueWeaponPreset(starterWeaponPreset(a.id));
       a.weapon=issue.weapon;a.weaponConfiguration=issue.weaponConfiguration;
      const issueRounds=freshMagazineIssue(a.id,a.weapon,a.weaponConfiguration);
      a.magazine=issueRounds.magazine;a.reserve=issueRounds.reserve;
      a.insertedMagazineId=issueRounds.loadedMagazineId;
      a.spareMagazines=issueRounds.magazines;
      a.health=4;a.injuryStage=0;
      a.p={...site.spawn[i]};
      // Entry teams face the nearest actual interior, not a hard-coded
      // compass direction that is wrong for rotated/generated buildings.
      const room=[...site.rooms].sort((u,v)=>
        d(a.p,{x:u.x+u.w/2,y:u.y+u.h/2})-
        d(a.p,{x:v.x+v.w/2,y:v.y+v.h/2}))[0];
      a.heading=room?angle(a.p,{x:room.x+room.w/2,y:room.y+room.h/2}):
        angle(a.p,site.entrance);
      a.weaponYaw=a.heading;
      a.priorP={...a.p};
    });
    // Site danger scales gently with room count; guards never spawn outside
    // their generated rooms, and every corpse uses the actual site geometry.
    const old=operators.filter(a=>a.side==='red');
    const enemyRng=seeded(site.seed^0x8bd7812f);
    for(let i=0;i<site.enemies.length;i++){
      let a:TeamActor;
      if(i<old.length)a=old[i];
      else{
        const source=old[i%old.length];
        a=withActions({...source,id:'guard'+i,
          name:'GUARD '+(i+1),p:{...source.p},path:[],
          lastSpotted:null,shots:0,fireCd:0,health:2});
        operators.push(a);
      }
      a.p={...site.enemies[i]};a.priorP={...a.p};
      a.heading=site.encounter?.actors[i]?.heading??
        site.enemyHeadings?.[i]??enemyRng()*Math.PI*2;
      a.weaponYaw=a.heading;
      const spec=site.encounter?.actors[i];
      if(spec){a.encounterActivity=spec.activity;a.encounterReadiness=spec.readiness;
        a.encounterRole=spec.role;a.encounterGroupId=spec.groupId;
        a.encounterRoutine=spec.routine?.map(p=>({...p}));
        a.routineIndex=0;a.routinePauseUntil=1.5+enemyRng()*3;
        a.encounterReactionUntil=Number.POSITIVE_INFINITY;}
      a.health=enemyRng()<.18?3:4;
      const issued=enemyKitForEncounter(spec,site.seed,i);
      a.weapon=issued.weapon;
      a.weaponConfiguration=issued.weaponConfiguration;
      a.equipment=issued.equipment;a.wardrobe=issued.wardrobe;
      a.appearanceSeed=issued.appearanceSeed;
      a.armorIntegrity=issued.armorIntegrity;
      a.helmetIntegrity=issued.helmetIntegrity;
      const issueRounds=freshMagazineIssue(a.id,a.weapon,a.weaponConfiguration);
      a.magazine=issueRounds.magazine;a.reserve=issueRounds.reserve;
      a.insertedMagazineId=issueRounds.loadedMagazineId;
      a.spareMagazines=issueRounds.magazines;
      a.injuryStage=0;
      a.personality=spec?.role==='investigator'?'aggressor':
        spec?.role==='reserve'||spec?.role==='target'?'cautious':
        (['guard','aggressor','cautious'] as const)[Math.floor(enemyRng()*3)];
      a.morale=.48+enemyRng()*.52;
    }
    // Generated sites may legitimately have one or no armed occupants.
    // Remove unused legacy defenders: no invisible off-map enemies.
    if(site.enemies.length<old.length){
      const unused=new Set(old.slice(site.enemies.length));
      for(let i=operators.length-1;i>=0;i--)
        if(unused.has(operators[i]))operators.splice(i,1);
    }
  }else operators.filter(a=>a.side==='red').forEach((a,i)=>{
    const pos=sample.spots[i];a.p={x:pos.x,y:pos.y};a.heading=pos.h;
    const issued=enemyKitForEncounter(undefined,index,i);
    a.weapon=issued.weapon;a.weaponConfiguration=issued.weaponConfiguration;
    a.equipment=issued.equipment;a.wardrobe=issued.wardrobe;
    a.appearanceSeed=issued.appearanceSeed;
    a.armorIntegrity=issued.armorIntegrity;
    a.helmetIntegrity=issued.helmetIntegrity;
    const issueRounds=freshMagazineIssue(a.id,a.weapon,a.weaponConfiguration);
    a.health=2;a.magazine=issueRounds.magazine;
    a.reserve=issueRounds.reserve;a.weaponYaw=a.heading;
    a.insertedMagazineId=issueRounds.loadedMagazineId;
    a.spareMagazines=issueRounds.magazines;
  });
  // The base tactical study carries two legacy defenders. An explicit
  // training site must remove them rather than spawning hostile AI off-map.
  if(site?.training){
    for(let i=operators.length-1;i>=0;i--)
      if(operators[i].side==='red')operators.splice(i,1);
  }
  // Civilian activation is an explicit session policy. The current UI opts
  // in by default, while old tests/replays and ?civilians=0 stay empty.
  const civilians=encounterContext.enableCivilians?
    (site?.encounter?.neutrals??[]).map(createCivilian):[];
  if(site)for(const person of civilians)
    person.refugePoints=civilianRefugePoints(site,person);
  const state:Session={...seed,operators,civilians,
    civilianHarmEvents:[],objectRevision:0,
    coverState:COVER.map(o=>({...o,material:materialForFixture(o.fixture),
      integrity:MATERIALS[materialForFixture(o.fixture)].integrity})),
    windows:initializeWindows(site?.windows??[]),
    passageLeases:{},squadEntryUndo:null,squadEntryRedo:null,
    doors:initialDoors().map((d,i)=>initDoor({
      ...d,locked:d.locked??!!(site&&i>2&&i%7===0&&
        d.kind!=='shutter'&&d.id!=='FRONT')},i)),variant,nextId:1,
    scenario:{index:variant,name:site?.name??sample.name,
      objective:clone(site?.objective??OBJECTIVE),
      extract:clone(site?.extract??EXTRACTION)},
    mission:'clear',noise:[],nextNoiseId:1,reports:[],nextReportId:1,shots:[],casings:[],nextShotId:1,known:new Map(),
    seenGround:new Set(),seenGroundRevision:0,
    intel:initialIntel(intelMode,site,initialDoors()),
    intelObservedAt:-1,timesPaused:0,deaths:0,started:false,
    syncCode:0,report:[],movementNoiseAt:0,site,lightingMode:'day',
    dropped:[],grenades:[],flashBursts:[],flashRemaining:2,nextEffectId:1,
    impactMarks:[],battleEvents:[],nextBattleId:1,
    executionEvents:[],nextExecutionId:1,
    missionType:missionOverride??(site?(['clear','intel','rescue','hold','capture'] as const)[site.seed%5]:'clear'),
    holdTime:0,rescue:null,captureTarget:null,captureSecured:false,
    intelCarrierId:null};
  if(state.missionType==='capture'){
    // Respect the mission-specific target role from the actual encounter.
    // Fallback to the legacy first defender for older saved/practice maps.
    const targetIndex=site?.encounter?.actors.findIndex(a=>a.role==='target')??-1;
    const fighters=operators.filter(a=>a.side==='red');
    const target=targetIndex>=0?fighters[targetIndex]:fighters[0];
    state.captureTarget=target?.id??null;
    if(target)state.scenario.objective=clone(target.p);
  }
  if(state.missionType==='rescue'){
    // The developer-gated migration creates ONE authoritative rescued
    // person. Ordinary gameplay keeps the legacy escort until N4 release.
    if(encounterContext.enableCivilians&&site){
      const point=state.scenario.objective;
      const room=site.rooms.find(r=>r.kind==='room'&&
        point.x>=r.x&&point.x<=r.x+r.w&&
        point.y>=r.y&&point.y<=r.y+r.h);
      state.civilians.push(createCivilian({
        id:'civ:rescue:'+site.seed,role:'rescue',persona:'cautious',
        activity:'waiting',position:clone(point),heading:0,
        roomId:room?.id??'objective',
        zoneId:room?.zoneId??room?.id,
        appearanceSeed:site.seed^0x57eb,
        isRescueTarget:true
      }));
    }
    state.rescue={p:clone(state.scenario.objective),following:null,trail:[]};
  }
  if(state.missionType==='intel'||state.missionType==='rescue'||
     state.missionType==='hold')state.mission='secure';
  COVER.splice(0,COVER.length,...state.coverState);
  registerSessionWorldGeometry(state);
  setPresentationWorldSession(state);
  bindIntelWorld(state.intel,sessionWorldGeometry(state));
  return state;
}
