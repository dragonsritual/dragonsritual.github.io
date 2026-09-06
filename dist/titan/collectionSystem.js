const SAVE_KEY="projectTitanCollections_v1";

function loadSave(){
 try{
   const parsed=JSON.parse(localStorage.getItem(SAVE_KEY)||"{}");
   return {posters:Array.isArray(parsed.posters)?parsed.posters:[]};
 }catch{
   return {posters:[]};
 }
}

export class CollectionSystem{
 constructor({onClose=null}={}){
   this.onClose=onClose;
   this.state=loadSave();
   this.overlay=document.getElementById("collectionOverlay");
   this.grid=document.getElementById("posterCollectionGrid");
   this.count=document.getElementById("posterCollectionCount");
   this.toast=document.getElementById("collectionToast");
   this.preview=document.getElementById("posterPreview");
   this.previewImage=document.getElementById("posterPreviewImage");
   this.previewTitle=document.getElementById("posterPreviewTitle");
   this.registry=new Map();
   this.toastTimer=null;

   this.overlay?.addEventListener("mousedown",e=>e.stopPropagation());
   this.overlay?.addEventListener("pointerdown",e=>e.stopPropagation());
   document.getElementById("collectionClose")?.addEventListener("click",()=>this.close());
   this.overlay?.addEventListener("click",e=>{
     if(e.target===this.overlay)this.close();
   });
   this.preview?.addEventListener("click",e=>{
     if(e.target===this.preview || e.target.closest("[data-close-preview]")){
       this.preview.classList.remove("visible");
     }
   });
 }

 registerPosters(posters=[]){
   for(const p of posters){
     const meta=p?.userData?.collectiblePoster;
     if(!meta?.id)continue;
     this.registry.set(meta.id,{object:p,...meta});

     if(this.state.posters.includes(meta.id)){
       p.visible=false;
     }
   }
   this.render();
 }

 hasPoster(id){
   return this.state.posters.includes(id);
 }

 collectPoster(poster){
   const meta=poster?.userData?.collectiblePoster;
   if(!meta?.id)return false;
   if(this.hasPoster(meta.id)){
     poster.visible=false;
     return false;
   }

   this.state.posters.push(meta.id);
   localStorage.setItem(SAVE_KEY,JSON.stringify(this.state));
   poster.visible=false;
   this.showToast(`POSTER ADDED // ${meta.title||meta.id}`);
   this.render();
   return true;
 }

 showToast(text){
   if(!this.toast)return;
   this.toast.textContent=text;
   this.toast.classList.add("visible");
   clearTimeout(this.toastTimer);
   this.toastTimer=setTimeout(()=>this.toast.classList.remove("visible"),2200);
 }

 toggle(){
   this.overlay?.classList.contains("visible") ? this.close() : this.open();
 }

 open(){
   if(!this.overlay)return;
   this.render();
   this.overlay.classList.add("visible");
   document.exitPointerLock?.();
 }

 close(){
   const wasOpen=!!this.overlay?.classList.contains("visible");
   this.overlay?.classList.remove("visible");
   this.preview?.classList.remove("visible");
   if(wasOpen)this.onClose?.();
 }

 render(){
   if(this.count)this.count.textContent=`${this.state.posters.length} COLLECTED`;
   if(!this.grid)return;
   this.grid.innerHTML="";

   if(!this.state.posters.length){
     const empty=document.createElement("div");
     empty.className="poster-collection-empty";
     empty.textContent="NO POSTERS COLLECTED // FIND THEM IN NIGHT DISTRICT";
     this.grid.appendChild(empty);
     return;
   }

   for(const id of this.state.posters){
     const item=this.registry.get(id);
     const card=document.createElement("button");
     card.className="poster-collection-card";

     const img=document.createElement("img");
     img.src=item?.preview||"";
     img.alt=item?.title||id;
     img.loading="lazy";

     const label=document.createElement("span");
     label.textContent=item?.title||id;

     card.append(img,label);
     card.addEventListener("click",()=>{
       if(!item?.preview)return;
       this.previewImage.src=item.preview;
       this.previewTitle.textContent=item.title||id;
       this.preview.classList.add("visible");
     });
     this.grid.appendChild(card);
   }
 }
}
