// Reproducible development bake. Only licensed, vendored mesh geometry is used.
const fs = require('fs'), path = require('path'), {chromium} = require('playwright');
(async () => {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:8873/assets/momentum-factory/LICENSE-Kenney.txt');
  await page.addScriptTag({url:'https://unpkg.com/three@0.128.0/build/three.min.js'});
  await page.addScriptTag({url:'https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js'});
  const result = await page.evaluate(async () => {
   const T=THREE, loader=new T.GLTFLoader(), models={}, assets={};
   const provenance=await (await fetch('/assets/momentum-factory/provenance.json')).json();
   for(const [key,entry] of Object.entries(provenance.models)){
    assets[key]=await loader.loadAsync('/assets/momentum-factory/'+entry.file);models[key]=assets[key].scene;
   }
   for(const key of ['tree','lumber']){assets['h-'+key]=await loader.loadAsync('/assets/hexkeep/source/'+key+'.gltf');models['h-'+key]=assets['h-'+key].scene;}
   const knight=await loader.loadAsync('/assets/models/duel/Knight.glb');
   const renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
   renderer.setSize(1200,1200);renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
   renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
   const camera=new T.OrthographicCamera(-8,8,8,-8,.1,100);camera.position.set(8,13,18);camera.lookAt(0,0,0);camera.updateMatrixWorld();
   const scene=new T.Scene();scene.add(new T.HemisphereLight(0xfff7dd,0x427769,.8));
   const sun=new T.DirectionalLight(0xffe8c9,1.2);sun.position.set(-8,16,7);sun.castShadow=true;Object.assign(sun.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:1,far:50});sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.001;scene.add(sun);
   const clear=()=>[...scene.children].filter(o=>!o.isLight).forEach(o=>scene.remove(o));
   const project=(x,z)=>{const v=new T.Vector3(x,0,z).project(camera);return {x:(v.x+1)*50,y:(1-v.y)*50};};
   function add(key,x=0,z=0,scale=1,rot=0,y=0){const m=models[key].clone(true);m.position.set(x,y,z);m.scale.setScalar(scale);m.rotation.y=rot;if(key.includes('robot-arm')){const elbow=m.getObjectByName('element-b'),wrist=m.getObjectByName('element-d');if(elbow)elbow.rotation.z=-.8;if(wrist){wrist.rotation.z=-.7;wrist.userData.articulation=true;}}m.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material=o.material.clone();if(key.startsWith('k-')&&/machine|hopper|crane/.test(key)){o.material.map=null;o.material.color.setHex(/screen/.test(key)?0x183957:0x139aab).convertSRGBToLinear();o.material.roughness=.65;}}});scene.add(m);return m;}
   const locations=[[-3.5,2.2],[-4,-1.8],[-.8,-2.4],[2.5,-1.5],[3.6,1.7],[.1,2.5],[-.3,5.4]];
   // The factory continues beyond the frame. Floors, windows and safety rails are real meshes.
   for(let x=-16;x<=16;x+=2)for(let z=-16;z<=16;z+=2){
    const base=add('k-floor-large',x,z,1,0,-.12);base.traverse(o=>{if(o.isMesh){o.material.map=null;o.material.color.setHex(0x568d72).convertSRGBToLinear();}});
    // KayKit's beveled platform mesh supplies real tile edges and contact shadows.
    const tile=add('p-platform_2x2x1_yellow',x,z,.99,0,-.10);tile.scale.y=.08;
    tile.traverse(o=>{if(o.isMesh){o.material.map=null;o.material.metalness=0;o.material.roughness=1;o.material.color.setHex(Math.abs(x)>6||z<-4||z>6?((x+z)%4===0?0x64984d:0x70a755):z>=6?0xe2b367:(x+z)%4===0?0x87c1b3:0x98cabb).convertSRGBToLinear();}});
   }
   camera.zoom=.5;camera.updateProjectionMatrix();renderer.render(scene,camera);let ground=renderer.domElement.toDataURL().split(',')[1];camera.zoom=1;camera.updateProjectionMatrix();
   for(let x=-5;x<=5;x+=2){add('k-structure-window',x,-5.8,.7,Math.PI);const pipe=add('p-pipe_straight_A_blue',x,-5.45,.45,0,1.5);pipe.traverse(o=>{if(o.isMesh){o.material.map=null;o.material.color.setHex(0xf2bb56).convertSRGBToLinear();}});pipe.rotation.z=Math.PI/2;}
   for(let z=-3;z<=5;z+=2)add('p-railing_straight_double_blue',-6.5,z,.55,Math.PI/2);
   for(let x=-5;x<=5;x+=2)add('p-railing_straight_double_blue',x,7.2,.55);
   for(const [x,z]of [[-8,-4],[-8,0],[-8,4],[8,-4],[8,0],[8,4],[6,-7],[-2,-8]])add('h-tree',x,z,1.4);
   // Only purchased stations get a pad. The unbuilt factory floor stays clear.
   add('h-lumber',-5,-4,1.25);for(const [x,z] of [[-6.2,-4.4],[-5.8,-5.5],[-4.3,-5.4]])add('h-tree',x,z,1.15);
   const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(-.04,-.38),camera);const counterAt=new T.Vector3();ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),counterAt);
   const desk=add('k-machine-bed',counterAt.x,counterAt.z,.68);desk.scale.y=.45;add('k-screen-wide',counterAt.x+.5,counterAt.z,.26,0,.45);
   add('k-screen-wide',-3.5,2.2,.85);add('k-machine-bed',-3.5,2.2,.9);add('k-box-large',-4.4,2.3,.55);
   add('p-signage_arrow_stand_blue',-5.7,-2,.7);add('p-cone_yellow',-5.4,-.4,.35);add('k-warning-traffic',4.9,3.2,.65);
   renderer.render(scene,camera);const floor=renderer.domElement.toDataURL().split(',')[1];camera.zoom=.5;camera.updateProjectionMatrix();renderer.render(scene,camera);ground=renderer.domElement.toDataURL().split(',')[1];camera.zoom=1;camera.updateProjectionMatrix();clear();
   const images={},sprites={},animations={};
   function png(){renderer.render(scene,camera);return renderer.domElement.toDataURL().split(',')[1];}
   function cropSpec(){renderer.render(scene,camera);const ctx=document.createElement('canvas').getContext('2d');ctx.canvas.width=ctx.canvas.height=1200;ctx.drawImage(renderer.domElement,0,0);const pixels=ctx.getImageData(0,0,1200,1200).data;let l=1200,t=1200,r=0,b=0;for(let y=0;y<1200;y++)for(let x=0;x<1200;x++)if(pixels[(y*1200+x)*4+3]>2){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}return {x:l-18,y:t-18,w:r-l+37,h:b-t+37};}
   function capture(key,spec=cropSpec()){const c=document.createElement('canvas');c.width=spec.w;c.height=spec.h;c.getContext('2d').drawImage(renderer.domElement,spec.x,spec.y,spec.w,spec.h,0,0,spec.w,spec.h);images[key]=c.toDataURL().split(',')[1];sprites[key]={w:spec.w/12,h:spec.h/12,dx:spec.x/12-50,dy:spec.y/12-50};return spec;}
   const kindModels={supply:'k-hopper-high-round',press:'k-machine-bed',assembly:'k-machine-window',packing:'k-machine-fortified',shipping:'k-crane-lift'};
   for(const [kind,key]of Object.entries(kindModels))for(let level=1;level<=3;level++){
    const pad=add('p-platform_2x2x1_yellow',0,0,.68);pad.scale.y=.08;pad.traverse(o=>{if(o.isMesh){o.material.map=null;o.material.color.setHex(0xffcb55).convertSRGBToLinear();}});
    const machine=add(key,0,0,kind==='shipping'?.6:1.05);machine.traverse(o=>{if(o.isMesh)o.material.color.setHex({supply:0x159c9f,press:0xffb839,assembly:0xee7968,packing:0x8684cf,shipping:0x4c92c7}[kind]).convertSRGBToLinear();});
    const moving=add(kind==='supply'?'k-crane-magnet':kind==='shipping'?'k-box-large':'k-piston-square',0,.22,kind==='supply'?.25:kind==='shipping'?.7:.56,0,kind==='shipping'?.2:.7);
    if(kind==='packing')add('k-box-small',-.7,.2,.65);
    if(kind==='assembly')add('k-cog-a',.55,.45,.65,0,.35);
    if(level>=2){add('k-robot-arm-a',-.95,0,.7);add('p-pipe_90_A_blue',.55,-.5,.4);add('k-conveyor-stripe',0,.95,.6);}
    if(level>=3){add(kind==='shipping'?'k-crane':'k-machine-connection-pipe',.8,-.5,kind==='shipping'?.35:.6);add('k-robot-arm-b',.95,.45,.65,Math.PI);add('p-bracing_medium_blue',-.65,-.35,.45);}
    const spec=capture(kind+'-'+level),frames=16,atlas=document.createElement('canvas');atlas.width=spec.w*frames;atlas.height=spec.h;const ctx=atlas.getContext('2d');
    const originalY=moving.position.y;const piston=assets['k-piston-square'],mixer=new T.AnimationMixer(moving);if(!['supply','shipping'].includes(kind)&&piston.animations.length)mixer.clipAction(piston.animations.find(c=>c.name==='toggle')||piston.animations[0]).play();
    for(let f=0;f<frames;f++){mixer.setTime(f/frames*1.5);scene.traverse(o=>{if(o.userData.articulation)o.rotation.z=-.7+.16*Math.sin(f/frames*Math.PI*2);});if(['supply','shipping'].includes(kind))moving.position.y=originalY+.16*Math.sin(f/frames*Math.PI*2);renderer.render(scene,camera);ctx.drawImage(renderer.domElement,spec.x,spec.y,spec.w,spec.h,spec.w*f,0,spec.w,spec.h);}
    images[kind+'-'+level+'-work']=atlas.toDataURL().split(',')[1];animations[kind+'-'+level]={frames};clear();
   }
   for(const [key,model,scale]of [['raw','k-box-long',.5],['part','k-cog-a',.55],['product','k-robot-arm-a',.32],['box','k-box-small',.5]]){add(model,0,0,scale);capture(key);clear();}
   // A directed connection for every placement pair, baked in the same projection.
   for(let a=1;a<locations.length;a++)for(let b=1;b<locations.length;b++)if(a!==b){const from=locations[a],to=locations[b],dx=to[0]-from[0],dz=to[1]-from[1],length=Math.hypot(dx,dz),n=Math.max(1,Math.floor(length/.7));for(let i=0;i<n;i++){const t=(i+.5)/n,m=add('k-conveyor',from[0]+dx*t,from[1]+dz*t,.42,-Math.atan2(dz,dx));m.scale.x=length/n;m.position.y=.04;}images['link-'+a+'-'+b]=png();clear();}
   add('k-conveyor',0,0,1);capture('belt');clear();
   const model=knight.scene;model.traverse(o=>{if(/Sword|Shield/.test(o.name))o.visible=false;});model.scale.setScalar(.42);const pivot=new T.Group();pivot.add(model);scene.add(pivot);
   const mixer=new T.AnimationMixer(model),frames=24,dirs=6,size=144,worker={frames,dirs,duration:1066.667,w:12,h:12,dx:-6,dy:-118/12};
   for(const [name,clipName]of [['worker','Walking_A'],['worker-task','Interact']]){const clip=knight.animations.find(c=>c.name===clipName);if(!clip)throw Error('Missing '+clipName);mixer.stopAllAction();mixer.clipAction(clip).play();const canvas=document.createElement('canvas');canvas.width=frames*size;canvas.height=dirs*size;const ctx=canvas.getContext('2d');for(let row=0;row<dirs;row++)for(let f=0;f<frames;f++){pivot.rotation.y=Math.PI/6+row*Math.PI/3;mixer.setTime(clip.duration*f/frames);model.updateMatrixWorld(true);renderer.render(scene,camera);ctx.drawImage(renderer.domElement,528,482,size,size,f*size,row*size,size,size);}images[name]=canvas.toDataURL().split(',')[1];}
   mixer.stopAllAction();mixer.clipAction(knight.animations.find(c=>c.name==='Cheer')).play();mixer.setTime(.65);pivot.rotation.y=.3;model.scale.setScalar(1.25);
   model.traverse(o=>{if(o.isMesh)o.material=o.material.clone();});
   for(const [name,color]of [['crew-gold',0xffffff],['crew-mint',0xc2ffe3],['crew-berry',0xe8caff]]){model.traverse(o=>{if(o.isMesh)o.material.color.setHex(color).convertSRGBToLinear();});capture(name);}
   renderer.dispose();return {ground,floor,images,art:{supplySource:project(-5,-4),locations,anchors:locations.map(p=>project(...p)),sprites,animations,worker,exit:{x:48,y:69}}};
  });
  const root=path.resolve('assets/momentum-factory');fs.writeFileSync(path.join(root,'ground.png'),Buffer.from(result.ground,'base64'));fs.writeFileSync(path.join(root,'floor.png'),Buffer.from(result.floor,'base64'));
  for(const [key,png]of Object.entries(result.images))fs.writeFileSync(path.join(root,key+'.png'),Buffer.from(png,'base64'));
  fs.writeFileSync(path.join(root,'projection.js'),'window.MOMENTUM_ART = '+JSON.stringify(result.art)+';\n');
  console.log('Baked factory floor, '+Object.keys(result.images).length+' machine, cargo, connection and character images.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
