import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const auditDir=path.dirname(fileURLToPath(import.meta.url));
const app=path.resolve(auditDir,'../harvard-veritas');
const require=createRequire(path.join(app,'package.json'));
const {build}=require('esbuild');
const compiled=await build({entryPoints:[path.join(app,'src/RenderQuality.jsx')],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const mod=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const {getRenderQualityProfile:profile,sanitizeStoredQuality:sanitize,readStoredRenderQuality:read,writeStoredRenderQuality:write}=mod;

test('manual DPR stays invariant through chapter, pointer, scroll and visibility re-renders',()=>{
  for(const quality of ['high','cinema']){
    const base={quality,width:1920,height:1080,devicePixelRatio:2};
    const expected=profile(base);
    // R3F configure applies the dpr prop on each parent render. Passing the
    // selected value, rather than 1, must survive all unrelated UI state.
    for(let frame=0;frame<1000;frame++){
      const next=profile({...base,scroll:frame*9,pointerX:Math.sin(frame),chapter:Math.floor(frame/250),visible:frame%2===0});
      assert.equal(next.dpr,expected.dpr);
      assert.equal(next.renderWidth,expected.renderWidth);
      assert.equal(next.renderHeight,expected.renderHeight);
      assert.ok(next.manual);
    }
    assert.notEqual(expected.dpr,1,'negative control: old dpr={1} reproduced the regression');
  }
});

test('every preset obeys its deterministic pixel and GL-dimension caps',()=>{
  const sizes=[[320,568],[390,844],[1440,900],[1920,1080],[3840,2160],[7680,4320],[20000,4000],[4000,20000]];
  for(const quality of ['auto','high','cinema'])for(const [width,height] of sizes)for(const devicePixelRatio of [1,2,3,4]){
    const p=profile({quality,width,height,devicePixelRatio});
    assert.ok(Number.isFinite(p.dpr)&&p.dpr>0);
    assert.ok(p.renderWidth<=p.maxDimension&&p.renderHeight<=p.maxDimension,JSON.stringify(p));
    assert.ok(p.pixelCount<=p.maxPixels,JSON.stringify(p));
  }
});

test('explicit modes retain their supersampling target below the fixed caps',()=>{
  assert.equal(profile({quality:'high',width:1440,height:900,devicePixelRatio:1}).dpr,2);
  assert.equal(profile({quality:'cinema',width:1440,height:900,devicePixelRatio:1}).dpr,2.5);
  assert.equal(profile({quality:'cinema',width:1440,height:900,devicePixelRatio:3}).dpr,3);
});

test('unknown or malformed storage values are sanitized and do not change mode silently',()=>{
  assert.equal(sanitize(' CINEMA '),'cinema');
  assert.equal(sanitize('"high"'),'high');
  for(const value of [null,undefined,{},'NaN','[1,2]','low','"broken'])assert.equal(sanitize(value,'cinema'),'cinema');
  assert.equal(sanitize('bogus','also-bogus'),'auto');
});

test('quality selection survives reload, including storage-denied environments',()=>{
  const values=new Map();const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
  assert.equal(read(storage),'auto');
  assert.equal(write(storage,'cinema'),true);
  assert.equal(read(storage),'cinema');
  const unavailable={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};
  assert.equal(read(unavailable,undefined,'high'),'high');
  assert.equal(write(unavailable,'cinema'),false);
  assert.equal(write(null,'cinema'),false);
});

test('bad viewport measurements and smaller hardware limits remain safe',()=>{
  for(const width of [NaN,Infinity,-1,0,undefined]){
    const p=profile({quality:'cinema',width,height:Infinity,devicePixelRatio:0});
    assert.ok(Number.isFinite(p.dpr));assert.ok(p.renderWidth>0&&p.renderHeight>0);
  }
  const constrained=profile({quality:'cinema',width:5000,height:2500,devicePixelRatio:2,maxDimension:4096});
  assert.equal(constrained.renderWidth,4096);
  assert.ok(constrained.renderHeight<=4096);
});
