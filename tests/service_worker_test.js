const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const root = path.join(__dirname, '..');
const handlers = {};
const stored = new Map();
const key = request => typeof request === 'string' ? request : request.url;
let installed = [], deleted = [], network;
const cache = {
    async addAll(urls) { installed = Array.from(urls); },
    async put(request, response) { stored.set(key(request), response); },
};
const context = {
    self: {addEventListener(name, handler) { handlers[name] = handler; }, skipWaiting() {}, clients: {async claim() {}}},
    caches: {
        async open() { return cache; },
        async match(request) { return stored.get(key(request)); },
        async keys() { return ['my-app-cache-v1', context.version]; },
        async delete(name) { deleted.push(name); },
    },
    fetch(request) { return network(request); }, URL,
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'service-worker.js'),'utf8') + ';this.assets=urlsToCache;this.version=CACHE_NAME;',context);
let passed = 0;
async function test(name, run) { await run(); passed++; console.log('PASS',name); }
async function dispatch(name, request) {
    const work = []; let result;
    handlers[name]({request, waitUntil(promise) { work.push(promise); }, respondWith(promise) { result = promise; }});
    const response = await result;
    await Promise.all(work);
    return response;
}
(async()=>{
    await test('every local precache entry exists',()=>{
        for(const url of context.assets) assert.ok(url==='/'||fs.existsSync(path.join(root,url.split('?')[0])),url);
    });
    await test('all local page scripts/styles use their exact precache URL',()=>{
        const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
        const urls=Array.from(html.matchAll(/(?:src|href)="(\.\/[^" ]+\.(?:js|css)(?:\?[^" ]*)?)"/g),m=>m[1].slice(1));
        for(const url of urls) assert.ok(context.assets.includes(url),url);
    });
    await test('all defense sprites are available before visiting a battle',()=>{
        const files=fs.readdirSync(path.join(root,'assets/knowledge-defense')).filter(name=>name.endsWith('.png'));
        for(const file of files) assert.ok(context.assets.includes('/assets/knowledge-defense/'+file),file);
    });
    await test('installation waits for the complete manifest',async()=>{
        await dispatch('install');assert.strictEqual(installed.length,context.assets.length);
    });
    await test('activation removes the old app cache',async()=>{
        await dispatch('activate');assert.deepStrictEqual(deleted,['my-app-cache-v1']);
    });
    const request={method:'GET',destination:'script',mode:'no-cors',url:'https://cdn.example/vue.js?v=2'};
    await test('online scripts are cached with their exact query URL',async()=>{
        network=async()=>new Response('script-v2');
        const response=await dispatch('fetch',request);
        assert.strictEqual(await response.text(),'script-v2');
        assert.strictEqual(await stored.get(request.url).clone().text(),'script-v2');
    });
    await test('offline scripts fall back to the working cached response',async()=>{
        network=async()=>{throw new Error('offline');};
        const response=await dispatch('fetch',request);assert.strictEqual(await response.clone().text(),'script-v2');
    });
    await test('a failed server response cannot overwrite a working script',async()=>{
        network=async()=>new Response('server error',{status:503});await dispatch('fetch',request);
        assert.strictEqual(await stored.get(request.url).clone().text(),'script-v2');
    });
    await test('opaque cross-origin styles can be retained',async()=>{
        const opaque={ok:false,type:'opaque',clone(){return this;}};
        network=async()=>opaque;await dispatch('fetch',{...request,destination:'style'});
        assert.strictEqual(stored.get(request.url),opaque);
    });
    await test('offline navigations preserve the correct entry page',async()=>{
        stored.set('/index.html',new Response('index'));stored.set('/adventure.html',new Response('adventure'));
        network=async()=>{throw new Error('offline');};
        for(const page of ['index','adventure']){
            const response=await dispatch('fetch',{method:'GET',destination:'document',mode:'navigate',url:`https://app.example/${page}.html`});
            assert.strictEqual(await response.clone().text(),page);
        }
    });
    await test('non-GET requests bypass caching',async()=>{
        network=()=>{throw new Error('must not fetch');};assert.strictEqual(await dispatch('fetch',{method:'POST'}),undefined);
    });
    console.log(`${passed} service worker tests passed`);
})().catch(error=>{console.error(error);process.exitCode=1;});
