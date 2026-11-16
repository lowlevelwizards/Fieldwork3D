/** P1: bounded, local photographic stills. No replay archives or base64
 * blobs live here; records are separate from lightweight gallery metadata. */
export type PhotoMetadata={
 id:string;createdAt:number;site:string;source:'live'|'replay';
 at:number;lens:string;filter:string;ratio:string;
 width:number;height:number;bytes:number;
};
export type PhotoStored={meta:PhotoMetadata;image:Blob;thumbnail:Blob};
type PhotoIndex=PhotoMetadata&{thumbnail:Blob};
export const PHOTO_LIBRARY_LIMIT=60;
const DB='fieldwork-photo-library',VERSION=1,IMAGES='images',INDEX='index';
const maxImageBytes=12*1024*1024;
const request=<T>(r:IDBRequest<T>)=>new Promise<T>((resolve,reject)=>{
 r.onsuccess=()=>resolve(r.result);
 r.onerror=()=>reject(r.error??Error('Photo library request failed'));
});
const done=(tx:IDBTransaction)=>new Promise<void>((resolve,reject)=>{
 tx.oncomplete=()=>resolve();
 tx.onabort=()=>reject(tx.error??Error('Photo library transaction aborted'));
 tx.onerror=()=>reject(tx.error??Error('Photo library transaction failed'));
});
async function database():Promise<IDBDatabase>{
 if(typeof indexedDB==='undefined')throw Error('LOCAL PHOTO STORAGE IS UNAVAILABLE');
 return new Promise((resolve,reject)=>{
  const open=indexedDB.open(DB,VERSION);
  open.onupgradeneeded=()=>{
   const db=open.result;
   if(!db.objectStoreNames.contains(IMAGES))db.createObjectStore(IMAGES,{keyPath:'id'});
   if(!db.objectStoreNames.contains(INDEX))db.createObjectStore(INDEX,{keyPath:'id'});
  };
  open.onsuccess=()=>resolve(open.result);
  open.onerror=()=>reject(open.error??Error('Could not open photo library'));
  open.onblocked=()=>reject(Error('Photo library is open in another tab'));
 });
}
export async function listPhotos():Promise<PhotoMetadata[]>{
 const db=await database();
 try{
  const tx=db.transaction(INDEX,'readonly'),end=done(tx);
  const items=await request(tx.objectStore(INDEX).getAll() as IDBRequest<PhotoIndex[]>);
  await end;return items.map(row=>{
   const meta={...row};delete (meta as Partial<PhotoIndex>).thumbnail;
   return meta as PhotoMetadata;
  }).sort((a,b)=>b.createdAt-a.createdAt);
 }finally{db.close();}
}
export async function readPhotoThumbnail(id:string):Promise<Blob|null>{
 const db=await database();
 try{
  const tx=db.transaction(INDEX,'readonly'),end=done(tx);
  const item=await request(tx.objectStore(INDEX).get(id) as IDBRequest<PhotoIndex|undefined>);
  await end;return item?.thumbnail??null;
 }finally{db.close();}
}
export async function readPhoto(id:string):Promise<PhotoStored|null>{
 const db=await database();
 try{
  const tx=db.transaction(IMAGES,'readonly'),end=done(tx);
  const item=await request(tx.objectStore(IMAGES).get(id) as IDBRequest<
    (PhotoStored&{id:string})|undefined>);
  await end;return item??null;
 }finally{db.close();}
}
export async function savePhoto(photo:PhotoStored):Promise<void>{
 if(photo.image.size<512||photo.image.size>maxImageBytes||
  photo.thumbnail.size>512_000||photo.meta.bytes!==photo.image.size)
  throw Error('PHOTO FILE SIZE IS INVALID');
 const db=await database();
 try{
  // Explicit count first; never silently evict user's photos.
  const tx=db.transaction([IMAGES,INDEX],'readwrite'),end=done(tx);
  const index=tx.objectStore(INDEX);
  const count=await request(index.count());
  const existing=await request(index.get(photo.meta.id));
  if(count>=PHOTO_LIBRARY_LIMIT&&!existing){
   tx.abort();try{await end;}catch{}
   throw Error('PHOTO LIBRARY FULL — EXPORT OR DELETE PHOTOS');
  }
  index.put({...photo.meta,thumbnail:photo.thumbnail});
  tx.objectStore(IMAGES).put({...photo,id:photo.meta.id});
  await end;
 }catch(error){
  if(error instanceof DOMException&&
   (error.name==='QuotaExceededError'||error.name==='UnknownError'))
   throw Error('DEVICE PHOTO STORAGE IS FULL');
  throw error;
 }finally{db.close();}
}
export async function deletePhoto(id:string):Promise<void>{
 const db=await database();
 try{
  const tx=db.transaction([IMAGES,INDEX],'readwrite'),end=done(tx);
  tx.objectStore(INDEX).delete(id);tx.objectStore(IMAGES).delete(id);
  await end;
 }finally{db.close();}
}
export async function makePhotoThumbnail(image:Blob):Promise<Blob>{
 let bitmap:ImageBitmap|null=null;
 let fallback:HTMLImageElement|null=null;
 let url:string|null=null;
 if(typeof createImageBitmap==='function')bitmap=await createImageBitmap(image);
 else{
  url=URL.createObjectURL(image);fallback=new Image();fallback.src=url;
  await new Promise<void>((resolve,reject)=>{
   fallback!.onload=()=>resolve();fallback!.onerror=()=>reject(Error('PHOTO DECODE FAILED'));
  });
 }
 try{
  const source=bitmap??fallback!;
  const factor=Math.min(1,280/Math.max(source.width,source.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(source.width*factor));
  canvas.height=Math.max(1,Math.round(source.height*factor));
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('PHOTO THUMBNAIL IS UNAVAILABLE');
  ctx.drawImage(source,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',.72));
  canvas.width=0;canvas.height=0;
  if(!blob)throw Error('PHOTO THUMBNAIL FAILED');
  return blob;
 }finally{bitmap?.close();if(url)URL.revokeObjectURL(url);if(fallback)fallback.src='';}
}
