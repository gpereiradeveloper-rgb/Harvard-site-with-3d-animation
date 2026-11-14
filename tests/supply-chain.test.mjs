import test from 'node:test';
import assert from 'node:assert/strict';
import {supplyChainAt,SUPPLY_OPERATION_END,SUPPLY_SCANNER,SUPPLY_PALLET_HEIGHT} from '../src/ArchiveSupplyChain.js';
import {porterToolPoint} from '../src/ArchiveCourierMotion.js';
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const floorDistance=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
const rectangleDistance=(point,body,box)=>{const dx=point[0]-body.position[0],dz=point[2]-body.position[2],c=Math.cos(body.yaw),s=Math.sin(body.yaw),x=c*dx-s*dz,z=s*dx+c*dz;return Math.hypot(Math.max(box[0]-x,0,x-box[1]),Math.max(box[2]-z,0,z-box[3]));};
const fixed={position:[0,0,0],yaw:0};

test('each of five incoming cases is read once inside the scanner; identities and pallet supports persist',()=>{
 const read=new Set();let previousCount=0;
 for(let n=0;n<=SUPPLY_OPERATION_END*20;n++){
  const s=supplyChainAt(n/20);assert.deepEqual(s.cases.map(c=>c.id),[0,1,2,3,4,5,6,7]);assert.equal(s.pallets.length,2);
  assert.ok(s.scanner.count>=previousCount&&s.scanner.count<=5);previousCount=s.scanner.count;
  for(const c of s.cases){assert.ok(c.position.every(Number.isFinite));assert.ok(c.scanCount===0||c.scanCount===1);
   if(c.id>=3&&c.scanned&&!read.has(c.id)){assert.equal(c.host,'scanner-conveyor');assert.ok(Math.abs(c.position[0]-SUPPLY_SCANNER.center)<=SUPPLY_SCANNER.halfLength);read.add(c.id);}
   if(c.host.startsWith('pallet-')){const p=s.pallets[Number(c.host.at(-1))];assert.ok(Math.abs(c.position[1]-p.position[1]-SUPPLY_PALLET_HEIGHT)<1e-8);}
  }
 }
 assert.equal(read.size,5);const end=supplyChainAt(SUPPLY_OPERATION_END);assert.equal(end.scanner.count,5);assert.ok(end.pallets.every(p=>p.host==='upper-stock-rack'));assert.ok(end.cases.every(c=>c.scanned));
});

test('state is reproducible after scrubbing and ownership transitions are continuous',()=>{
 for(let t=1;t<SUPPLY_OPERATION_END;t++){
  const a=supplyChainAt(t-1e-6),b=supplyChainAt(t+1e-6);
  for(const key of ['robot','porter','forklift','jack','receiver','loader','driver']){assert.ok(distance(a[key].position,b[key].position)<.0001,`${key} jumps at ${t}s`);assert.ok(Math.abs(Math.atan2(Math.sin(a[key].yaw-b[key].yaw),Math.cos(a[key].yaw-b[key].yaw)))<.001,`${key} rotates abruptly at ${t}s`);}
  a.cases.forEach((c,i)=>assert.ok(distance(c.position,b.cases[i].position)<.0001,`case ${i} jumps at ${t}s`));
 }
 const before=structuredClone(supplyChainAt(52.2));supplyChainAt(250);supplyChainAt(0);assert.deepEqual(supplyChainAt(52.2),before);
});

test('receiving staff clear the imported forklift body, rack and conveyor; ramp traffic clears the waiting robot',()=>{
 // Forklift bounds measured from the original CC0 GLB excluding its fork blades.
 // These conservative torso envelopes do not certify every garment or finger.
 for(let n=0;n<=SUPPLY_OPERATION_END*100;n++){
  const s=supplyChainAt(n/100),j=s.jack,operator=[j.position[0]-Math.sin(j.yaw)*1.13,j.position[1],j.position[2]-Math.cos(j.yaw)*1.13];
  for(const point of [s.receiver.position,operator]){
   assert.ok(rectangleDistance(point,s.forklift,[-.6097,.6097,-.96,1.07])>=.20,`forklift torso clearance at ${s.t}`);
   assert.ok(rectangleDistance(point,fixed,[9.35,12.05,-4.2,-3.1])>=.20,`rack torso clearance at ${s.t}`);
   assert.ok(rectangleDistance(point,fixed,[9.74,11.50,-.915,-.385])>=.20,`conveyor torso clearance at ${s.t}`);
  }
  assert.ok(operator[0]<=12.2,'operator outside platform edge');
  assert.ok(floorDistance(s.robot.position,s.porter.position)>=.516,'robot meets the porter');
  const cart=porterToolPoint(s.porter.position,s.porter.yaw,[0,.069,.552],s.porter.pitch||0);
  assert.ok(floorDistance(s.robot.position,cart)>=.566,'robot meets the loaded hand truck');
 }
});

test('equipment travel, steering and lifting stop coherently at the end',()=>{
 for(const key of ['forklift','jack']){
  const end=supplyChainAt(SUPPLY_OPERATION_END)[key],later=supplyChainAt(1000)[key];
  assert.deepEqual(later,end);assert.equal(end.speed,0);assert.equal(end.steering,0);assert.ok(Number.isFinite(end.distance));
 }
});

test('driver, loader, receiver and both equipment operators retain separate standing space',()=>{
 let minimum=Infinity;
 for(let n=0;n<=SUPPLY_OPERATION_END*100;n++){
  const s=supplyChainAt(n/100),j=s.jack;
  const people=[['driver',s.driver],['loader',s.loader],['receiver',s.receiver],['porter',s.porter],['jack operator',{position:[j.position[0]-Math.sin(j.yaw)*1.13,j.position[1],j.position[2]-Math.cos(j.yaw)*1.13]}]];
  for(let i=0;i<people.length;i++)for(let k=i+1;k<people.length;k++){
   const [an,a]=people[i],[bn,b]=people[k];if((a.seated||0)>.5||(b.seated||0)>.5)continue;
   const separation=distance(a.position,b.position);minimum=Math.min(minimum,separation);
   assert.ok(separation>=.40,`${an}/${bn} overlap at ${s.t}s: ${separation}`);
  }
 }
 assert.ok(minimum>=.40);
});
