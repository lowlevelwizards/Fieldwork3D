/** Replay R3: chapters derived only from disclosed immutable events.
 * Never invent encounters or inspect the live AI when indexing a replay.
 */
export type ReplayChapterEvent={t:number;kind:string};
export type ReplayChapter={
  t:number;kind:string;label:string;weight:number
};
export type ReplayBookmark={id:string;t:number;label:string};
const chapterKind=(kind:string):{label:string;weight:number}|null=>{
  switch(kind){
    case 'intel':return {label:'CONTACT',weight:4};
    case 'door':return {label:'DOOR ACTION',weight:2};
    case 'shot':return {label:'GUNFIRE',weight:3};
    case 'wound':return {label:'CASUALTY',weight:6};
    case 'down':return {label:'DOWN',weight:7};
    case 'flash':return {label:'FLASHBANG',weight:5};
    case 'objective':return {label:'OBJECTIVE',weight:7};
    case 'surrender':return {label:'SURRENDER',weight:5};
    case 'blocked':return {label:'MOVEMENT BLOCKED',weight:2};
    default:return null;
  }
};
export function buildReplayChapters(
  events:readonly ReplayChapterEvent[],duration:number,max=24
):ReplayChapter[]{
  if(!Number.isFinite(duration)||duration<=0)return [];
  const chapters:ReplayChapter[]=[
    {t:0,kind:'start',label:'MISSION START',weight:9}
  ];
  const candidates=events.slice()
    .filter(e=>Number.isFinite(e.t)&&e.t>=0&&e.t<=duration)
    .sort((a,b)=>a.t-b.t);
  for(const e of candidates){
    const category=chapterKind(e.kind);
    if(!category)continue;
    const last=chapters.at(-1)!;
    if(e.t-last.t<5){
      // An important incident replaces a lesser event within one chapter;
      // the explicit beginning marker is always preserved.
      if(last.kind!=='start'&&category.weight>last.weight){
        last.kind=e.kind;last.label=category.label;last.weight=category.weight;
      }
      continue;
    }
    chapters.push({t:e.t,kind:e.kind,...category});
    if(chapters.length>=max)break;
  }
  return chapters;
}
export function addReplayBookmark(
  previous:readonly ReplayBookmark[],t:number,duration:number,id:string,
  label:string):ReplayBookmark[]{
  if(!Number.isFinite(t)||!Number.isFinite(duration)||duration<0||
    !id.trim())return [...previous];
  const value={id,t:Math.max(0,Math.min(t,duration)),
    label:(label.trim()||'BOOKMARK').slice(0,55)};
  return [...previous.filter(b=>b.id!==id),value]
    .sort((a,b)=>a.t-b.t).slice(-30);
}
export function adjacentReplayChapter(
  chapters:readonly ReplayChapter[],time:number,forward:boolean
):ReplayChapter|null{
  if(forward)return chapters.find(c=>c.t>time+.1)??null;
  for(let i=chapters.length-1;i>=0;i--)
    if(chapters[i].t<time-.1)return chapters[i];
  return null;
}
