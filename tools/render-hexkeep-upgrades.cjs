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
   const images={},sprites={}; const origin=project(0,0,0);
   for(const type of ['guard','archer','mage','catapult'])for(const level of [2,3]){
    const key=type+'-'+level,group=new T.Group(),m=models[type].clone(true);m.scale.y=level===2?1.10:1.22;group.add(m);
    const box=new T.Box3().setFromObject(m),radius=Math.max(box.max.x-box.min.x,box.max.z-box.min.z)*.52;
    const stone=new T.MeshStandardMaterial({color:level===2?0x819398:0xb3b7a0,roughness:1}),gold=new T.MeshStandardMaterial({color:0xe9b94a,roughness:.6});
    for(let corner=0;corner<4;corner++){const x=(corner%2?1:-1)*radius,z=(corner<2?1:-1)*radius;
     const buttress=new T.Mesh(new T.BoxGeometry(.17,level===2?.55:.85,.17),stone);buttress.position.set(x,(level===2?.55:.85)/2,z);group.add(buttress);
     const cap=new T.Mesh(new T.ConeGeometry(.16,.18,4),gold);cap.position.set(x,(level===2?.55:.85)+.09,z);cap.rotation.y=Math.PI/4;group.add(cap);
    }
    if(level===3){for(const x of [-radius,radius]){const pole=new T.Mesh(new T.CylinderGeometry(.018,.018,.75,6),gold);pole.position.set(x,box.max.y*.7,0);group.add(pole);const banner=new T.Mesh(new T.BoxGeometry(.28,.23,.025),new T.MeshStandardMaterial({color:type==='mage'?0x9654ce:type==='catapult'?0xd9762d:0x2474ba}));banner.position.set(x+.13,box.max.y*.7+.22,0);group.add(banner);}}
    scene.add(group);renderer.render(scene,camera);
    const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=900;const ctx=canvas.getContext('2d');ctx.drawImage(renderer.domElement,0,0);const pixels=ctx.getImageData(0,0,1600,900).data;
    let x0=1600,y0=900,x1=0,y1=0;for(let y=0;y<900;y++)for(let x=0;x<1600;x++)if(pixels[(y*1600+x)*4+3]>2){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
    const crop=document.createElement('canvas');crop.width=x1-x0+5;crop.height=y1-y0+5;crop.getContext('2d').drawImage(canvas,x0-2,y0-2,crop.width,crop.height,0,0,crop.width,crop.height);
    images[key]=crop.toDataURL('image/png').split(',')[1];sprites[key]={w:crop.width/16,h:crop.height/9,dx:(x0-2)/16-origin.x,dy:(y0-2)/9-origin.y};scene.remove(group);
   }
   renderer.dispose();return {images,sprites};
  });
  for(const [name,data]of Object.entries(result.images))fs.writeFileSync(path.join(root,name+'.png'),Buffer.from(data,'base64'));
  const vm=require('vm'),sandbox={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'projection.js'),'utf8'),sandbox);Object.assign(sandbox.window.HEXKEEP_ART.sprites,result.sprites);
  fs.writeFileSync(path.join(root,'projection.js'),'window.HEXKEEP_ART = '+JSON.stringify(sandbox.window.HEXKEEP_ART)+';\n');
  console.log('Baked eight distinct upgraded tower sprites');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
