import {uiNode as node,uiButton as button} from '../dom-elements.ts';
/** One landing mount; local subpage navigation retains the initiating control. */
export function createCampaignLandingNavigation(){
  const main=node('main','campaign-shell campaign-landing');
  main.setAttribute('aria-label','Fieldwork main menu');
  const subpage=node('section','campaign-shell campaign-landing campaign-landing-subpage');
  subpage.setAttribute('aria-label','Menu details');
  subpage.hidden=true;
  // Escape reverses local menu navigation without leaving the current game.
  subpage.addEventListener('keydown',event=>{
   if(event.key!=='Escape')return;
   const back=subpage.querySelector<HTMLButtonElement>('.campaign-landing-back');
   if(!back)return;
   event.preventDefault();back.click();
  });
  const showSubpage=(title:string,lead:string,trigger:HTMLElement,
   populate:(target:HTMLElement)=>void)=>{
   const back=button('BACK',()=>{subpage.hidden=true;main.hidden=false;
    trigger.focus({preventScroll:true});},'campaign-landing-back');
   const head=node('header','campaign-landing-subhead');
   head.append(back,node('h2','',title),node('p','',lead));
   const content=node('div','campaign-landing-subcontent');
   populate(content);
   subpage.replaceChildren(head,content);
   main.hidden=true;subpage.hidden=false;
   back.focus({preventScroll:true});
  };
  const option=(title:string,detail:string,action:()=>void)=>{
   const item=button('',action,'campaign-landing-option');
   item.append(node('strong','',title),node('span','',detail));
   item.setAttribute('aria-label',title+' — '+detail);
   return item;
  };
 return {main,subpage,showSubpage,option};
}
