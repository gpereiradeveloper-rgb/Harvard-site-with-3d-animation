import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const app=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../harvard-veritas');
const require=createRequire(path.join(app,'package.json'));
const {build}=require('esbuild');
const compiled=await build({entryPoints:[path.join(app,'src/LoopingFilm.jsx')],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const {createRafFade}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
function clock(initial=0){
 let time=0,value=initial,id=0;const pending=new Map(),all=new Map();
 const fade=createRafFade({getValue:()=>value,setValue:n=>value=n,now:()=>time,requestFrame:cb=>{pending.set(++id,cb);all.set(id,cb);return id;},cancelFrame:n=>pending.delete(n)});
 return {fade,get value(){return value;},get pending(){return pending.size;},get lastId(){return id;},at(t){time=t;const jobs=[...pending];pending.clear();for(const [,cb]of jobs)cb(t);},stale(n,t){all.get(n)?.(t);}};
}
test('load/loop fade reaches the target after 250ms without a CSS transition',()=>{
 const c=clock();c.fade.to(1,250);assert.equal(c.value,0);
 c.at(125);assert.equal(c.value,.5);c.at(249);assert.ok(c.value<1);
 c.at(250);assert.equal(c.value,1);assert.equal(c.pending,0);
});
test('a replacement fade continues from visible opacity and old queued frames are harmless',()=>{
 const c=clock();c.fade.to(1,250);c.at(100);assert.equal(c.value,.4);
 const stale=c.lastId;c.fade.to(0,250);assert.equal(c.value,.4);assert.equal(c.pending,1);
 c.stale(stale,200);assert.equal(c.value,.4,'cancelled callback must not compete with the new fade');
 c.at(225);assert.equal(c.value,.2);c.at(350);assert.equal(c.value,0);assert.equal(c.pending,0);
});
test('deactivation cancels work without snapping; resumption starts at the held value',()=>{
 const c=clock();c.fade.to(1,250);c.at(80);assert.equal(c.value,.32);
 c.fade.cancel();c.at(5000);assert.equal(c.value,.32);assert.equal(c.pending,0);
 c.fade.to(1,250);c.at(5125);assert.ok(Math.abs(c.value-.66)<1e-12);c.at(5250);assert.equal(c.value,1);
});
