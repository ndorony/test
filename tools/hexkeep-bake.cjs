// Developer-only bake driver for Hexkeep art. No Playwright dependency.
//
// Serves the repository over http, opens a bake page in headless Chrome and
// waits for the page to POST its finished PNGs back to /_bake/<name>. Virtual
// time is not used: a GLB load never settles inside a --virtual-time-budget,
// so the driver polls for the expected artefacts instead.
//
//   node tools/hexkeep-bake.cjs boards     # per-level battlefield PNGs
//   node tools/hexkeep-bake.cjs units      # enemy walk/fight atlases
//   node tools/hexkeep-bake.cjs boats      # boat sailing atlases
//   node tools/hexkeep-bake.cjs 'units?only=knight,warlock'   # a subset
//   node tools/hexkeep-bake.cjs 'boards?only=river,coast'     # one region
//   node tools/hexkeep-bake.cjs 'boats?only=warship'          # one boat
//
// three.min.js + GLTFLoader.js (r128, examples/js build) must sit in
// tools/vendor/. They are dev-only and intentionally untracked.
const fs=require('fs'),path=require('path'),http=require('http'),{spawn}=require('child_process');
const root=path.join(__dirname,'..'),port=8791;
const job=process.argv[2]||'boards';
const pages={boards:'hexkeep-board-render.html',units:'hexkeep-unit-render.html',boats:'hexkeep-boat-render.html'};
const page=job.includes('.html')?job:pages[job.split('?')[0]]&&pages[job.split('?')[0]]+(job.includes('?')?job.slice(job.indexOf('?')):'');
if(!page){console.error('unknown job '+job);process.exit(2);}

const TYPES={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.gltf':'model/gltf+json','.bin':'application/octet-stream','.glb':'model/gltf-binary','.css':'text/css','.txt':'text/plain'};
const written=[];let done=false,failure=null;

const server=http.createServer((req,res)=>{
 if(req.method==='POST'&&req.url.startsWith('/_bake/')){
  const chunks=[];req.on('data',c=>chunks.push(c));
  req.on('end',()=>{
   const name=decodeURIComponent(req.url.slice(7));
   if(name==='_done'){done=true;}
   else if(name==='_error'){failure=Buffer.concat(chunks).toString();done=true;}
   else if(name.endsWith('.json')){fs.writeFileSync(path.join(root,'assets/hexkeep',name),Buffer.concat(chunks));written.push(name);}
   else {fs.writeFileSync(path.join(root,'assets/hexkeep',name),Buffer.from(Buffer.concat(chunks).toString(),'base64'));written.push(name);}
   res.writeHead(204);res.end();
  });
  return;
 }
 const file=path.join(root,decodeURIComponent(req.url.split('?')[0]));
 fs.readFile(file,(err,data)=>{
  if(err){res.writeHead(404);res.end('missing');return;}
  res.writeHead(200,{'content-type':TYPES[path.extname(file)]||'application/octet-stream'});res.end(data);
 });
});

function findBrowser(){
 const candidates=[
  process.env['PROGRAMFILES']+'\\Google\\Chrome\\Application\\chrome.exe',
  process.env['PROGRAMFILES(X86)']+'\\Google\\Chrome\\Application\\chrome.exe',
  process.env['LOCALAPPDATA']+'\\Google\\Chrome\\Application\\chrome.exe',
  process.env['PROGRAMFILES(X86)']+'\\Microsoft\\Edge\\Application\\msedge.exe',
  process.env['PROGRAMFILES']+'\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome','/usr/bin/chromium'];
 for(const c of candidates)try{if(c&&fs.existsSync(c))return c;}catch(e){}
 return null;
}

server.listen(port,'127.0.0.1',()=>{
 const exe=findBrowser();
 if(!exe){console.error('no Chromium browser found');process.exit(3);}
 const profile=fs.mkdtempSync(path.join(require('os').tmpdir(),'hexbake-'));
 const child=spawn(exe,['--headless=new','--disable-gpu','--enable-unsafe-swiftshader','--hide-scrollbars',
  '--user-data-dir='+profile,'--no-first-run','--window-size=1600,900',
  'http://127.0.0.1:'+port+'/tools/'+page],{stdio:'ignore'});
 const started=Date.now();
 const poll=setInterval(()=>{
  if(done||Date.now()-started>420000){
   clearInterval(poll);child.kill();server.close();
   if(failure){console.error('bake page failed: '+failure);process.exitCode=1;}
   else if(!done){console.error('timed out after '+written.length+' files');process.exitCode=1;}
   else console.log('Baked '+written.length+' files: '+written.join(', '));
  }
 },500);
});
