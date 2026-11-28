import {mountArsenalGallery} from './gallery-main.ts';
const root=document.getElementById('arsenalRoot');
if(!root)throw new Error('Missing Arsenal root');
mountArsenalGallery(root);
