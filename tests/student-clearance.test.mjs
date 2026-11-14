import assert from 'node:assert/strict';
import{campusDeliveryAt,campusDeliveryState}from'../src/ArchiveCampusDelivery.js';import{shelfStudentAt,shelfStudentState}from'../src/ArchiveShelfStudentMotion.js';
const a=campusDeliveryState(),b=campusDeliveryState(),s=shelfStudentState();let minPeople=Infinity,minRobot=Infinity,minTable=Infinity,minPeopleAt,minRobotAt,minTableAt,maxSupportError=0,maxContinuity=0;
const fixed=[[-4.3,2.45],[-4.3,4.15],[-3.4,4.15],[-2.05,2.45],[-2.05,4.15],[-4.7,1.6],[4.52,-2.18],[3.3,-.12]];
const tables=[[-4.75,-2.95,2.8,3.8],[-2.5,-.7,2.8,3.8]];
const d=(p,q)=>Math.hypot(p.x-q.x,p.z-q.z);const ease=(t,a,b)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*u*(u*(u*6-15)+10)};
for(let t=0;t<3360;t+=.05){campusDeliveryAt(t,0,a);campusDeliveryAt(t,1,b);shelfStudentAt(t,s);const promenade=(t+1.4)%18;const px=-5.88+4.8*(ease(promenade,0,6.9)-ease(promenade,9.2,16.1));const cat=t%32,cz=-1.6+1.9*(ease(cat,12,18)-ease(cat,22,28));const people=[a.student.position,b.student.position,s.position,a.worker.position,b.worker.position,...fixed.map(([x,z])=>({x,z})),{x:px,z:4.7},{x:-4.8,z:cz},{x:-.72,z:-.38+.6*(ease(t%22,2.25,3.55)-ease(t%22,13,14.3))}];
 for(let i=0;i<people.length;i++)for(let j=i+1;j<people.length;j++){const v=d(people[i],people[j]);if(v<minPeople){minPeople=v;minPeopleAt={t,i,j};}}
 for(const r of [a.robot.position,b.robot.position])for(let i=0;i<people.length;i++){const v=d(r,people[i]);if(v<minRobot){minRobot=v;minRobotAt={t,i};}}
 for(const p of [a.student.position,b.student.position,s.position])for(const [x0,x1,z0,z1]of tables){const v=Math.hypot(Math.max(x0-p.x,0,p.x-x1),Math.max(z0-p.z,0,p.z-z1));if(v<minTable){minTable=v;minTableAt={t,p:p.toArray()};}}
 for(const x of [a,b]){const bottom=x.book.position.y-.025;if(x.host==='table')maxSupportError=Math.max(maxSupportError,Math.abs(bottom-1.1895));if(x.host==='counter')maxSupportError=Math.max(maxSupportError,Math.abs(bottom-.995));if(x.host==='robot')maxSupportError=Math.max(maxSupportError,Math.abs(bottom-(.095+.256+x.robot.platformLift+x.robot.bodyLift)));}
}
for(const t of [0,2,4,8,10,13,16,25,27,29,34,36,39,40,46,48,50,57,58,59,60,65,67,70,71,75,77,84,85,88,90,91.5,92,94,95.5,96])for(const i of [0,1]){const p=campusDeliveryAt(t-1e-6<0?96-1e-6:t-1e-6,i),q=campusDeliveryAt(t+1e-6,i);maxContinuity=Math.max(maxContinuity,p.book.position.distanceTo(q.book.position),p.student.position.distanceTo(q.student.position),p.worker.position.distanceTo(q.worker.position));}
for(const t of [0,8,10,11,30,32,34,36,38,57,59,61,63,65,79,80,81,82,84,86,105,109,111,113,132,134,136,140]){const p=shelfStudentAt(t-1e-6<0?140-1e-6:t-1e-6),q=shelfStudentAt(t+1e-6);maxContinuity=Math.max(maxContinuity,p.bookPosition.distanceTo(q.bookPosition),p.position.distanceTo(q.position));}

assert.ok(minPeople >= .40, `People clearance ${minPeople}`);
assert.ok(minRobot >= .516, `Robot clearance ${minRobot}`);
assert.ok(minTable >= .2199, `Table clearance ${minTable}`);
assert.ok(maxSupportError < 1e-7, `Book support ${maxSupportError}`);
assert.ok(maxContinuity < 1e-5, `Handoff continuity ${maxContinuity}`);
