export const COURIER_FLOOR=-.89;
export const COURIER_X=8.25;
const clamp=n=>Math.max(0,Math.min(1,n));
export const deliveryEase=(t,a,b)=>{const p=clamp((t-a)/(b-a));return clamp(p*p*p*(p*(p*6-15)+10));};
const mix=(a,b,t)=>a+(b-a)*t;
const angleMix=(a,b,f)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*f;
// Coasting between short eased acceleration ramps gives a measured walking
// speed without a sprint in the middle of a minimum-jerk position tween.
const walkingProgress=(t,a,b)=>{const u=clamp((t-a)/(b-a)),r=.14,area=x=>x*x*x-.5*x*x*x*x;if(u<r)return r*area(u/r)/(1-r);if(u>1-r)return 1-r*area((1-u)/r)/(1-r);return(u-r/2)/(1-r);};
function backPoint(f){const k=1-f;return[ k*k*k*9.45+3*k*k*f*9.55+3*k*f*f*9.55+f*f*f*8.72,k*k*k*1.96+3*k*k*f*3.9+3*k*f*f*6.74+f*f*f*6.74 ];}
function backYaw(f){const k=1-f,dx=3*k*k*.10-3*f*f*.83,dz=3*k*k*1.94+6*k*f*2.84;return Math.atan2(dx,dz);}
const backLengths=[0];
for(let i=1;i<=256;i++){const a=backPoint((i-1)/256),b=backPoint(i/256);backLengths.push(backLengths[i-1]+Math.hypot(b[0]-a[0],b[1]-a[1]));}
const backDistance=f=>{const v=clamp(f)*256,i=Math.min(255,Math.floor(v));return mix(backLengths[i],backLengths[i+1],v-i);};

function courierPoseAt(t){
 const e=deliveryEase;
 const approach=e(t,0,8),depart=e(t,48,59);
 const straight=9.7,radius=2.55,arc=radius*Math.PI/2,totalPath=straight+arc+1.2;
 const distanceOnRoad=totalPath*(approach-depart);
 let truckX,truckZ,truckYaw;
 if(distanceOnRoad<straight){truckX=-4+distanceOnRoad;truckZ=7.2;truckYaw=-Math.PI/2;}
 else if(distanceOnRoad<straight+arc){const a=Math.PI/2-(distanceOnRoad-straight)/radius;truckX=5.7+radius*Math.cos(a);truckZ=4.65+radius*Math.sin(a);truckYaw=Math.atan2(-Math.sin(a),Math.cos(a));}
 else{truckX=COURIER_X;truckZ=4.65-(distanceOnRoad-straight-arc);truckYaw=0;}
 const door=e(t,8.3,9.4)*(1-e(t,11.2,12.2))+e(t,44.5,45.4)*(1-e(t,47,48));
 const rollup=e(t,13,15)*(1-e(t,42,44));
 const rear=1.60+1.0*(e(t,16,19)-e(t,38,41));
 const deck=.82-.10*e(t,20,22)+.10*e(t,36,38);
 const shift=1.20*(e(t,24,28)-e(t,32,36));
 const caseX=truckX+Math.sin(truckYaw)*rear-shift,caseZ=truckZ+Math.cos(truckYaw)*rear;
 let driverX=truckX+.36*Math.cos(truckYaw)-1.49*Math.sin(truckYaw),driverZ=truckZ-.36*Math.sin(truckYaw)-1.49*Math.cos(truckYaw),seated=1,walk=0,distance=0,yaw=truckYaw+Math.PI,motionYaw=yaw;
 const outside=[9.45,1.96],work=[caseX+.47,6.74];
 const roundBack=f=>{
  const p=backPoint(f);driverX=p[0];driverZ=p[1];
 };
 if(t>=9.4&&t<11.2){const f=e(t,9.4,11.2);driverX=mix(COURIER_X+.36,outside[0],f);driverZ=mix(truckZ-1.49,outside[1],f);seated=1-f;yaw=angleMix(truckYaw+Math.PI,Math.PI/2,e(t,9.4,10.6));}
 else if(t>=11.2&&t<12.2){driverX=outside[0];driverZ=outside[1];seated=0;yaw=angleMix(Math.PI/2,backYaw(0),e(t,11.2,12.2));}
 else if(t>=12.2&&t<16){const f=walkingProgress(t,12.2,16);roundBack(f);seated=0;walk=e(t,12.2,12.5)*(1-e(t,15.7,16));distance=backDistance(f);motionYaw=backYaw(f);const workingYaw=Math.atan2(caseX-8.72,caseZ-6.74);yaw=angleMix(motionYaw,workingYaw,e(t,15,16));}
 else if(t>=16&&t<42){driverX=work[0];driverZ=work[1];seated=0;yaw=Math.atan2(caseX-driverX,caseZ-driverZ);walk=e(t,24,24.3)*(1-e(t,27.7,28))+e(t,32,32.3)*(1-e(t,35.7,36));distance=t<32?shift:1.20-shift;motionYaw=t<30?-Math.PI/2:Math.PI/2;yaw=angleMix(yaw,backYaw(1)+Math.PI,e(t,40.5,42));}
 else if(t>=42&&t<45.4){const f=walkingProgress(t,42,45.4);roundBack(1-f);seated=0;walk=e(t,42,42.3)*(1-e(t,45.1,45.4));distance=backLengths[256]-backDistance(1-f);motionYaw=backYaw(1-f)+Math.PI;yaw=motionYaw;}
 else if(t>=45.4&&t<45.8){driverX=outside[0];driverZ=outside[1];seated=0;yaw=angleMix(backYaw(0)+Math.PI,-Math.PI/2,e(t,45.4,45.8));}
 else if(t>=45.8&&t<47){const f=e(t,45.8,47);driverX=mix(outside[0],COURIER_X+.36,f);driverZ=mix(outside[1],truckZ-1.49,f);seated=f;yaw=angleMix(-Math.PI/2,truckYaw+Math.PI,e(t,46.1,47));}
 const carrying=e(t,22.5,23.5)*(1-e(t,37,38));
 const receivingBridge=e(t,12,16)*(1-e(t,42,47));
 const bridgeX=mix(10.9,7.3,receivingBridge),bridgeZ=mix(6.2,6.05,receivingBridge);
 const wheelSpin=distanceOnRoad/.265;
 const steering=-.37*e(distanceOnRoad,straight-.25,straight+.45)*(1-e(distanceOnRoad,straight+arc-.45,straight+arc+.25));
 return{t,truckX,truckZ,truckYaw,steering,door,rollup,rear,deck,caseX,caseZ,caseY:COURIER_FLOOR+deck,bridgeX,bridgeZ,driverX,driverZ,seated,walk,distance,yaw,motionYaw,carrying,wheelSpin,
  task:t<8?'aproximar o caminhão':t<12.2?'descer pela porta da cabine':t<16?'abrir o compartimento e contornar o veículo':t<19?'rolar a caixa para a plataforma':t<24?'alinhar a plataforma aos roletes':t<28?'descarregar em dupla':t<32?'conferir os volumes':t<36?'devolver a caixa conferida':t<41?'repor a caixa no compartimento':t<44?'recolher e fechar a porta':t<48?'voltar à cabine':'recuar com a passagem livre'};
}

