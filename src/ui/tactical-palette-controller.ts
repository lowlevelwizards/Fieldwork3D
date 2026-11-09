/** Contextual command palette presentation and spatial placement.
 * Receives read-only, already-authorized action descriptors. NEVER validates,
 * queues or executes tactical commands. Both layouts share one DOM dispatcher.
 */
import {doorCenter,type Door,type Pt} from '../breach-core.ts';
import {team,enemies,isSeen,type Session,type TeamActor} from '../breach-game.ts';
import {finalPoint} from '../breach-game.ts';
import {placeContextMenu,type AvoidRect,type ScreenPath,type MenuSide}
  from '../breach-context-placement.ts';
import {PaletteMotion} from './palette-motion.ts';
import {contextActionChoices,type ContextAction,type ContextOptions}
  from './context-actions.ts';
import {installPalettePointerGuard} from './palette-pointer-guard.ts';

export function availablePaletteActions(watchSelected:boolean,options:ContextOptions):ContextAction[]{
  return watchSelected?[
    {id:'ctxWatch',label:'RETARGET',group:'primary',pressed:true,
      title:'Choose a new point for this active WATCH'},
    {id:'ctxDelete',label:'DELETE WATCH',group:'destructive',
      title:'Stop tracking this point; leave movement orders unchanged'}
  ]:contextActionChoices(options);
}

