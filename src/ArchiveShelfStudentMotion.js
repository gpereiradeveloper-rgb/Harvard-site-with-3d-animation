import {CatmullRomCurve3, Quaternion, Euler, Vector3} from 'three';

export const SHELF_STUDENT_CYCLE=140;
export const SHELF_STUDENT_SEAT=[-3.40,.095,2.45];
export const SHELF_STUDENT_SLOT=[-1.35,1.235,-3.535];
export const SHELF_STUDENT_DESK=[-3.25,1.2185,2.96];
export const SHELF_STUDENT_DEVICE=[-3.61,1.183,2.91];
const PI=Math.PI,clamp=n=>Math.max(0,Math.min(1,n));
const ease=(t,a,b)=>{const u=clamp((t-a)/(b-a));return clamp(u*u*u*(u*(u*6-15)+10));};
const angleMix=(a,b,f)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*f;
const floor=.095,seat=new Vector3(...SHELF_STUDENT_SEAT),stand=new Vector3(-3.4,floor,2.58);
const slot=new Vector3(...SHELF_STUDENT_SLOT),desk=new Vector3(...SHELF_STUDENT_DESK);
// The aisle stays north of the two reading tables, then east of the large
// catalogue table. It also clears the stationary archivist at x=-.72.
const route=new CatmullRomCurve3([
  [-3.4,2.58],[-2.94,2.48],[-2.85,1.79],[-1.2,1.65],[-.15,1.65],
  [-.15,.7],[-.15,-1.7],[-.35,-2.8],[-1.35,-3.13],
].map(([x,z])=>new Vector3(x,floor,z)),false,'centripetal',.5);
route.arcLengthDivisions=700;
const length=route.getLength(),startTangent=route.getTangentAt(0),endTangent=route.getTangentAt(1);
const startYaw=Math.atan2(startTangent.x,startTangent.z),endYaw=Math.atan2(endTangent.x,endTangent.z);
const standingBook=new Quaternion().setFromEuler(new Euler(PI/2,0,0));
const flatBook=new Quaternion();

export function shelfStudentState(){return{
  phase:0,task:'',host:'shelf',position:new Vector3(),yaw:0,seated:1,
  pelvisAbsolute:.72,walkWeight:0,walkDistance:0,grip:0,reading:0,
  chair:new Vector3(),bookPosition:new Vector3(),bookQuaternion:new Quaternion(),cover:0,
  tangent:new Vector3(),carry:new Vector3(),carryQuaternion:new Quaternion(),euler:new Euler(),
};}

function walk(t,a,b,reverse,out){
 const f=ease(t,a,b),u=reverse?1-f:f;
 route.getPointAt(u,out.position);route.getTangentAt(u,out.tangent);
 out.yaw=Math.atan2(out.tangent.x,out.tangent.z)+(reverse?PI:0);
 out.walkWeight=ease(t,a,a+.55)*(1-ease(t,b-.55,b));
 out.walkDistance=length*f;
}

/** A single student and volume complete a continuous shelf–desk–shelf trip. */
export function shelfStudentAt(seconds,out=shelfStudentState()){
 const t=((Math.max(0,Number(seconds)||0)%SHELF_STUDENT_CYCLE)+SHELF_STUDENT_CYCLE)%SHELF_STUDENT_CYCLE;
 const upright=ease(t,8,10)*(1-ease(t,61,63))+ease(t,82,84)*(1-ease(t,134,136));
 out.phase=t;out.position.copy(seat).lerp(stand,upright);out.yaw=0;out.walkWeight=out.walkDistance=0;
 if(t>=10&&t<11)out.yaw=angleMix(0,startYaw,ease(t,10,11));
 else if(t>=11&&t<30){walk(t,11,30,false,out);out.yaw=angleMix(out.yaw,PI,ease(t,29,30));}
 else if(t>=30&&t<38){route.getPointAt(1,out.position);out.yaw=angleMix(PI,endYaw+PI,ease(t,36,38));}
 else if(t>=38&&t<57){walk(t,38,57,true,out);out.yaw=angleMix(out.yaw,0,ease(t,56,57));}
 else if(t>=84&&t<86)out.yaw=angleMix(0,startYaw,ease(t,84,86));
 else if(t>=86&&t<105){walk(t,86,105,false,out);out.yaw=angleMix(out.yaw,PI,ease(t,104,105));}
 else if(t>=105&&t<113){route.getPointAt(1,out.position);out.yaw=angleMix(PI,endYaw+PI,ease(t,111,113));}
 else if(t>=113&&t<132){walk(t,113,132,true,out);out.yaw=angleMix(out.yaw,0,ease(t,131,132));}
 out.seated=1-upright;out.pelvisAbsolute=.83-.11*out.seated;
 out.chair.copy(seat);out.chair.z-=.16*upright;
 out.grip=ease(t,32,34)*(1-ease(t,61,63))+ease(t,80,82)*(1-ease(t,111,113));
 out.reading=ease(t,63,65)*(1-ease(t,79,81));
 // Turn the seated torso toward the separate laptop or open volume instead of
 // pulling the right hand across the entire desk with a fixed forward torso.
 out.yaw+=(-.23+.35*out.reading)*out.seated;
 out.carry.set(out.position.x+Math.sin(out.yaw)*.28,floor+1.20,out.position.z+Math.cos(out.yaw)*.28);
 out.euler.set(0,out.yaw,0);out.carryQuaternion.setFromEuler(out.euler);
 out.bookPosition.copy(slot);out.bookQuaternion.copy(standingBook);out.host='shelf';out.cover=0;
 const carrying=()=>{out.bookPosition.copy(out.carry);out.bookQuaternion.copy(out.carryQuaternion);out.host='student';};
 if(t>=34&&t<36){const f=ease(t,34,36);out.bookPosition.lerp(out.carry,f);out.bookQuaternion.slerp(out.carryQuaternion,f);out.host='student';}
 else if(t>=36&&t<59)carrying();
 else if(t>=59&&t<61){const f=ease(t,59,61);carrying();out.bookPosition.lerp(desk,f);out.bookQuaternion.slerp(flatBook,f);}
 else if(t>=61&&t<80){out.bookPosition.copy(desk);out.bookQuaternion.identity();out.host='desk';out.cover=1.95*ease(t,64,66)*(1-ease(t,77,79));}
 else if(t>=80&&t<82){const f=ease(t,80,82);out.bookPosition.copy(desk).lerp(out.carry,f);out.bookQuaternion.identity().slerp(out.carryQuaternion,f);out.host='student';}
 else if(t>=82&&t<109)carrying();
 else if(t>=109&&t<111){const f=ease(t,109,111);carrying();out.bookPosition.lerp(slot,f);out.bookQuaternion.slerp(standingBook,f);}
 out.task=t<8?'consultar as notas digitais':t<11?'afastar a cadeira e levantar':t<30?'ir à estante pelo corredor':t<34?'localizar o volume na prateleira':t<38?'retirar o mesmo livro':t<57?'levar o livro à mesa':t<63?'apoiar o volume e sentar':t<80?'consultar o livro e as notas':t<86?'fechar o volume e levantar':t<105?'levar o livro de volta à estante':t<113?'repor o volume na posição original':t<136?'retornar à cadeira':'retomar as notas digitais';
 return out;
}

export const SHELF_STUDENT_ROUTE_LENGTH=length;
