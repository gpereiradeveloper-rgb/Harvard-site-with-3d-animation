import {CatmullRomCurve3, Vector3,Quaternion,Euler} from 'three';
import {realCourierAt,porterCargoSocket} from './ArchiveCourierMotion.js';

export const SUPPLY_OPERATION_END=272;
export const SUPPLY_SCANNER={infeed:[11.45,1.02,-.65],center:11.10,halfLength:.22,transit:4,readDelay:1.75};
export const SUPPLY_FLOOR=.095;
export const SUPPLY_STREET=-.89;
export const SUPPLY_CASE_SIZE=[.30,.265,.40];
export const SUPPLY_PALLET_SCALE=.9;
export const SUPPLY_PALLET_HEIGHT=.11925;
const PI=Math.PI;
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=(t,a,b)=>{const p=clamp((t-a)/(b-a));return clamp(p*p*p*(p*(p*6-15)+10));};
const mix=(a,b,t)=>a+(b-a)*t;
const angleMix=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
const lerp=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
const rot=(p,yaw)=>[Math.cos(yaw)*p[0]+Math.sin(yaw)*p[2],p[1],-Math.sin(yaw)*p[0]+Math.cos(yaw)*p[2]];
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const distance=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const toward=(a,b)=>Math.atan2(b[0]-a[0],b[2]-a[2]);
const curves=new Map();
function curve(points){const key=JSON.stringify(points);if(!curves.has(key)){const c=new CatmullRomCurve3(points.map(p=>new Vector3(...p)),false,'centripetal');c.arcLengthDivisions=400;curves.set(key,c);}return curves.get(key);}
function route(points,t,a,b,offset=0){const c=curve(points),f=ease(t,a,b),p=c.getPointAt(f),v=c.getTangentAt(f);return{position:p.toArray(),yaw:Math.atan2(v.x,v.z)+offset,distance:c.getLength()*f,moving:t>a&&t<b};}
const rampProgress=u=>{const r=.12,A=x=>x*x*x-.5*x*x*x*x;if(u<r)return r*A(u/r)/(1-r);if(u>1-r)return 1-r*A((1-u)/r)/(1-r);return(u-r/2)/(1-r);};
export function supplyRampHeight(z){return mix(SUPPLY_FLOOR,SUPPLY_STREET,rampProgress(clamp((z-1.05)/3.85)));}
export function supplyRampSlope(z){const u=clamp((z-1.05)/3.85),r=.12;let v=1;if(u<r){const p=u/r;v=p*p*(3-2*p);}else if(u>1-r){const p=(1-u)/r;v=p*p*(3-2*p);}return-.985/3.85*v/(1-r);}
export function supplyFloorHeight(x,z){if(x>=10.75&&x<=12.25&&z>=1.05&&z<=4.9)return supplyRampHeight(z);return x>=6.45&&x<=12.4&&z<=1.05?SUPPLY_FLOOR:SUPPLY_STREET;}
const robotRoute=[[10.5,0,.75],[11.7,0,.80],[11.75,0,2.0],[11.7,0,4.9],[10.85,0,5.35]];
const porterRoute=[[9.35,0,6.85],[10.45,0,6.85],[11.55,0,5.35],[11.7,0,4.90],[11.7,0,1.05],[12.0,0,.20]];
function groundTravel(points,t,a,b,reverse=false,robot=false){const c=curve(points),f=ease(t,a,b),u=reverse?1-f:f,p=c.getPointAt(u),v=c.getTangentAt(u);p.y=supplyFloorHeight(p.x,p.z);const tangent=reverse?v.clone().negate():v;return{position:p.toArray(),yaw:robot?Math.atan2(-tangent.z,tangent.x):Math.atan2(tangent.x,tangent.z),tilt:robot&&p.z>1.05&&p.z<4.9?Math.atan2(supplyRampSlope(p.z)*tangent.z,Math.hypot(tangent.x,tangent.z)):0,pitch:!robot&&p.z>1.05&&p.z<4.9?-Math.atan2(supplyRampSlope(p.z)*tangent.z,Math.hypot(tangent.x,tangent.z)):0,distance:c.getLength()*f,moving:t>a&&t<b};}
function actor(position,yaw=0){return{position:[...position],yaw,crouch:0,walking:false,distance:0,caseId:null};}
const loaderHome=[8.72,SUPPLY_STREET,6.74],loaderMeet=[10.30,SUPPLY_STREET,5.35];
const receiverHome=[9.4,SUPPLY_FLOOR,.84];
const palletCells=[[-.16,0,-.21],[.16,0,-.21],[-.16,0,.21],[.16,0,.21]];
const intake=[8.7,SUPPLY_FLOOR+.1325,-1.25],stage=[7.10,SUPPLY_FLOOR+.1325,-2.65],empty=[11.3,SUPPLY_FLOOR+.1325,-1.60];
const forkliftHome=[7.10,SUPPLY_FLOOR,.05],forkPickup=[7.10,SUPPLY_FLOOR,-.75];
function palletCase(pallet,index){return add(pallet.position,rot([palletCells[index][0],SUPPLY_PALLET_HEIGHT,palletCells[index][2]],pallet.yaw));}
function carry(a){return add(a.position,rot([0,.96-.58*a.crouch,.36],a.yaw));}
function actorMove(a,points,t,start,end,face){const s=route(points,t,start,end);Object.assign(a,s,{walking:s.moving});if(face!==undefined)a.yaw=angleMix(a.yaw,face,ease(t,end-.7,end));return a;}
function robotState(t){
 let s=groundTravel(robotRoute,t,0,10,false,true);
 if(t>=10&&t<43)s=groundTravel(robotRoute,10,0,10,false,true);
 else if(t>=43&&t<55)s=groundTravel(robotRoute,t,43,55,true,true);
 else if(t>=55&&t<74)s=groundTravel(robotRoute,55,43,55,true,true);
 else if(t>=74&&t<86)s=groundTravel(robotRoute,t,74,86,false,true);
 else if(t>=86&&t<90)s=groundTravel(robotRoute,86,74,86,false,true);
 else if(t>=90&&t<102)s=groundTravel(robotRoute,t,90,102,true,true);
 else if(t>=102&&t<112)s=groundTravel(robotRoute,102,90,102,true,true);
 else if(t>=112&&t<124)s=groundTravel(robotRoute,t,112,124,false,true);
 else if(t>=124&&t<130)s=groundTravel(robotRoute,124,112,124,false,true);
 else if(t>=130&&t<142)s=groundTravel(robotRoute,t,130,142,true,true);
 else if(t>=142)s=groundTravel(robotRoute,142,130,142,true,true);
 const downYaw=groundTravel(robotRoute,10,0,10,false,true).yaw,upYaw=groundTravel(robotRoute,55,43,55,true,true).yaw;
 if(t>=36&&t<43)s.yaw=angleMix(downYaw,downYaw+PI,ease(t,37,43));
 else if(t>=70&&t<74)s.yaw=angleMix(upYaw,upYaw+PI,ease(t,70,74));
 else if(t>=86&&t<90)s.yaw=angleMix(downYaw,downYaw+PI,ease(t,86,90));
 else if(t>=110&&t<112)s.yaw=angleMix(upYaw,upYaw+PI,ease(t,110,112));
 else if(t>=128&&t<130)s.yaw=angleMix(downYaw,downYaw+PI,ease(t,128,130));
 return s;
}
function porterState(t){let s={position:[9.35,SUPPLY_STREET,6.85],yaw:-PI/2,distance:0,moving:false};
 if(t>=26&&t<28)s.yaw=angleMix(-PI/2,route(porterRoute,28,28,42).yaw,ease(t,26,28));
 else if(t>=28&&t<42)s=groundTravel(porterRoute,t,28,42,false,false);
 else if(t>=42&&t<58){s=groundTravel(porterRoute,42,28,42,false,false);s.yaw+=PI*ease(t,56,60);}
 else if(t>=58&&t<60){s=groundTravel(porterRoute,42,28,42,false,false);s.yaw+=PI*ease(t,56,60);}
 else if(t>=60&&t<74)s=groundTravel(porterRoute,t,60,74,true,false);
 else if(t>=74&&t<76){s=groundTravel(porterRoute,74,60,74,true,false);s.yaw=angleMix(s.yaw,PI/2,ease(t,74,76));}
 else if(t>=76&&t<80){s=route([[9.35,SUPPLY_STREET,6.85],[10.15,SUPPLY_STREET,6.85],[10.5,SUPPLY_STREET,7.7]],t,76,80);s.yaw=angleMix(PI/2,s.yaw,ease(t,76,76.5));}
 else if(t>=80)s=route([[9.35,SUPPLY_STREET,6.85],[10.15,SUPPLY_STREET,6.85],[10.5,SUPPLY_STREET,7.7]],80,76,80);
 return s;
}
function porterSocket(porter,upper=false){return porterCargoSocket(porter.position,porter.yaw,upper?1:0,porter.pitch||0);}
function forkState(t,index){const start=index?228:102,stockX=index?11.38:10.02;let s={position:[...forkliftHome],yaw:PI,lift:-.015,distance:0,moving:false};
 if(t>=start&&t<start+2)s=Object.assign(route([forkliftHome,forkPickup],t,start,start+2),{yaw:PI,lift:mix(-.015,0,ease(t,start+1.5,start+2))});
 else if(t>=start+2&&t<start+4)s={...s,position:[...forkPickup],lift:mix(0,.17,ease(t,start+2,start+4))};
 else if(t>=start+4&&t<start+8)s=Object.assign(route([forkPickup,[7.10,SUPPLY_FLOOR,.05]],t,start+4,start+8),{yaw:PI,lift:.17});
 else if(t>=start+8&&t<start+22){s=route([[7.10,SUPPLY_FLOOR,.05],[8.15,SUPPLY_FLOOR,-.4],[stockX,SUPPLY_FLOOR,-1.75]],t,start+8,start+22,PI);s.yaw=angleMix(PI,s.yaw,ease(t,start+8,start+10));s.yaw=angleMix(s.yaw,PI,ease(t,start+20,start+22));s.lift=.17;}
 else if(t>=start+22&&t<start+28)s={...s,position:[stockX,SUPPLY_FLOOR,-1.75],lift:mix(.17,1.4075,ease(t,start+22,start+28))};
 else if(t>=start+28&&t<start+30)s={...s,position:[stockX,SUPPLY_FLOOR,-1.75],lift:1.4075};
 else if(t>=start+30&&t<start+34)s=Object.assign(route([[stockX,SUPPLY_FLOOR,-1.75],[stockX,SUPPLY_FLOOR,-.65]],t,start+30,start+34),{yaw:PI,lift:mix(1.4075,.05,ease(t,start+31,start+34))});
 else if(t>=start+34&&t<start+44){s=route([[stockX,SUPPLY_FLOOR,-.65],[9.2,SUPPLY_FLOOR,-.15],forkliftHome],t,start+34,start+44,PI);s.yaw=angleMix(PI,s.yaw,ease(t,start+34,start+36));s.yaw=angleMix(s.yaw,PI,ease(t,start+42,start+44));s.lift=.05;}
 if(t>=start+44)s.lift=.05;return s;
}
function forkliftState(t){const s=t<228?forkState(t,0):forkState(t,1);if(t>=146&&t<228)s.lift=mix(.05,-.015,ease(t,218,228));return s;}
function palletState(t,index,forklift){const start=index?228:102,move=index?210:84;let p={id:index,position:index?[...empty]:[...intake],yaw:index?-PI/2:0,host:index?'empty-pallet-cradle':'intake-cradle'};
 if(index&&t>=152&&t<162){p.position=lerp(empty,intake,ease(t,152,162));p.yaw=angleMix(-PI/2,0,ease(t,152,158));p.host='pallet-jack';}
 else if(index&&t>=162){p.position=[...intake];p.yaw=0;p.host='intake-cradle';}
 if(t>=move&&t<move+2){p.position=[intake[0],mix(intake[1],intake[1]+.025,ease(t,move,move+2)),intake[2]];p.yaw=angleMix(0,PI/2,ease(t,move,move+2));p.host='pallet-jack';}
 else if(t>=move+2&&t<move+9){const travel=route([[intake[0],intake[1]+.025,intake[2]],[intake[0],intake[1]+.025,-1.8],[8.3,intake[1]+.025,-2.65],[stage[0],intake[1]+.025,stage[2]]],t,move+2,move+9);p.position=travel.position;p.yaw=mix(PI/2,0,ease(t,move+2,move+4));p.host='pallet-jack';}
 else if(t>=move+9&&t<move+12){p.position=[stage[0],mix(intake[1]+.025,stage[1],ease(t,move+9,move+12)),stage[2]];p.host='pallet-jack';}
 else if(t>=move+12&&t<start+2){p.position=[...stage];p.host='forklift-cradle';}
 else if(t>=start+2&&t<start+30){p.position=add(forklift.position,rot([0,.1325+forklift.lift,1.90],forklift.yaw));p.yaw=forklift.yaw-PI;p.host='forklift';}
 else if(t>=start+30){p.position=[index?11.38:10.02,SUPPLY_FLOOR+1.54,-3.65];p.yaw=0;p.host='upper-stock-rack';}
 return p;
}
function jackState(t,pallets){
 let s={position:[intake[0]+.45,SUPPLY_FLOOR,intake[2]],yaw:-PI/2,lift:.010,distance:0,moving:false};
 const follows=t>=84&&t<96?0:t>=152&&t<162?1:t>=210&&t<222?1:null;
 if(follows!==null){const p=pallets[follows];s.yaw=p.yaw-PI/2;s.position=add(p.position,rot([0,-(p.position[1]-SUPPLY_FLOOR),-.45],s.yaw));s.lift=p.position[1]-SUPPLY_FLOOR-.1225;s.moving=t>=86&&t<93||t>=152&&t<162||t>=212&&t<219;s.distance=distance(p.position,t>=152&&t<162?empty:intake);}
 else if(t>=96&&t<100)s=Object.assign(route([[7.55,SUPPLY_FLOOR,-2.65],[7.9,SUPPLY_FLOOR,-3.05],[7.85,SUPPLY_FLOOR,-3.95],[7.55,SUPPLY_FLOOR,-3.95]],t,96,100),{yaw:-PI/2,lift:0});
 else if(t>=100&&t<146)s={...s,position:[7.55,SUPPLY_FLOOR,-3.95],lift:0};
 else if(t>=146&&t<152)s=Object.assign(route([[7.55,SUPPLY_FLOOR,-3.95],[7.85,SUPPLY_FLOOR,-2.6],[9.0,SUPPLY_FLOOR,-1.7],[11.3,SUPPLY_FLOOR,-1.15]],t,146,152),{yaw:angleMix(-PI/2,-PI,ease(t,150,152)),lift:0});
 else if(t>=162&&t<210)s={...s,position:[intake[0]+.45,SUPPLY_FLOOR,intake[2]]};
 else if(t>=222&&t<226)s=Object.assign(route([[7.55,SUPPLY_FLOOR,-2.65],[7.9,SUPPLY_FLOOR,-3.05],[7.85,SUPPLY_FLOOR,-3.95],[7.55,SUPPLY_FLOOR,-3.95]],t,222,226),{yaw:-PI/2,lift:0});
 else if(t>=226)s={...s,position:[7.55,SUPPLY_FLOOR,-3.95],lift:0};
 return s;
}
const receiving=[
 {id:5,start:44,pick:46,walk:49,end:50,from:'porter',to:'scanner',slot:0},
 {id:4,start:54,pick:56,walk:59,end:60,from:'porter',to:'scanner',slot:1},
 {id:3,start:64,pick:66,walk:69,end:70,from:'robot',to:'scanner',slot:2},
 {id:3,start:74,pick:76,walk:81,end:82,from:'scanner',to:'pallet',pallet:0,cell:3,slot:2},
 {id:6,start:104,pick:106,walk:109,end:110,from:'robot',to:'scanner',slot:2},
 {id:4,start:160,pick:162,walk:165,end:166,from:'staging',to:'pallet',pallet:1,cell:0,slot:1},
 {id:5,start:170,pick:172,walk:175,end:176,from:'staging',to:'pallet',pallet:1,cell:1,slot:0},
 {id:6,start:180,pick:182,walk:185,end:186,from:'staging',to:'pallet',pallet:1,cell:2,slot:2},
 {id:7,start:190,pick:192,walk:195,end:196,from:'robot',to:'scanner',slot:2},
 {id:7,start:200,pick:202,walk:207,end:208,from:'scanner',to:'pallet',pallet:1,cell:3,slot:2},
];
const staging=i=>[10.00+i*.34,1.02,-.65];
function receiverAt(t,robot,porter,pallets){const a=actor(receiverHome,PI);let lastEnd=0,last=[...receiverHome],lastYaw=PI,lastCrouch=0;
 for(const job of receiving){const from=job.from==='porter'?porterSocket(porter,job.id===5):job.from==='robot'?add(robot.position,[0,.250,0]):staging(job.slot??job.id-4);
 const targetPallet=t>=job.end?palletState(job.end,job.pallet,forkliftState(job.end)):pallets[job.pallet];
 const to=job.to==='pallet'?palletCase(targetPallet,job.cell):job.to==='scanner'?SUPPLY_SCANNER.infeed:staging(job.slot);
 const fromBelt=job.from==='scanner'||job.from==='staging';
 const pickup=fromBelt?[from[0],SUPPLY_FLOOR,from[2]+.70]:[from[0]-.53,SUPPLY_FLOOR,from[2]+.12];
 const drop=job.to==='pallet'?[to[0]+(job.cell%2?.62:-.62),SUPPLY_FLOOR,to[2]+.10]:[to[0],SUPPLY_FLOOR,to[2]+.70];
 if(t<job.start){const waiting=job.start-lastEnd>8,hold=waiting&&t<job.start-4,origin=waiting&&!hold?receiverHome:last,destination=hold?receiverHome:pickup,begin=waiting&&!hold?job.start-4:lastEnd,end=hold?lastEnd+3:job.start;const path=origin[2]<-1.1&&destination[2]>-.3?[origin,[9.1,SUPPLY_FLOOR,origin[2]],[9.1,SUPPLY_FLOOR,.10],destination]:[origin,destination];actorMove(a,path,t,begin,end,hold?PI:toward(pickup,from));a.yaw=angleMix(waiting&&!hold?PI:lastYaw,a.yaw,ease(t,begin,begin+.8));a.crouch=lastCrouch*(1-ease(t,lastEnd,lastEnd+.8));return a;}
 if(t<job.pick){a.position=pickup;a.yaw=toward(pickup,from);a.crouch=(job.from==='robot'?1:job.from==='porter'?(job.id===4?1:.6):0)*ease(t,job.start,job.pick);a.caseId=job.id;return a;}
 if(t<job.walk){const waypoints=job.from==='robot'?[pickup,[9.55,SUPPLY_FLOOR,.18],drop]:job.from==='porter'?[pickup,[11.68,SUPPLY_FLOOR,-.08],drop]:job.to==='pallet'?[pickup,[9.1,SUPPLY_FLOOR,.10],[9.1,SUPPLY_FLOOR,drop[2]],drop]:[pickup,[pickup[0],SUPPLY_FLOOR,.10],[Math.max(drop[0],8.4),SUPPLY_FLOOR,.10],drop];const travel=route(waypoints,t,job.pick,job.walk);a.position=travel.position;const heading=toward(pickup,drop);a.yaw=angleMix(toward(pickup,from),heading,ease(t,job.pick,job.pick+.7));a.yaw=angleMix(a.yaw,toward(drop,to),ease(t,job.walk-.7,job.walk));a.walking=true;a.distance=travel.distance;a.caseId=job.id;a.crouch=(job.from==='robot'?1:job.from==='porter'?(job.id===4?1:.6):0)*(1-ease(t,job.pick,job.pick+.8));return a;}
 if(t<job.end){a.position=drop;a.yaw=toward(drop,to);a.caseId=job.id;a.crouch=job.to==='pallet'?ease(t,job.walk,job.end):0;return a;}
 last=drop;lastEnd=job.end;lastYaw=toward(drop,to);lastCrouch=job.to==='pallet'?1:0;
 }
 actorMove(a,[last,[9.1,SUPPLY_FLOOR,last[2]],[9.1,SUPPLY_FLOOR,.10],receiverHome],t,lastEnd,lastEnd+4,PI);a.yaw=angleMix(lastYaw,a.yaw,ease(t,lastEnd,lastEnd+.8));a.crouch=lastCrouch*(1-ease(t,lastEnd,lastEnd+.8));return a;
}
const loaderWait=[10.0,SUPPLY_STREET,8.0],driverWait=[7.4,SUPPLY_STREET,8.2];
function loadActorAt(t){
 const a=actor(loaderWait,-PI/2),pickupYaw=toward(loaderHome,[8.25,0,6.33]);
 for(const j of [{id:3,start:28,pick:30,walk:36,end:38},{id:6,start:80,pick:82,walk:88,end:90},{id:7,start:118,pick:120,walk:126,end:128}]){
  if(t<j.start){actorMove(a,[loaderWait,[9.7,SUPPLY_STREET,8.1],[8.3,SUPPLY_STREET,7.7],loaderHome],t,j.start-2,j.start,pickupYaw);a.yaw=angleMix(-PI/2,a.yaw,ease(t,j.start-2,j.start-1.4));return a;}
  if(t<j.pick){a.position=[...loaderHome];a.yaw=pickupYaw;a.crouch=.15*ease(t,j.start,j.start+.5);a.caseId=j.id;return a;}
  if(t<j.walk){actorMove(a,[loaderHome,[9.1,SUPPLY_STREET,6.0],[10.0,SUPPLY_STREET,5.95],loaderMeet],t,j.pick,j.walk,PI/2);a.yaw=angleMix(pickupYaw,a.yaw,ease(t,j.pick,j.pick+.8));a.crouch=.15*(1-ease(t,j.pick,j.pick+.8));a.caseId=j.id;return a;}
  if(t<j.end){a.position=[...loaderMeet];a.yaw=PI/2;a.caseId=j.id;a.crouch=ease(t,j.walk,j.end);return a;}
  if(t<j.end+6){actorMove(a,[loaderMeet,[10.0,SUPPLY_STREET,7.0],loaderWait],t,j.end,j.end+6,-PI/2);a.yaw=angleMix(PI/2,a.yaw,ease(t,j.end,j.end+.8));a.crouch=1-ease(t,j.end,j.end+.8);return a;}
 }
 return a;
}
function driverAt(t,truck){
 const a=actor([truck.driverX,SUPPLY_STREET,truck.driverZ],truck.yaw);a.walking=truck.walk>0;a.distance=truck.distance;a.seated=truck.seated;
 const dropRoot=[8.374,SUPPLY_STREET,7.275];
 for(const j of [{id:4,start:16,pick:18,walk:19,end:20},{id:5,start:22,pick:24,walk:25,end:26}]){
  if(t>=j.start&&t<j.end){const f=ease(t,j.pick,j.walk);a.position=lerp(loaderHome,dropRoot,f);a.yaw=angleMix(toward(loaderHome,[8.25,0,6.33]),toward(dropRoot,[8.798,0,6.85]),f);if(j.id===4&&t<18)a.yaw=angleMix(truck.yaw,a.yaw,ease(t,16,17));a.crouch=ease(t,j.pick,j.walk);a.caseId=j.id;return a;}
  if(t>=j.end&&t<j.end+2){const destination=j.id===5?driverWait:loaderHome;a.position=lerp(dropRoot,destination,ease(t,j.end,j.end+2));a.yaw=angleMix(toward(dropRoot,[8.798,0,6.85]),j.id===5?PI/2:toward(loaderHome,[8.25,0,6.33]),ease(t,j.end,j.end+2));a.crouch=1-ease(t,j.end,j.end+2);a.walking=true;a.distance=distance(dropRoot,destination)*ease(t,j.end,j.end+2);return a;}
 }
 if(t>=28&&t<146){a.position=[...driverWait];a.yaw=PI/2;a.walking=false;a.distance=0;}else if(t>=146&&t<150){actorMove(a,[driverWait,[7.8,SUPPLY_STREET,7.6],loaderHome],t,146,150,truck.yaw);a.yaw=angleMix(PI/2,a.yaw,ease(t,146,146.8));}return a;
}
function initialTruckCase(id,truck){const i=id-3,x=(i%2?1:-1)*.30,z=.40+Math.floor(i/2)*.44;return add([truck.truckX,SUPPLY_STREET,truck.truckZ],rot([x,.82,z],truck.truckYaw));}
function robotDeck(robot){return add(robot.position,rot([-.250*Math.sin(robot.tilt),.250*Math.cos(robot.tilt),0],robot.yaw));}