export type PaletteContext={
  state:Session;actor:TeamActor;selected:string;
  node:TeamActor['plan'][number]|undefined;
  selectedWatch:Pt|null;door:Door|undefined;
  actions:readonly ContextAction[];
  width:number;height:number;lastAuthoringAt:number;
};
export function createTacticalPaletteController(config:{
  context:HTMLElement;quickStates:HTMLElement;tacticalHud:HTMLElement;
  play:HTMLElement;briefingPanel:HTMLElement;siteSettings:HTMLElement;
  hint:HTMLElement;feed:HTMLElement;
  worldToScreen:(p:Pt,z:number)=>Pt;
  routePoints:(a:Pt,b:Pt)=>readonly Pt[];
  iconFor:(id:string,label:string)=>string;
  makeIcon:(id:string)=>SVGSVGElement;
  installHelp:(button:HTMLButtonElement)=>void;
  onLayoutChange?:()=>void;
}){
  const {context}=config;
  const FLOAT_PREF='fieldwork3d.ui.contextLayout';
  let placement:'dock'|'floating'='dock';
  try{placement=localStorage.getItem(FLOAT_PREF)==='floating'?
    'floating':'dock';}catch{/* Optional preference. */}
  const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>(
    '[data-context-layout]'));
  const motion=new PaletteMotion();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const heldPointers=installPalettePointerGuard(context).active;
  const tether=document.createElement('div');
  tether.id='contextTether';
  tether.setAttribute('aria-hidden','true');
  tether.hidden=true;
  document.body.append(tether);
  let contextSignature='',actionSignature='',lastPlacementKey='';
  let lastSide:MenuSide|null=null;
  let paletteWidth=0,paletteHeight=0,tetherBrightUntil=0;
  let exiting:Animation|null=null;
  context.dataset.layout='dock';
  config.tacticalHud.insertBefore(context,config.quickStates);
  function syncLayoutButtons(){
    for(const button of buttons)
      button.setAttribute('aria-pressed',
        String(button.dataset.contextLayout===placement));
  }
  function setPresentation(mode:'dock'|'floating'){
    if(context.dataset.layout===mode)return;
    exiting?.cancel();exiting=null;motion.hide();tether.hidden=true;
    context.dataset.layout=mode;
    if(mode==='dock')config.tacticalHud.insertBefore(context,config.quickStates);
    else document.body.append(context);
    context.style.transform='';
    actionSignature='';lastPlacementKey='';
    paletteWidth=0;paletteHeight=0;
  }
  syncLayoutButtons();
  for(const button of buttons)button.addEventListener('click',()=>{
    const next=button.dataset.contextLayout==='floating'?'floating':'dock';
    if(next===placement)return;
    placement=next;
    try{localStorage.setItem(FLOAT_PREF,next);}catch{}
    syncLayoutButtons();
    config.onLayoutChange?.();
  });
  const availableActions=availablePaletteActions;
  function invalidate(){
    contextSignature='';actionSignature='';lastPlacementKey='';
  }
  function hide(){
    lastPlacementKey='';
    const exclusive=!config.siteSettings.hidden||!config.briefingPanel.hidden;
    if(placement!=='floating'||!motion.active){
      exiting?.cancel();exiting=null;motion.hide();tether.hidden=true;
      context.hidden=true;context.style.pointerEvents='none';
      return;
    }
    motion.hide();tether.hidden=true;context.style.pointerEvents='none';
    if(reduced.matches||exclusive){
      exiting?.cancel();exiting=null;context.hidden=true;return;
    }
    exiting?.cancel();
    exiting=context.animate([{opacity:1,scale:1},{opacity:0,scale:.96}],
      {duration:115,easing:'ease-in',fill:'forwards'});
    const exit=exiting;
    exit.onfinish=()=>{
      if(!motion.active){context.hidden=true;exit.cancel();}
      if(exiting===exit)exiting=null;
    };
  }
  function advance(dt:number){
    if(context.hidden||!motion.active){tether.hidden=true;return;}
    motion.step(dt,reduced.matches);
    const x=motion.x.position,y=motion.y.position;
    context.style.transform='translate3d('+x.toFixed(2)+'px,'+
      y.toFixed(2)+'px,0)';
    const ax=motion.anchorX,ay=motion.anchorY;
    const bx=Math.max(x,Math.min(ax,x+paletteWidth));
    const by=Math.max(y,Math.min(ay,y+paletteHeight));
    const dx=bx-ax,dy=by-ay,length=Math.hypot(dx,dy);
    const visible=context.dataset.layout==='floating'&&length>24&&!reduced.matches;
    tether.hidden=!visible;
    if(visible){
      const short=length>390,segment=short?45:length;
      const vx=dx/length,vy=dy/length;
      const sx=short?bx-vx*segment:ax,sy=short?by-vy*segment:ay;
      tether.style.left=sx+'px';tether.style.top=sy+'px';
      tether.style.width=segment+'px';
      tether.style.opacity=performance.now()<tetherBrightUntil?'.75':
        length>390?'.32':length>210?'.22':'.43';
      tether.style.transform='rotate('+Math.atan2(dy,dx)+'rad)';
    }
  }
  function show({
    state,actor:a,selected,node,selectedWatch,door,
    actions,width:cssW,height:cssH,lastAuthoringAt
  }:PaletteContext){
    const paletteChoices=actions.filter(choice=>choice.group!=='state');
    setPresentation(placement);
    const identity=(door?'door:'+door.id:node?'node:'+node.id:
      selectedWatch?'active-watch':'here')+'/'+selected;
    const changed=contextSignature!==identity;
    if(changed){
      actionSignature='';contextSignature=identity;
      context.replaceChildren();
      const heading=document.createElement('div');
      heading.className='fw-context-heading';
      heading.setAttribute('aria-live','off');
      context.append(heading);
      const primary=document.createElement('div');primary.className='context-primary';
      const secondary=document.createElement('div');secondary.className='context-state';
      const destructive=document.createElement('div');destructive.className='context-danger';
      context.append(primary,secondary,destructive);
    }
    const heading=context.querySelector<HTMLElement>('.fw-context-heading');
    if(heading){
      const index=node?a.plan.findIndex(n=>n.id===node.id)+1:0;
      const title=door?'DOOR · '+(door.open?'OPEN':'CLOSED'):
        node?'WAYPOINT '+String(index).padStart(2,'0'):
        selectedWatch?'WATCH TARGET':'OPERATOR / HERE';
      const scope=door?'Door interactions':
        node?'Orders queued at this waypoint':
        selectedWatch?'Drag the ring to reposition or DELETE WATCH to release':
        'Orders for the selected operator';
      const label=a.name.toUpperCase()+' · '+title;
      if(heading.textContent!==label)heading.textContent=label;
      heading.title=scope;
    }
    const signature=placement+'/'+identity+'/'+paletteChoices.map(c=>
      c.id+':'+c.label+':'+c.group+':'+!!c.disabled+':'+!!c.pressed).join('|');
    const actionsChanged=actionSignature!==signature;
    if(actionsChanged){
      actionSignature=signature;
      const buckets:Record<string,HTMLElement>={
        primary:context.querySelector<HTMLElement>('.context-primary')!,
        state:context.querySelector<HTMLElement>('.context-state')!,
        destructive:context.querySelector<HTMLElement>('.context-danger')!
      };
      const wanted=new Set<string>();
      for(const choice of paletteChoices){
        wanted.add(choice.id);
        let button=context.querySelector<HTMLButtonElement>(
          'button[data-action="'+choice.id+'"]');
        if(!button){
          button=document.createElement('button');
          button.type='button';button.dataset.action=choice.id;
        }
        const icon=config.iconFor(choice.id,choice.label);
        if(button.dataset.icon!==icon){
          button.querySelector('.ui-icon')?.remove();
          button.prepend(config.makeIcon(icon));button.dataset.icon=icon;
        }
        let label=button.querySelector<HTMLElement>('.command-label');
        if(!label){
          label=document.createElement('span');
          label.className='command-label';button.append(label);
        }
        if(label.textContent!==choice.label)label.textContent=choice.label;
        button.setAttribute('aria-label',choice.label);
        button.title=choice.title??choice.label;
        config.installHelp(button);
        button.disabled=!!choice.disabled;
        if(choice.pressed===undefined)button.removeAttribute('aria-pressed');
        else button.setAttribute('aria-pressed',String(choice.pressed));
        button.classList.toggle('danger',choice.group==='destructive');
        const destination=placement==='floating'?
          buckets[choice.group==='advanced'?'primary':choice.group]:
          buckets.primary;
        destination.append(button);
      }
      for(const button of context.querySelectorAll<HTMLButtonElement>(
        'button[data-action]')){
        if(!wanted.has(button.dataset.action??''))button.remove();
      }
      buckets.state.hidden=!buckets.state.childElementCount;
      buckets.destructive.hidden=!buckets.destructive.childElementCount;
      context.classList.toggle('door-menu',!!door);
    }
    if(exiting){exiting.cancel();exiting=null;}
    context.hidden=false;context.style.pointerEvents='auto';
    if(changed&&!reduced.matches)
      context.animate([{opacity:.78,scale:.96},{opacity:1,scale:1}],
        {duration:160,easing:'cubic-bezier(.2,.8,.2,1)'});
    context.dataset.door=door?.id??'';
    context.setAttribute('aria-label',door?'Door actions':
      'Selected position actions and operator settings');
    if(placement==='dock'){
      motion.hide();tether.hidden=true;context.style.transform='';
      return;
    }
    const target=door?doorCenter(door):node?.p??selectedWatch??a.p;
    const anchor=config.worldToScreen(target,door?15:node?8:selectedWatch?12:24);
    const measure=changed||actionsChanged||paletteWidth<=0||paletteHeight<=0;
    if(measure){paletteWidth=context.offsetWidth;paletteHeight=context.offsetHeight;}
    const w=paletteWidth,h=paletteHeight;
    const header=document.querySelector<HTMLElement>('.top');
    const nav=document.querySelector<HTMLElement>('.bar');
    const minY=Math.max(8,(header?.getBoundingClientRect().bottom??62)+8);
    const hudTop=!config.quickStates.hidden?
      config.quickStates.getBoundingClientRect().top:
      (nav?.getBoundingClientRect().top??config.play.getBoundingClientRect().top);
    const maxY=Math.max(minY+h,hudTop-10);
    const screen=config.worldToScreen;
    const unitKey=team(state).map(unit=>{
      const point=screen(unit.p,8);
      return unit.id+':'+Math.round(point.x/6)+','+Math.round(point.y/6)+
        ':'+unit.plan.map(n=>Math.round(n.p.x/3)+','+
        Math.round(n.p.y/3)+','+n.kind).join(';');
    }).join('|');
    const placementKey=[identity,signature,Math.round(anchor.x/6),
      Math.round(anchor.y/6),Math.round(cssW),Math.round(cssH),
      Math.round(minY/3),Math.round(maxY/3),w,h,unitKey].join('|');
    if(motion.active&&!changed&&!actionsChanged&&
       (heldPointers.size>0||placementKey===lastPlacementKey))return;
    lastPlacementKey=placementKey;
    const avoid:AvoidRect[]=[{x:anchor.x-38,y:anchor.y-38,
      w:76,h:76,weight:3}];
    for(const unit of team(state)){
      const feet=screen(unit.p,0),head=screen(unit.p,30);
      avoid.push({x:Math.min(feet.x,head.x)-29,
        y:Math.min(feet.y,head.y)-17,
        w:Math.abs(head.x-feet.x)+58,
        h:Math.abs(head.y-feet.y)+34,weight:3});
    }
    // Displayable enemies only; never reveal unseen positions via the menu.
    for(const hostile of enemies(state)){
      if(hostile.health<=0||!isSeen(state,hostile))continue;
      const p=screen(hostile.p,20);
      avoid.push({x:p.x-31,y:p.y-38,w:62,h:76,weight:4});
    }
    const paths:ScreenPath[]=[];
    for(const friendly of team(state)){
      let previous=friendly.p;
      for(const waypoint of friendly.plan){
        if(waypoint.kind==='move'||waypoint.kind==='door'){
          let segmentStart=previous;
          for(const point of config.routePoints(previous,waypoint.p)){
            paths.push({a:screen(segmentStart,8),b:screen(point,8)});
            segmentStart=point;
          }
          previous=waypoint.p;
        }
        const p=screen(waypoint.p,8);
        avoid.push({x:p.x-19,y:p.y-19,w:38,h:38,
          weight:friendly.id===selected?2:1.3});
      }
    }
    for(const overlay of [config.hint,config.feed]){
      if(overlay.hidden||!overlay.getClientRects().length)continue;
      const r=overlay.getBoundingClientRect();
      avoid.push({x:r.left-7,y:r.top-7,w:r.width+14,h:r.height+14});
    }
    const activeEditing=performance.now()-lastAuthoringAt<1150;
    const radius=cssW<=600?(activeEditing?148:118):100;
    const actorPoint=screen(a.p,8);
    const lastPoint=screen(finalPoint(a),8);
    const editingZones=[
      {x:anchor.x-radius,y:anchor.y-radius,w:radius*2,h:radius*2},
      {x:lastPoint.x-90,y:lastPoint.y-90,w:180,h:180},
      {x:actorPoint.x-75,y:actorPoint.y-75,w:150,h:150}
    ];
    const vx=lastPoint.x-actorPoint.x,vy=lastPoint.y-actorPoint.y;
    const length=Math.hypot(vx,vy);
    const dir=length>35?{x:vx/length,y:vy/length}:{x:0,y:-1};
    const corridor={a:anchor,b:{
      x:anchor.x+dir.x*(activeEditing?245:190),
      y:anchor.y+dir.y*(activeEditing?245:190)}};
    const result=placeContextMenu({
      anchor,width:w,height:h,viewportWidth:cssW,
      top:minY,bottom:maxY,avoid,paths,preferredSide:lastSide,
      authoring:editingZones,corridor,
      minClearance:cssW<=600?(activeEditing?142:112):100,
      preferredPosition:motion.active?
        {x:motion.targetX,y:motion.targetY}:null
    });
    lastSide=result.side;
    motion.set(result.x,result.y,anchor.x,anchor.y);
  }
  return {
    hide,show,advance,heldPointers,availableActions,invalidate,
    get tether(){return tether;},
    get placement(){return placement;},
    get active(){return motion.active;},
    get reducedMotion(){return reduced.matches;},
    get brightUntil(){return tetherBrightUntil;},
    set brightUntil(value:number){tetherBrightUntil=value;}
  };
}
