import {CatmullRomCurve3, CubicBezierCurve3, Vector3} from 'three';

export const CAMPUS_DELIVERY_CYCLE = 96;
export const CAMPUS_DELIVERY_FLOOR = .095;
const PI = Math.PI;
const clamp = n => Math.max(0, Math.min(1, n));
export const deliveryEase = (t, a, b) => {
  const u = clamp((t - a) / (b - a));
  return clamp(u ** 3 * (u * (6 * u - 15) + 10));
};
const angleMix = (a, b, f) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * f;
const v = (x, z) => new Vector3(x, CAMPUS_DELIVERY_FLOOR, z);
function route(points) {
  const curve = new CatmullRomCurve3(points.map(([x,z])=>v(x,z)), false, 'centripetal');
  curve.arcLengthDivisions = 400;
  return {curve, length:curve.getLength()};
}
function walkingRoute(points) {
  const curve=new CubicBezierCurve3(...points.map(([x,z])=>v(x,z)));
  curve.arcLengthDivisions=400;
  return {curve,length:curve.getLength()};
}
const CONFIG = [
  {offset:0, seat:v(-1.15,4.15), seatYaw:PI, stand:v(-1.15,4.02), meet:v(-.62,4.65),
    pickup:v(1.4,.95), counter:new Vector3(1.15,1.02,.5), workerHome:v(.77,.5), workerLoad:v(.96,1.22),
    table:new Vector3(-1.05,1.2145,3.62), tablet:new Vector3(-1.55,1.178,3.57),
    robotRoute:route([[1.4,.95],[2.7,1.4],[2.75,3.9],[-.10,4.65]]),
    studentRoute:walkingRoute([[-1.15,4.02],[-.20,4.02],[-.84,4.65],[-.62,4.65]]),
    workerRoute:walkingRoute([[.77,.5],[.77,1.06],[.85,1.24],[.96,1.22]])},
  {offset:48, seat:v(-1.15,2.45), seatYaw:0, stand:v(-1.15,2.58), meet:v(-.18,2.15),
    pickup:v(2.4,.95), counter:new Vector3(2.25,1.02,.5), workerHome:v(2.68,.5), workerLoad:v(2.88,1.20),
    table:new Vector3(-1.05,1.2145,2.98), tablet:new Vector3(-1.55,1.178,3.03),
    robotRoute:route([[2.4,.95],[3.2,1.4],[2.5,1.8],[.38,2.15]]),
    studentRoute:walkingRoute([[-1.15,2.58],[-.45,2.58],[-.65,2.15],[-.18,2.15]]),
    workerRoute:walkingRoute([[2.68,.5],[2.90,.48],[3.20,1.08],[2.88,1.20]])},
];
export const CAMPUS_DELIVERY_SEATS = CONFIG.map(c=>({position:c.seat.toArray(),rotation:c.seatYaw,seatHeight:.64}));
export const CAMPUS_DELIVERY_TABLETS = CONFIG.map(c=>({position:c.tablet.toArray(),rotation:c.seatYaw}));
const toward = (a,b) => Math.atan2(b.x-a.x,b.z-a.z);
function actorState() {
  return {position:new Vector3(),yaw:0,pelvisAbsolute:.83,walkDistance:0,walkWeight:0,crouch:0,seated:0,grip:0,activity:0};
}
export function campusDeliveryState() {
  return {phase:0,task:'',host:'counter',robot:{position:new Vector3(),yaw:0,distance:0,speed:0,bodyLift:0},
    worker:actorState(),student:actorState(),book:{position:new Vector3(),yaw:0,open:0},chair:new Vector3(),
    tangent:new Vector3(),scratch:new Vector3(),before:new Vector3(),after:new Vector3()};
}
function walking(actor, r, t, start, end, reverse, tangent) {
  const f=deliveryEase(t,start,end),u=reverse?1-f:f;
  r.curve.getPointAt(u,actor.position);r.curve.getTangentAt(u,tangent);
  actor.yaw=Math.atan2(tangent.x,tangent.z)+(reverse?PI:0);
  actor.walkDistance=r.length*f;
  actor.walkWeight=deliveryEase(t,start,start+.48)*(1-deliveryEase(t,end-.48,end));
}
function workerAt(t,c,out,tangent) {
  const homeYaw=toward(c.workerHome,c.counter),loadYaw=toward(c.workerLoad,c.pickup);
  out.position.copy(c.workerHome);out.yaw=homeYaw;out.walkWeight=out.walkDistance=0;
  if(t>=2&&t<4){c.workerRoute.curve.getTangentAt(0,tangent);out.yaw=angleMix(homeYaw,Math.atan2(tangent.x,tangent.z),deliveryEase(t,2,4));}
  else if(t>=4&&t<8){walking(out,c.workerRoute,t,4,8,false,tangent);out.yaw=angleMix(out.yaw,loadYaw,deliveryEase(t,7,8));}
  else if(t>=8&&t<13){out.position.copy(c.workerLoad);out.yaw=loadYaw;}
  else if(t>=13&&t<16){walking(out,c.workerRoute,t,13,16,true,tangent);out.yaw=angleMix(out.yaw,homeYaw,deliveryEase(t,15.4,16));}
  else if(t>=84&&t<85){c.workerRoute.curve.getTangentAt(0,tangent);out.yaw=angleMix(homeYaw,Math.atan2(tangent.x,tangent.z),deliveryEase(t,84,85));}
  else if(t>=85&&t<88){walking(out,c.workerRoute,t,85,88,false,tangent);out.yaw=angleMix(out.yaw,loadYaw,deliveryEase(t,87,88));}
  else if(t>=88&&t<92){out.position.copy(c.workerLoad);out.yaw=loadYaw;}
  else if(t>=92&&t<94){walking(out,c.workerRoute,t,92,94,true,tangent);out.yaw=angleMix(out.yaw,homeYaw,deliveryEase(t,93.3,94));}
  if((t>=11.8&&t<13)||(t>=91&&t<92)){const a=t<20?11.8:91,b=t<20?13:92;c.workerRoute.curve.getTangentAt(1,tangent);out.yaw=angleMix(loadYaw,Math.atan2(tangent.x,tangent.z)+PI,deliveryEase(t,a,b));}
  out.crouch=deliveryEase(t,8,10)*(1-deliveryEase(t,11.2,12.8))+deliveryEase(t,88,90)*(1-deliveryEase(t,90,91.5));
  out.pelvisAbsolute=.83-.55*out.crouch;
  out.grip=deliveryEase(t,.5,2)*(1-deliveryEase(t,10.2,11.5))+deliveryEase(t,88,90)*(1-deliveryEase(t,95.5,96));
  out.seated=0;out.activity=0;
}
function studentAt(t,c,out,tangent) {
  const standing=deliveryEase(t,25,27)*(1-deliveryEase(t,48,50))+deliveryEase(t,57,59)*(1-deliveryEase(t,75,77));
  out.position.copy(c.seat).lerp(c.stand,standing);out.yaw=c.seatYaw;out.walkWeight=out.walkDistance=0;
  const meetYaw=toward(c.meet,c.robotRoute.curve.getPointAt(1,tangent));
  if(t>=27&&t<29){c.studentRoute.curve.getTangentAt(0,tangent);out.yaw=angleMix(c.seatYaw,Math.atan2(tangent.x,tangent.z),deliveryEase(t,27,29));}
  else if(t>=29&&t<34){walking(out,c.studentRoute,t,29,34,false,tangent);out.yaw=angleMix(out.yaw,meetYaw,deliveryEase(t,33.5,34));}
  else if(t>=34&&t<40){out.position.copy(c.meet);out.yaw=meetYaw;}
  else if(t>=40&&t<46){walking(out,c.studentRoute,t,40,46,true,tangent);out.yaw=angleMix(out.yaw,c.seatYaw,deliveryEase(t,45.4,46));}
  else if(t>=59&&t<60){c.studentRoute.curve.getTangentAt(0,tangent);out.yaw=angleMix(c.seatYaw,Math.atan2(tangent.x,tangent.z),deliveryEase(t,59,60));}
  else if(t>=60&&t<65){walking(out,c.studentRoute,t,60,65,false,tangent);out.yaw=angleMix(out.yaw,meetYaw,deliveryEase(t,64.5,65));}
  else if(t>=65&&t<70){out.position.copy(c.meet);out.yaw=meetYaw;}
  else if(t>=70&&t<75){walking(out,c.studentRoute,t,70,75,true,tangent);out.yaw=angleMix(out.yaw,c.seatYaw,deliveryEase(t,74.4,75));}
  if((t>=38&&t<40)||(t>=68.5&&t<70)){const a=t<50?38:68.5,b=t<50?40:70;c.studentRoute.curve.getTangentAt(1,tangent);out.yaw=angleMix(meetYaw,Math.atan2(tangent.x,tangent.z)+PI,deliveryEase(t,a,b));}
  out.crouch=deliveryEase(t,34,36)*(1-deliveryEase(t,36,39))+deliveryEase(t,65,67)*(1-deliveryEase(t,67.3,69));
  out.seated=1-standing;
  out.pelvisAbsolute=.83-.11*out.seated-.55*out.crouch;
  out.grip=deliveryEase(t,34,36)*(1-deliveryEase(t,48,49))+deliveryEase(t,56,57.5)*(1-deliveryEase(t,67,68.5));
  out.activity=deliveryEase(t,49,50)*(1-deliveryEase(t,56,57));
}
function carriedPoint(actor,out,student=false) {
  return out.set(actor.position.x+Math.sin(actor.yaw)*.27,actor.position.y+(student?1.20:.98),actor.position.z+Math.cos(actor.yaw)*.27);
}
function robotAt(t,c,out,tangent,before,after) {
  let u=0;
  if(t>=16&&t<34)u=deliveryEase(t,16,34);
  else if(t>=34&&t<71)u=1;
  else if(t>=71&&t<85)u=1-deliveryEase(t,71,85);
  c.robotRoute.curve.getPointAt(u,out.position);c.robotRoute.curve.getTangentAt(u,tangent);
  // A bidirectional base backs along its own clear route; the book stays fixed
  // to its loading pad instead of spinning through a student's reaching hands.
  out.yaw=Math.atan2(-tangent.z,tangent.x);out.distance=c.robotRoute.length*u;
  const dt=.002, a=t-dt,b=t+dt;
  const progress=s=>s>=16&&s<34?deliveryEase(s,16,34):s>=34&&s<71?1:s>=71&&s<85?1-deliveryEase(s,71,85):0;
  out.speed=c.robotRoute.length*(progress(b)-progress(a))/(2*dt);
  // A short telescopic pad raises the payload into an anatomically reachable
  // pickup window. Its support and the book use the same continuous clock.
  out.platformLift=.08*(deliveryEase(t,5,7)*(1-deliveryEase(t,13,15))+deliveryEase(t,31,33)*(1-deliveryEase(t,40,42))+deliveryEase(t,62,64)*(1-deliveryEase(t,71,73))+deliveryEase(t,85,87)*(1-deliveryEase(t,93,95)));
  out.bodyLift=Math.sin(out.distance*34)*.0012*Math.min(1,Math.abs(out.speed)/.35);
  c.robotRoute.curve.getTangentAt(Math.max(0,u-.002),before);c.robotRoute.curve.getTangentAt(Math.min(1,u+.002),after);
  out.curvature=Math.atan2(before.z*after.x-before.x*after.z,before.dot(after))/(Math.max(.004,Math.min(1,u+.002)-Math.max(0,u-.002))*c.robotRoute.length);
}