/** One finite receiving operation: identities and supports are shared by every renderer. */
let cachedTime=-1,cachedState;
export function supplyChainAt(seconds){
 const t=Math.max(0,Number(seconds)||0);if(t===cachedTime)return cachedState;
 const truck=realCourierAt(t),robot=robotState(t),porter=porterState(t),forklift=forkliftState(t);
 const pallets=[palletState(t,0,forklift),palletState(t,1,forklift)],jack=jackState(t,pallets),receiver=receiverAt(t,robot,porter,pallets),loader=loadActorAt(t),driver=driverAt(t,truck);
 const cases=Array.from({length:8},(_,id)=>({id,position:id<3?palletCase(pallets[0],id):initialTruckCase(id,truck),yaw:id<3?pallets[0].yaw:truck.truckYaw,host:id<3?'pallet-0':'truck'}));
 // Loading never creates a parcel: the one mesh slides on the truck deck, is
 // taken by an actor, then released to the cart or robot's exact support plane.
 for(const j of [{id:4,start:14,pick:16,lift:18,walk:19,end:20,host:'porter'},{id:5,start:20,pick:22,lift:24,walk:25,end:26,host:'porter'},{id:3,start:26,pick:28,lift:30,walk:36,end:38,host:'robot'},{id:6,start:78,pick:80,lift:82,walk:88,end:90,host:'robot'},{id:7,start:116,pick:118,lift:120,walk:126,end:128,host:'robot'}]){
  const c=cases[j.id],a=j.host==='porter'?driver:loader,rear=[8.25,SUPPLY_STREET+truck.deck,6.33],support=j.host==='porter'?porterSocket(porter,j.id===5):robotDeck(robot);
  if(t>=j.start&&t<j.pick){c.position=lerp(initialTruckCase(j.id,truck),rear,ease(t,j.start,j.pick));c.host='truck-lift';}
  else if(t>=j.pick&&t<j.lift){c.position=lerp(rear,carry(a),ease(t,j.pick,j.lift));c.yaw=a.yaw;c.host=j.host==='porter'?'driver':'loader';}
  else if(t>=j.lift&&t<j.walk){c.position=carry(a);c.yaw=a.yaw;c.host=j.host==='porter'?'driver':'loader';}
  else if(t>=j.walk&&t<j.end){c.position=lerp(carry(a),support,ease(t,j.walk,j.end));c.yaw=angleMix(a.yaw,j.host==='porter'?porter.yaw:robot.yaw,ease(t,j.walk,j.end));c.host=j.host==='porter'?'driver':'loader';}
  else if(t>=j.end){c.position=support;c.yaw=j.host==='porter'?porter.yaw:robot.yaw;c.host=j.host;}
 }
 for(const j of receiving){const c=cases[j.id];if(t<j.start)continue;const from=j.from==='porter'?porterSocket(porter,j.id===5):j.from==='robot'?robotDeck(robot):staging(j.slot??j.id-4),to=j.to==='pallet'?palletCase(pallets[j.pallet],j.cell):j.to==='scanner'?SUPPLY_SCANNER.infeed:staging(j.slot);
  if(t<j.pick){c.position=lerp(from,carry(receiver),ease(t,j.start,j.pick));c.yaw=angleMix(c.yaw,receiver.yaw,ease(t,j.start,j.pick));c.host='receiver';}
  else if(t<j.walk){c.position=carry(receiver);c.yaw=receiver.yaw;c.host='receiver';}
  else if(t<j.end){c.position=lerp(carry(receiver),to,ease(t,j.walk,j.end));c.yaw=angleMix(receiver.yaw,j.to==='pallet'?pallets[j.pallet].yaw:0,ease(t,j.walk,j.end));c.host='receiver';}
  else if(j.to==='scanner'){c.position=lerp(SUPPLY_SCANNER.infeed,staging(j.slot),ease(t,j.end,j.end+SUPPLY_SCANNER.transit));c.yaw=0;c.host=t<j.end+SUPPLY_SCANNER.transit?'scanner-conveyor':'staging';}
  else{c.position=to;c.yaw=j.to==='pallet'?pallets[j.pallet].yaw:0;c.host=j.to==='pallet'?'pallet-'+j.pallet:'staging';}
 }
 for(const c of cases){
  let pitch=0,roll=0;
  if(c.host==='porter')pitch=-.18+(porter.pitch||0);
  else if(c.host==='robot')roll=robot.tilt;
  else if(c.host==='driver'){const j=c.id===4?{walk:19,end:20}:{walk:25,end:26};pitch=-.18*ease(t,j.walk,j.end);}
  else if(c.host==='receiver'){const j=receiving.find(j=>j.id===c.id&&t>=j.start&&t<j.end);if(j?.from==='porter')pitch=-.18*(1-ease(t,j.start,j.pick));}
  c.rotation=[pitch,c.yaw,roll];c.quaternion=new Quaternion().setFromEuler(new Euler(pitch,c.yaw,roll,'YXZ')).toArray();
 }
 // Initial stock has already passed receiving. Every incoming identity passes
 // the same tunnel once; state is derived from time, so pause/scrub cannot
 // double-count an item or depend on which renderer ran first.
 const scanJobs=receiving.filter(j=>j.to==='scanner');
 for(const c of cases){const job=scanJobs.find(j=>j.id===c.id);c.scanTime=job?job.end+SUPPLY_SCANNER.readDelay:0;c.scanned=t>=c.scanTime;c.scanCount=c.scanned?1:0;}
 const scanningCase=cases.find(c=>c.host==='scanner-conveyor'&&Math.abs(c.position[0]-SUPPLY_SCANNER.center)<SUPPLY_SCANNER.halfLength);
 const scanner={active:!!scanningCase,caseId:scanningCase?.id??null,count:scanJobs.filter(j=>t>=j.end+SUPPLY_SCANNER.readDelay).length,total:scanJobs.length,status:scanningCase?'LENDO VOLUME':t>=200?'REMESSA CONFERIDA':'RECEBIMENTO · VERITAS'};
 Object.assign(forklift,motionKinematics('forklift',t));Object.assign(jack,motionKinematics('jack',t));
 cachedTime=t;return cachedState={t,complete:t>=SUPPLY_OPERATION_END,truck,robot,porter,receiver,loader,driver,forklift,jack,pallets,cases,scanner,scanning:scanner.active,
  task:t<16?'receber a remessa e abrir o caminhão':t<84?'conferir cada caixa no túnel e completar o primeiro palete':t<146?'transportar e armazenar o primeiro palete':t<210?'repor o segundo palete com os volumes conferidos':t<272?'armazenar o segundo palete na prateleira superior':'remessa conferida e armazenada · operação concluída'};
}

