// Bake the original CC0 skeleton walk rig; no runtime Three.js dependency.
const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:8767/assets/hexkeep/LICENSE.txt');
 await page.addScriptTag({url:'https://unpkg.com/three@0.128.0/build/three.min.js'});await page.addScriptTag({url:'https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js'});
 const result=await page.evaluate(async()=>{
  const T=THREE,asset=await new T.GLTFLoader().loadAsync('/assets/models/duel/Skeleton_Minion.glb'),model=asset.scene;
  const clip=asset.animations.find(c=>c.name==='Walking_A');if(!clip)throw Error('Walking_A missing');
  model.scale.setScalar(.38);const pivot=new T.Group();pivot.add(model);const scene=new T.Scene();scene.add(pivot);
  scene.add(new T.HemisphereLight(0xfff5de,0x536e68,.85));const sun=new T.DirectionalLight(0xffefce,1.3);sun.position.set(-8,16,7);scene.add(sun);
  const camera=new T.OrthographicCamera(-10.7,10.7,6.019,-6.019,.1,100);camera.position.set(8,13,18);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(1600,900);renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const mixer=new T.AnimationMixer(model);mixer.clipAction(clip).play();
  const frames=24,directions=6,size=192,canvas=document.createElement('canvas');canvas.width=frames*size;canvas.height=directions*size;const ctx=canvas.getContext('2d');
  for(let row=0;row<directions;row++)for(let frame=0;frame<frames;frame++){
   pivot.rotation.y=Math.PI/6+row*Math.PI/3;mixer.setTime(clip.duration*frame/frames);model.updateMatrixWorld(true);renderer.render(scene,camera);
   ctx.drawImage(renderer.domElement,704,290,size,size,frame*size,row*size,size,size);
  }
  renderer.dispose();return {png:canvas.toDataURL('image/png').split(',')[1],meta:{frames,directions,duration:clip.duration*1000,w:12,h:192/9,dx:-6,dy:-160/9,clip:clip.name}};
 });const out=path.resolve('assets/hexkeep');fs.writeFileSync(path.join(out,'enemy-walk.png'),Buffer.from(result.png,'base64'));fs.writeFileSync(path.join(out,'walk.js'),'window.HEXKEEP_WALK = '+JSON.stringify(result.meta)+';\n');console.log('Baked 24 skeletal walk frames × 6 headings');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