/** One persistent book, evaluated from one shared 96-second service clock. */
export function campusDeliveryAt(seconds,index=0,out=campusDeliveryState()) {
  const c=CONFIG[index===1?1:0],elapsed=Number.isFinite(seconds)?Math.max(0,seconds):0,t=(elapsed+c.offset)%CAMPUS_DELIVERY_CYCLE;
  out.phase=t;workerAt(t,c,out.worker,out.tangent);studentAt(t,c,out.student,out.tangent);
  robotAt(t,c,out.robot,out.tangent,out.before,out.after);
  out.chair.copy(c.seat);out.chair.z+=(index===1?-1:1)*.16*(1-out.student.seated);
  const book=out.book,workerCarry=carriedPoint(out.worker,out.scratch);
  book.position.copy(c.counter);book.yaw=0;book.open=0;out.host='counter';
  const deck=out.after.copy(out.robot.position);deck.y+=.281+out.robot.platformLift+out.robot.bodyLift;
  if(t>=2&&t<4){book.position.lerp(workerCarry,deliveryEase(t,2,4));book.yaw=angleMix(0,out.worker.yaw,deliveryEase(t,2,4));out.host='worker';}
  else if(t>=4&&t<8){book.position.copy(workerCarry);book.yaw=out.worker.yaw;out.host='worker';}
  else if(t>=8&&t<10){const f=deliveryEase(t,8,10);book.position.copy(workerCarry).lerp(deck,f);book.yaw=angleMix(out.worker.yaw,out.robot.yaw,f);out.host='worker';}
  else if(t>=10&&t<36){book.position.copy(deck);book.yaw=out.robot.yaw;out.host='robot';}
  else if(t>=36&&t<39){const f=deliveryEase(t,36,39);book.position.copy(deck).lerp(carriedPoint(out.student,out.scratch,true),f);book.yaw=angleMix(out.robot.yaw,out.student.yaw,f);out.host='student';}
  else if(t>=39&&t<46){book.position.copy(carriedPoint(out.student,out.scratch,true));book.yaw=out.student.yaw;out.host='student';}
  else if(t>=46&&t<48){const f=deliveryEase(t,46,48);book.position.copy(carriedPoint(out.student,out.scratch,true)).lerp(c.table,f);book.yaw=angleMix(out.student.yaw,c.seatYaw,f);out.host='student';}
  else if(t>=48&&t<58){book.position.copy(c.table);book.yaw=c.seatYaw;book.open=deliveryEase(t,49,51)*(1-deliveryEase(t,56,57.5))*1.9;out.host='table';}
  else if(t>=58&&t<60){const f=deliveryEase(t,58,60);book.position.copy(c.table).lerp(carriedPoint(out.student,out.scratch,true),f);book.yaw=angleMix(c.seatYaw,out.student.yaw,f);out.host='student';}
  else if(t>=60&&t<65){book.position.copy(carriedPoint(out.student,out.scratch,true));book.yaw=out.student.yaw;out.host='student';}
  else if(t>=65&&t<67){const f=deliveryEase(t,65,67);book.position.copy(carriedPoint(out.student,out.scratch,true)).lerp(deck,f);book.yaw=angleMix(out.student.yaw,out.robot.yaw,f);out.host='student';}
  else if(t>=67&&t<90){book.position.copy(deck);book.yaw=out.robot.yaw;out.host='robot';}
  else if(t>=90&&t<91.5){const f=deliveryEase(t,90,91.5);book.position.copy(deck).lerp(workerCarry,f);book.yaw=angleMix(out.robot.yaw,out.worker.yaw,f);out.host='worker';}
  else if(t>=91.5&&t<94){book.position.copy(workerCarry);book.yaw=out.worker.yaw;out.host='worker';}
  else if(t>=94&&t<95.5){const f=deliveryEase(t,94,95.5);book.position.copy(workerCarry).lerp(c.counter,f);book.yaw=angleMix(out.worker.yaw,0,f);out.host='worker';}
  out.task=t<4?'requisitar o volume no balcão':t<10?'colocar o volume na base móvel':t<16?'liberar o corredor':t<34?'levar o volume ao estudante':t<39?'retirar o livro da base':t<48?'levar o livro à mesa':t<58?'consultar o volume e as notas digitais':t<67?'devolver o mesmo volume à base':t<71?'recuar e liberar a passagem':t<85?'retornar ao balcão':t<95?'recolocar o volume no acervo':'concluir a conferência';
  return out;
}