const kinematicTracks=new Map();
function rawEquipment(kind,t){if(kind==='forklift')return forkliftState(t);const f=forkliftState(t);return jackState(t,[palletState(t,0,f),palletState(t,1,f)]);}
export function motionKinematics(kind,seconds){
 if(!kinematicTracks.has(kind)){
  const rate=30,track=[{distance:0,speed:0,steering:0}];let previous=rawEquipment(kind,0),signed=0;
  for(let i=1;i<=SUPPLY_OPERATION_END*rate;i++){
   const current=rawEquipment(kind,i/rate),dx=current.position[0]-previous.position[0],dz=current.position[2]-previous.position[2];
   const heading=angleMix(previous.yaw,current.yaw,.5),travel=dx*Math.sin(heading)+dz*Math.cos(heading);signed+=travel;
   const speed=travel*rate,turn=Math.atan2(Math.sin(current.yaw-previous.yaw),Math.cos(current.yaw-previous.yaw))*rate;
   const steering=Math.abs(speed)>.006?Math.max(-.62,Math.min(.62,Math.atan((kind==='forklift'?-1.1:.6)*turn/speed))):0;
   track.push({distance:signed,speed,steering});previous=current;
  }
  kinematicTracks.set(kind,{rate,track});
 }
 const {rate,track}=kinematicTracks.get(kind);if(seconds>=SUPPLY_OPERATION_END)return{distance:track.at(-1).distance,speed:0,steering:0};const u=Math.max(0,Math.min(SUPPLY_OPERATION_END,seconds))*rate,i=Math.min(track.length-2,Math.floor(u)),f=u-i;
 return{distance:mix(track[i].distance,track[i+1].distance,f),speed:mix(track[i].speed,track[i+1].speed,f),steering:mix(track[i].steering,track[i+1].steering,f)};
}
