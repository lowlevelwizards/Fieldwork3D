/** Minimal shared DOM factories for Campaign, Quick Play and Outfitter.
 * Do not own state, layout, focus, inventory or tactical behavior.
 */
export function uiNode<K extends keyof HTMLElementTagNameMap>(
 tag:K,cls='',label=''
):HTMLElementTagNameMap[K]{
 const element=document.createElement(tag);
 if(cls)element.className=cls;
 if(label)element.textContent=label;
 return element;
}
export function uiButton(label:string,onClick:()=>void,cls=''):HTMLButtonElement{
 const button=uiNode('button',cls,label);
 button.type='button';
 button.addEventListener('click',onClick);
 return button;
}