/** Finite arrival–unload–departure operation; parked poses never wrap/reset. */
export function courierOperationPhase(seconds){
 const elapsed=Math.max(0,Number(seconds)||0);
 if(elapsed<24)return elapsed;
 if(elapsed<150)return 24;
 if(elapsed<162)return 42+(elapsed-150)*.5;
 if(elapsed<176)return 48+(elapsed-162)*11/14;
 return 59;
}

export function realCourierAt(seconds){
 const elapsed=Math.max(0,Number(seconds)||0),phase=courierOperationPhase(elapsed),state=courierPoseAt(phase);
 const bridge=deliveryEase(elapsed,12,16)*(1-deliveryEase(elapsed,150,160));
 state.operationTime=elapsed;state.complete=elapsed>=176;
 state.bridgeX=mix(10.9,7.3,bridge);state.bridgeZ=mix(6.2,6.05,bridge);
 state.deploy=deliveryEase(elapsed,14,16)*(1-deliveryEase(elapsed,150,156));
 if(elapsed>=24&&elapsed<150){
  state.deck=.72+.10*deliveryEase(elapsed,146,150);
  // Face the departure path before walking back around the cab.
  state.yaw=angleMix(state.yaw,backYaw(1)+Math.PI,deliveryEase(elapsed,148,150));
 }
 state.carrying=0;
 state.task=elapsed<8?'chegar com os volumes do acervo':elapsed<16?'descer e preparar o recebimento':elapsed<24?'carregar os volumes no carrinho azul':elapsed<150?'conferir e entregar os volumes da remessa':elapsed<156?'recolher a plataforma e fechar o compartimento':elapsed<162?'voltar à cabine com a passagem livre':elapsed<176?'deixar a área de recebimento':'remessa entregue · caminhão na saída';
 return state;
}

/** Exact bottom-pivot sockets on the original tilted blue hand truck.
 * `pitch` is additional slope inclination, around the tool's wheel-side pivot;
 * the original -0.18rad transport tilt is already included in the flat sockets.
 */
export function porterToolPoint(position,yaw,local,pitch=0){
 const dy=local[1]-.10,dz=local[2]-.42,cp=Math.cos(pitch),sp=Math.sin(pitch);
 const x=local[0],y=.10+cp*dy-sp*dz,z=.42+sp*dy+cp*dz,c=Math.cos(yaw),s=Math.sin(yaw);
 return[position[0]+c*x+s*z,position[1]+y,position[2]-s*x+c*z];
}
export function porterCargoSocket(position,yaw,index=0,pitch=0){
 const h=.265*index,local=[0,.069+Math.cos(-.18)*h,.552+Math.sin(-.18)*h];
 return porterToolPoint(position,yaw,local,pitch);
}
