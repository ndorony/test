// Developer-only bake; uses the application's existing Three.js version.
// Run with bundled Playwright on NODE_PATH and local server on :8767.
const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const root=path.join(__dirname,'../assets/hexkeep');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:8767/assets/hexkeep/LICENSE.txt');
  await page.addScriptTag({url:'https://unpkg.com/three@0.128.0/build/three.min.js'});
  await page.addScriptTag({url:'https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js'});
  await page.addScriptTag({url:'/games/hexkeep-map.js'});
  const result=await page.evaluate(async()=>{
   const T=THREE, loader=new T.GLTFLoader(),models={};
   const aliases=Object.keys((await (await fetch('/assets/hexkeep/provenance.json')).json()).models);
   for(const key of aliases) models[key]=(await loader.loadAsync('/assets/hexkeep/source/'+key+'.gltf')).scene;
   const knight=await loader.loadAsync('/assets/models/duel/Knight.glb');models.knight=knight.scene;
   const enemy=await loader.loadAsync('/assets/models/duel/Skeleton_Minion.glb');models.enemy=enemy.scene;
   for(const asset of [knight,enemy]){if(asset.animations.length){const mixer=new T.AnimationMixer(asset.scene);mixer.clipAction(asset.animations.find(a=>/idle/i.test(a.name))||asset.animations[0]).play();mixer.update(.1);}asset.scene.updateMatrixWorld(true);}

   models.knight.scale.setScalar(.36);models.enemy.scale.setScalar(.38);
   const dims={}; for(const key of aliases){const b=new T.Box3().setFromObject(models[key]);dims[key]={min:b.min.toArray(),max:b.max.toArray()};}
   const renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
   renderer.setSize(1600,900);renderer.outputEncoding=T.sRGBEncoding;
   renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
   renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
   const camera=new T.OrthographicCamera(-10.7,10.7,6.019,-6.019,.1,100);
   camera.position.set(8,13,18);camera.lookAt(0,0,0);camera.updateMatrixWorld();
   const project=(x,y,z)=>{const v=new T.Vector3(x,y,z).project(camera);return {x:(v.x+1)*50,y:(1-v.y)*50};};
   const scene=new T.Scene();scene.add(new T.HemisphereLight(0xfff5de,0x536e68,.85));
   const sun=new T.DirectionalLight(0xffefce,1.3);sun.position.set(-8,16,7);sun.castShadow=true;
   Object.assign(sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:1,far:50});sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0008;scene.add(sun);
   function add(key,x,z,rotation=0,scale=1,y=0){const m=(key==='knight'||key==='enemy')?models[key]:models[key].clone(true);m.position.set(x,y,z);m.rotation.y=rotation;m.scale.multiplyScalar(scale);m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(m);return m;}
   const map=HEXKEEP_MAP;
   for(const t of map.apron){const w=map.cellWorld(t);let key=t.role==='river'?'riverA':t.role==='road'?'roadA':'grass';const tile=add(key,w.x,w.z,t.role==='river'?Math.PI/3:0);tile.scale.y=.48;tile.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color.setHex(0x729e72);}});if(t.role==='forest')add(Math.abs(t.c+t.r)%2?'tree':'broadleaf',w.x,w.z,(t.c%3)*Math.PI/3,1.05+Math.abs(t.r%3)*.13);}
   const anchors=map.tiles.map(t=>{const w=map.world(t.id);return project(w.x,0,w.z);});
   function road(id){const i=map.path.indexOf(id),p=map.world(id);const prev=i?map.world(map.path[i-1]):{x:p.x-2,z:p.z};const next=i<map.path.length-1?map.world(map.path[i+1]):map.world(map.village);
    const angles=[prev,next].map(n=>(Math.round(Math.atan2(-(n.z-p.z),n.x-p.x)*3/Math.PI)+6)%6).sort();
    for(const [key,dirs]of [['roadA',[0,3]],['roadB',[1,3]],['roadC',[2,3]]])for(let rot=0;rot<6;rot++)if(dirs.map(v=>(v+rot)%6).sort().join()==angles.join())return {key,rot:rot*Math.PI/3};
    throw Error('Disconnected road '+id);
   }
   for(const t of map.tiles){const w=map.world(t.id);let key='grass',rot=0;
    if(map.path.includes(t.id)){const spec=road(t.id);key=spec.key;rot=spec.rot;}
    if(t.role==='river'){key='riverA';rot=Math.PI/3;}
    if(t.role==='water')key='water';if(t.role==='hill')key='hill';
    if(t.role==='bridge'){key='rivercrossing_A';rot=Math.PI/3;}
    const tile=add(key,w.x,w.z,rot);tile.scale.y=.48;
    tile.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color.setHex(key==='water'?0xd1edf1:0x729e72);}});
    if(t.role==='bridge')add('bridge',w.x,w.z,-Math.PI/3);
    if(t.role==='forest'){add(t.id%2?'broadleaf':'tree',w.x,w.z,0,1.28);add('rock',w.x+.52,w.z+.62,1,2.2);}
    if(t.role==='build')add('site',w.x,w.z,0,.66,.005);
    if(t.role==='village'){add('home',w.x-.3,w.z,0,1.35);add('home',w.x+.5,w.z-.55,Math.PI/3,.95);add('fence',w.x,w.z,0,.8);add('crate',w.x+.3,w.z+.4,0,1.4);}
    if(t.id===39)add('flag',w.x+.5,w.z-.65,0,2.4);
    if(t.id===32)add('rock',w.x-.7,w.z-.6,0,3);
   }
   renderer.render(scene,camera);const board=renderer.domElement.toDataURL('image/png').split(',')[1];
   [...scene.children].filter(o=>!o.isLight).forEach(o=>scene.remove(o));
   const images={},sprites={}; const origin=project(0,0,0);
   for(const key of ['guard','archer','mage','catapult','windmill','knight','enemy',...['blacksmith','well','lumber','barricade'].filter(k=>models[k])]){
    const m=add(key,0,0,0);renderer.render(scene,camera);
    const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=900;const ctx=canvas.getContext('2d');ctx.drawImage(renderer.domElement,0,0);const pixels=ctx.getImageData(0,0,1600,900).data;
    let x0=1600,y0=900,x1=0,y1=0;for(let y=0;y<900;y++)for(let x=0;x<1600;x++)if(pixels[(y*1600+x)*4+3]>2){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
    const crop=document.createElement('canvas');crop.width=x1-x0+5;crop.height=y1-y0+5;crop.getContext('2d').drawImage(canvas,x0-2,y0-2,crop.width,crop.height,0,0,crop.width,crop.height);
    images[key]=crop.toDataURL('image/png').split(',')[1];sprites[key]={w:crop.width/16,h:crop.height/9,dx:(x0-2)/16-origin.x,dy:(y0-2)/9-origin.y};scene.remove(m);
   }
   renderer.dispose();return {dims,images,board,anchors,sprites};
  });
  for(const [name,data]of Object.entries(result.images))fs.writeFileSync(path.join(root,name+'.png'),Buffer.from(data,'base64'));
  fs.writeFileSync(path.join(root,'village.png'),Buffer.from(result.board,'base64'));
  fs.writeFileSync(path.join(root,'projection.js'),'window.HEXKEEP_ART = '+JSON.stringify({anchors:result.anchors,sprites:result.sprites})+';\n');
  console.log('Baked 48 playable tiles plus a full tiled apron, board and '+Object.keys(result.images).length+' sprites');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
