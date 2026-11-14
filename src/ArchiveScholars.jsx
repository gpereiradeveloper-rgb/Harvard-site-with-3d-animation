import React,{Suspense,useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ImportedScholar} from './ArchiveReadyModels';
import {StudyDevice} from './ArchiveStudyDevices';
import {realCourierAt,deliveryEase,COURIER_FLOOR} from './ArchiveCourierMotion';
import {supplyChainAt} from './ArchiveSupplyChain';
import {ReadyArchiveTable,ReadyReadingChair} from './ArchiveCollectionModels';
import ArchiveShelfStudent from './ArchiveShelfStudent';

// Imported, locally hosted CC0 skinned characters follow the authored archival
// tasks. The former articulated miniatures remain the progressive-load fallback.
const PI=Math.PI,DOWN=new THREE.Vector3(0,-1,0),UP=new THREE.Vector3(0,1,0);
const clamp=n=>Math.max(0,Math.min(1,n));
const ease=n=>{n=clamp(n);return n*n*n*(n*(n*6-15)+10);};
const phase=(t,a,b)=>ease((t-a)/(b-a));
const lerp=THREE.MathUtils.lerp;
const set=(v,x,y,z)=>v.set(x,y,z);

const SHELF_END=[-1.20,1.035,-.38];
const READING_DESK=[-1.21,1.267,.22];
const SCHOLAR_GROUND=.095;
const SHELF_TO_DESK=READING_DESK[2]-SHELF_END[2];
const BOOK_CYCLE=22;
const SHELF_READER_SCALE=1.10;

/** The same volume completes a shelf–desk–shelf circuit. */
export function archiveScholarCycleAt(seconds,out={}){
 const total=Math.max(0,Number(seconds)||0),t=total%BOOK_CYCLE;
 const outbound=phase(t,2.25,3.55),inbound=phase(t,13,14.3);
 out.t=t;out.cycle=Math.floor(total/BOOK_CYCLE);out.x=-.72;
 out.z=SHELF_END[2]+SHELF_TO_DESK*(outbound-inbound);
 out.yaw=-PI/2+PI/2*(phase(t,1.65,2.25)-phase(t,3.55,4.15)-phase(t,12.35,13)+phase(t,14.3,15));
 out.walking=t>=2.25&&t<3.55||t>=13&&t<14.3;
 out.returning=t>=13&&t<14.3;out.distance=SHELF_TO_DESK*(out.returning?inbound:outbound);
 out.bookT=phase(t,.85,1.65)-phase(t,4.15,5.05)+phase(t,11.55,12.35)-phase(t,15,15.9);
 out.atDesk=t>=4.15&&t<12.35;out.delivered=t>=5.05&&t<11.55;
 out.payload=t>=.85&&t<5.05||t>=11.55&&t<15.9?'book':'empty';
 out.cover=(phase(t,5.12,6.05)-phase(t,10.65,11.52))*PI*.91;
 out.grasp=phase(t,0,.85)-phase(t,15.9,16.75);
 out.lean=.035*(phase(t,0,.85)-phase(t,.85,1.65)+phase(t,15,15.9)-phase(t,15.9,16.75))
  +.225*(phase(t,4.15,5.05)-phase(t,11.55,12.35));
 if(t<.85)out.task='escolher um volume na estante';
 else if(t<2.25)out.task='retirar o livro';
 else if(t<4.15)out.task='levar o livro à mesa';
 else if(t<5.12)out.task='apoiar o livro na mesa';
 else if(t<6.05)out.task='abrir a capa';
 else if(t<10.65)out.task='acompanhar o texto';
 else if(t<11.55)out.task='fechar o volume';
 else if(t<15)out.task='levar o volume de volta à estante';
 else if(t<15.9)out.task='recolocar o livro na prateleira';
 else out.task='conferir a posição do livro';
 return out;
}

function makeKit(assets){
 const geometries=[],materials=[],textures=[];
 const own=g=>{geometries.push(g);return g;};
 const box=own(new RoundedBoxGeometry(1,1,1,2,.10));
 const sphere=own(new THREE.SphereGeometry(1,28,20));
 const capsule=own(new THREE.CapsuleGeometry(.5,1,6,16));
 const cylinder=own(new THREE.CylinderGeometry(1,1,1,24));
 const ring=own(new THREE.TorusGeometry(1,.10,8,24));
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#808080';ctx.fillRect(0,0,128,128);
 for(let y=0;y<128;y+=2){ctx.fillStyle=y%4?'#8a8a8a':'#777777';ctx.fillRect(0,y,128,1);}
 for(let x=0;x<128;x+=2){ctx.fillStyle=x%4?'rgba(240,240,240,.12)':'rgba(0,0,0,.10)';ctx.fillRect(x,0,1,128);}
 const cloth=new THREE.CanvasTexture(canvas);cloth.wrapS=cloth.wrapT=THREE.RepeatWrapping;cloth.repeat.set(3,3);textures.push(cloth);
 const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.82,...extra});materials.push(m);return m;};
 const m={
  coat:[mat('#394940',{bumpMap:cloth,bumpScale:.012}),mat('#733e48',{bumpMap:cloth,bumpScale:.012}),mat('#334454',{bumpMap:cloth,bumpScale:.012}),mat('#7e8874',{bumpMap:cloth,bumpScale:.012})],
  skin:[mat('#c88e6e'),mat('#8d5c42'),mat('#d9ad87'),mat('#b67c5b')],
  hair:[mat('#40352e'),mat('#252523'),mat('#6a645b'),mat('#45352a')],
  shirt:mat('#e9e3d3',{bumpMap:cloth,bumpScale:.005}),ink:mat('#252e2c'),shoe:mat('#302d2a',{roughness:.42}),sole:mat('#171e1b'),
  gold:mat('#c3a76b',{metalness:.65,roughness:.35}),lips:mat('#80564a'),eye:mat('#efe9de',{roughness:.46}),iris:mat('#4d5b4a',{roughness:.43}),paper:mat('#f7edcf',{map:assets?.mats?.paper?.map}),
  red:mat('#8c4c4c'),green:mat('#476354'),pencil:mat('#c4a465'),graphite:mat('#45413a'),
 };
 const torsoShape=new THREE.Shape();torsoShape.moveTo(-.15,-.19);torsoShape.lineTo(.15,-.19);torsoShape.lineTo(.19,.19);torsoShape.quadraticCurveTo(0,.23,-.19,.19);torsoShape.closePath();
 const torso=own(new THREE.ExtrudeGeometry(torsoShape,{depth:.15,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.025,bevelThickness:.025}));torso.translate(0,0,-.075);
 const lapelShape=new THREE.Shape();lapelShape.moveTo(0,.12);lapelShape.lineTo(.075,.03);lapelShape.lineTo(.015,-.12);lapelShape.lineTo(-.025,.04);lapelShape.closePath();
 const lapel=own(new THREE.ExtrudeGeometry(lapelShape,{depth:.01,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.004,bevelThickness:.003}));
 const fingers=[];
 const piece=(position,scale,rotation=0)=>{const g=box.clone();g.scale(...scale);g.rotateZ(rotation);g.translate(...position);fingers.push(g);};
 piece([0,0,0],[.068,.082,.036]);
 for(let i=0;i<4;i++)piece([-.025+i*.017,-.057+(i===0||i===3?.006:0),.003],[.015,.057,.025]);
 piece([.044,-.005,.006],[.027,.050,.027],-.5);
 const hand=own(mergeGeometries(fingers));fingers.forEach(g=>g.dispose());
 // Bake the immobile clothing/face detail once per palette. Individual hands,
 // limbs, torso lean and the head's independent rotation stay articulated.
 const bake=parts=>{
  const matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion(),euler=new THREE.Euler();
  const position=new THREE.Vector3(),scale=new THREE.Vector3(),pieces=[];
  for(const [source,material,p=[0,0,0],s=[1,1,1],r=[0,0,0]] of parts){
   const clone=source.clone(),geometry=clone.index?clone.toNonIndexed():clone;
   if(geometry!==clone)clone.dispose();
   position.fromArray(p);scale.fromArray(s);euler.set(...r);quaternion.setFromEuler(euler);
   matrix.compose(position,quaternion,scale);geometry.applyMatrix4(matrix);
   if(matrix.determinant()<0){
    // Mirroring the right lapel changes winding, not its outward normals.
    for(const attribute of Object.values(geometry.attributes)){
     const array=attribute.array,size=attribute.itemSize;
     for(let v=0;v<attribute.count;v+=3)for(let c=0;c<size;c++){
      const a=(v+1)*size+c,b=(v+2)*size+c,value=array[a];array[a]=array[b];array[b]=value;
     }
    }
   }
   const count=geometry.attributes.position.count,colors=new Float32Array(count*3),color=material.color;
   for(let v=0;v<count;v++){colors[v*3]=color.r;colors[v*3+1]=color.g;colors[v*3+2]=color.b;}
   geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.clearGroups();pieces.push(geometry);
  }
  const merged=own(mergeGeometries(pieces,false));pieces.forEach(g=>g.dispose());
  merged.computeBoundingBox();merged.computeBoundingSphere();merged.userData.sourcePartCount=parts.length;
  return merged;
 };
 m.rigBody=mat('#ffffff',{vertexColors:true,roughness:.79,bumpMap:cloth,bumpScale:.006});
 m.rigHead=mat('#ffffff',{vertexColors:true,roughness:.75});
 const rigBodies=[],rigHeads=[];
 for(let variant=0;variant<4;variant++){
  const coat=m.coat[variant],skin=m.skin[variant],hair=m.hair[variant];
  const bodyParts=[
   [box,m.ink,[0,-.015,0],[.27,.11,.19]],
   [torso,coat,[0,.20,0]],
   [box,m.shirt,[0,.31,.105],[.13,.19,.023]],
   [box,m.shirt,[-.044,.393,.108],[.068,.067,.022],[0,0,-.40]],
   [box,m.shirt,[.044,.393,.108],[.068,.067,.022],[0,0,.40]],
   [lapel,coat,[-.087,.29,.116],[1,1,1],[0,0,-.15]],
   [lapel,coat,[.087,.29,.116],[-1,1,1],[0,0,.15]],
   ...[.16,.22,.28].map(y=>[sphere,m.gold,[0,y,.128],[.009,.009,.005]]),
   [box,m.gold,[-.113,.292,.137],[.033,.044,.008]],
   [box,m.shirt,[-.113,.292,.143],[.023,.032,.003]],
   // Separate pocket lips, stitched hems and belt have readable thickness;
   // they are baked into this mesh rather than extra animated draw calls.
   [box,coat,[-.125,.095,.101],[.093,.033,.014]],
   [box,coat,[.125,.095,.101],[.093,.033,.014]],
   [box,m.shirt,[-.124,.111,.109],[.076,.003,.003]],
   [box,m.shirt,[.124,.111,.109],[.076,.003,.003]],
   [box,m.ink,[0,-.011,.102],[.24,.025,.010]],
   [box,m.gold,[0,-.011,.109],[.030,.023,.009]],
   [box,m.ink,[0,-.011,.115],[.020,.013,.004]],
   [cylinder,skin,[0,.436,0],[.060,.089,.059]],
  ];
  const headParts=[
   [sphere,skin,[0,0,0],[.108,.140,.103]],
   [sphere,hair,[0,.073,-.025],[.112,.078,.096]],
   [sphere,hair,[0,.016,-.075],[.100,.091,.039]],
  ];
  for(const side of [-1,1]){
   headParts.push(
    [sphere,skin,[side*.108,-.008,0],[.024,.039,.021]],
    [sphere,m.lips,[side*.111,-.008,.012],[.011,.024,.010]],
    [sphere,m.eye,[side*.037,.014,.095],[.016,.010,.007]],
    [sphere,m.iris,[side*.037,.014,.101],[.008,.008,.004]],
    [sphere,m.ink,[side*.037,.014,.104],[.004,.005,.002]],
    [box,hair,[side*.038,.036,.094],[.037,.009,.009],[0,0,side*.08]],
   );
   if(variant===0)headParts.push([ring,m.gold,[side*.039,.014,.106],[.033,.028,.022]]);
  }
  headParts.push(
   [sphere,skin,[0,-.006,.104],[.018,.034,.027]],
   [box,m.lips,[0,-.060,.096],[.037,.007,.007]],
   [sphere,skin,[0,-.103,.036],[.057,.028,.049]],
  );
  if(variant===0)headParts.push([box,m.gold,[0,.014,.109],[.018,.004,.004]]);
  rigBodies.push(bake(bodyParts));rigHeads.push(bake(headParts));
 }
 const pageCanvas=document.createElement('canvas');pageCanvas.width=1024;pageCanvas.height=768;
 const pc=pageCanvas.getContext('2d');pc.fillStyle='#eee2c3';pc.fillRect(0,0,1024,768);
 // Fine, quiet paper fibres and actual typesetting remain readable up close.
 for(let i=0;i<1800;i++){
  const x=(i*79.43)%1024,y=(i*137.71)%768;
  pc.fillStyle=i%2?'rgba(95,75,43,.055)':'rgba(255,252,233,.15)';pc.fillRect(x,y,1+(i%3),.65);
 }
 pc.fillStyle='#34423a';pc.font='42px Georgia';pc.fillText('HARVARD',70,100);
 pc.font='24px Georgia';pc.fillText('Arquivo de ideias',70,148);pc.strokeStyle='#aa986f';pc.lineWidth=2;pc.strokeRect(40,35,944,695);
 const pageLines=[
  'O conhecimento começa com uma pergunta.',
  'Entre livros e anotações, uma ideia encontra',
  'outra. A leitura pede tempo, atenção e cuidado.',
  '',
  'Cada página preserva uma perspectiva;',
  'cada leitor descobre um novo caminho.',
  'Consultar, comparar, registrar e compartilhar:',
  'gestos pequenos que mantêm vivo o acervo.',
  '',
  'Este caderno reúne observações de estudo,',
  'memórias do campus e caminhos de descoberta.',
  'Uma história continua quando é lida de novo.',
 ];
 pc.font='26px Georgia';pageLines.forEach((line,row)=>{pc.fillStyle=row===0?'#645033':'#7a6a4e';pc.fillText(line,75,222+row*34);});
 pc.font='18px Georgia';pc.fillStyle='#887454';pc.textAlign='center';pc.fillText('VERITAS  ·  CADERNO DE ESTUDO',512,682);pc.fillText('12',512,710);
 const pageMap=new THREE.CanvasTexture(pageCanvas);pageMap.colorSpace=THREE.SRGBColorSpace;pageMap.anisotropy=8;textures.push(pageMap);
 m.print=mat('#ffffff',{map:pageMap,side:THREE.DoubleSide,roughness:.94});
 m.leafFront=mat('#ffffff',{map:pageMap,side:THREE.FrontSide,roughness:.94});
 m.leafBack=mat('#ffffff',{map:pageMap,side:THREE.BackSide,roughness:.94});
 const page=own(new THREE.PlaneGeometry(.25,.35,18,1));page.rotateX(-PI/2);page.translate(.125,0,0);
 return{box,sphere,capsule,cylinder,ring,torso,lapel,hand,page,rigBodies,rigHeads,m,dispose(){geometries.forEach(g=>g.dispose());materials.forEach(a=>a.dispose());textures.forEach(t=>t.dispose());}};
}

function Part({kit,geometry='box',material,position,scale,rotation,shadow=false}){
 return <mesh geometry={kit[geometry]} material={material} position={position} scale={scale} rotation={rotation} castShadow={shadow} receiveShadow/>;
}
function limbScratch(){return{start:new THREE.Vector3(),target:new THREE.Vector3(),direction:new THREE.Vector3(),pole:new THREE.Vector3(),bend:new THREE.Vector3(),joint:new THREE.Vector3(),a:new THREE.Vector3(),b:new THREE.Vector3(),q:new THREE.Quaternion(),q2:new THREE.Quaternion(),inv:new THREE.Quaternion()};}
function poseAt(pelvis=.55){return{pelvis,lean:0,headPitch:0,headYaw:0,leftHand:new THREE.Vector3(-.21,.77,.10),rightHand:new THREE.Vector3(.21,.77,.10),leftFoot:new THREE.Vector3(-.10,.055,.04),rightFoot:new THREE.Vector3(.10,.055,-.04)};}

// Two-bone IK keeps the planted feet and working hands attached to their task.
function solveLimb(ref,start,target,lengthA,lengthB,pole,scratch,foot=false){
 const joint=ref.current;if(!joint)return;
 const s=scratch;s.direction.subVectors(target,start);const d=THREE.MathUtils.clamp(s.direction.length(),.025,lengthA+lengthB-.0001);s.direction.normalize();
 s.bend.copy(pole).addScaledVector(s.direction,-pole.dot(s.direction));
 if(s.bend.lengthSq()<.0001)s.bend.set(0,0,1);s.bend.normalize();
 const along=(lengthA*lengthA-lengthB*lengthB+d*d)/(2*d),height=Math.sqrt(Math.max(0,lengthA*lengthA-along*along));
 s.joint.copy(start).addScaledVector(s.direction,along).addScaledVector(s.bend,height);
 s.a.subVectors(s.joint,start).normalize();s.b.copy(start).addScaledVector(s.direction,d).sub(s.joint).normalize();
 s.q.setFromUnitVectors(DOWN,s.a);s.q2.setFromUnitVectors(DOWN,s.b);
 joint.position.copy(start);joint.quaternion.copy(s.q);
 joint.children[0].children[0].quaternion.copy(s.q).invert().multiply(s.q2);
 if(foot){const end=joint.children[0].children[0].children[0];end.quaternion.copy(s.q2).invert();}
}

function Limb({kit,limbRef,material,skin,leg=false}){
 const a=leg?.26:.255,b=leg?.25:.245;
 return <group ref={limbRef}>
  <group position={[0,-a,0]}>
   <group>
    <group position={[0,-b,0]}>
     {leg?<><Part kit={kit} material={kit.m.shoe} position={[0,-.012,.055]} scale={[.105,.075,.20]} shadow/><Part kit={kit} material={kit.m.sole} position={[0,-.041,.055]} scale={[.110,.021,.207]}/></>:<Part kit={kit} geometry="hand" material={skin} position={[0,-.018,.006]} scale={[.82,.82,.82]}/>}
    </group>
    <Part kit={kit} geometry="capsule" material={material} position={[0,-b/2,0]} scale={leg?[.088,b/2,.092]:[.073,b/2,.080]} shadow/>
    {!leg&&<Part kit={kit} material={kit.m.shirt} position={[0,-b+.027,0]} scale={[.079,.038,.083]}/>}
   </group>
  </group>
  <Part kit={kit} geometry="capsule" material={material} position={[0,-a/2,0]} scale={leg?[.105,a/2,.111]:[.088,a/2,.092]} shadow/>
 </group>;
}

function Scholar({kit,variant=0,position=[0,0,0],rotation=0,scale=1,pose,update,actorRef,backpack=false,worker=false,children}){
 const body=useRef(),head=useRef(),la=useRef(),ra=useRef(),ll=useRef(),rl=useRef();
 const s=useMemo(()=>({left:limbScratch(),right:limbScratch(),leftLeg:limbScratch(),rightLeg:limbScratch(),start:new THREE.Vector3(),pole:new THREE.Vector3(),axis:new THREE.Vector3(1,0,0)}),[]);
 const coat=kit.m.coat[variant],skin=kit.m.skin[variant];
 useFrame(()=>{
  update?.(pose,actorRef?.current);
  if(!body.current)return;
  body.current.position.y=pose.pelvis;body.current.rotation.x=pose.lean;
  head.current.rotation.set(pose.headPitch,pose.headYaw,0);
  for(const [ref,side,cache] of [[la,-1,s.left],[ra,1,s.right]]){
   s.start.set(side*.185,.34,0).applyAxisAngle(s.axis,pose.lean);s.start.y+=pose.pelvis;
   s.pole.set(side*.65,-.20,.55);solveLimb(ref,s.start,side<0?pose.leftHand:pose.rightHand,.255,.245,s.pole,cache);
  }
  for(const [ref,side,cache] of [[ll,-1,s.leftLeg],[rl,1,s.rightLeg]]){
   s.start.set(side*.09,pose.pelvis-.025,0);s.pole.set(side*.12,0,1);solveLimb(ref,s.start,side<0?pose.leftFoot:pose.rightFoot,.26,.25,s.pole,cache,true);
  }
 },-2);
 return <group ref={actorRef} position={position} rotation={[0,rotation,0]} scale={scale} name={'archive-scholar-'+variant}>
  <Suspense fallback={<><group ref={body} position={[0,pose.pelvis,0]}>
   <mesh geometry={kit.rigBodies[variant]} material={kit.m.rigBody} castShadow receiveShadow/>
   <group ref={head} position={[0,.568,.014]}>
    <mesh geometry={kit.rigHeads[variant]} material={kit.m.rigHead} castShadow receiveShadow/>
   </group>
  </group>
  <Limb kit={kit} limbRef={la} material={coat} skin={skin}/><Limb kit={kit} limbRef={ra} material={coat} skin={skin}/>
  <Limb kit={kit} limbRef={ll} material={kit.m.ink} skin={skin} leg/><Limb kit={kit} limbRef={rl} material={kit.m.ink} skin={skin} leg/>
  </>}><ImportedScholar pose={pose} actorRef={actorRef} actorScale={scale} variant={variant} backpack={backpack} worker={worker}/></Suspense>
  {children}
 </group>;
}

function Stool({kit,position,height=.78,rotation=PI}){
 const fallback=<group position={position} rotation={[0,rotation,0]}>
  <Part kit={kit} material={kit.m.coat[0]} position={[0,height,0]} scale={[.40,.09,.37]} shadow/>
  <Part kit={kit} material={kit.m.coat[0]} position={[0,height+.23,-.18]} scale={[.38,.35,.08]} shadow/>
  {[-1,1].flatMap(x=>[-1,1].map(z=><Part key={x+':'+z} kit={kit} material={kit.m.ink} position={[x*.15,height/2,z*.13]} scale={[.032,height,.032]} shadow/>))}
  <Part kit={kit} geometry="ring" material={kit.m.gold} position={[0,.35,0]} scale={[.19,.19,.19]} rotation={[PI/2,0,0]}/>
 </group>;
 return <Suspense fallback={fallback}><ReadyReadingChair position={position} rotation={[0,rotation,0]} height={1} seatHeight={height} scale={[1,1,.97]}/></Suspense>;
}

function Reader({kit,time,position,variant=0,appearance,device=false,backpack=false,dom,rotation=PI,seatPelvis,bookHeight,tempo=1.24,offset=0,taskKey=variant?'worldReader2Task':'worldReader1Task'}){
 const actor=useRef(),leaf=useRef(),pencil=useRef();
 const turningPage=useMemo(()=>{
  const front=kit.page.clone(),back=kit.page.clone(),uv=back.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setX(i,1-uv.getX(i));
  return{front,back};
 },[kit]);
 useEffect(()=>()=>{turningPage.front.dispose();turningPage.back.dispose();},[turningPage]);
 const pelvis=seatPelvis??(variant?.76:.86);
 const pose=useMemo(()=>poseAt(pelvis),[pelvis]);
 const height=bookHeight??(variant?1.185:1.285);
 const update=(p)=>{
  const elapsed=time.current*tempo+offset+(variant?3.8:0),period=variant?17:13.5;
  const t=elapsed%period;
  p.pelvis=pelvis;p.lean=variant?.13:.08;p.headPitch=variant?.29:.23;p.headYaw=0;
  set(p.leftFoot,-.11,.35,.15);set(p.rightFoot,.11,.35,.13);
  set(p.leftHand,-.17,height+.015,.40);
  if(device){
   p.leftHand.set(-.10,height+.026+Math.sin(elapsed*7.1)*.004,.45);
   p.rightHand.set(.10,height+.026+Math.sin(elapsed*8.7)*.005,.45);
   p.headPitch=.23+Math.sin(elapsed*.3)*.025;p.headYaw=Math.sin(elapsed*.18)*.035;
   dom.dataset[taskKey]='consultar as fontes e registrar notas no notebook';return;
  }
  if(!variant){
   const reverse=Math.floor(elapsed/period)%2===1;
   const reach=phase(t,7.0,8.1),flip=phase(t,8.1,10.0),back=phase(t,10.6,11.7);
   const angle=PI*(reverse?1-flip:flip),edge=.15*Math.cos(angle);
   // The next task turns the same sheet back. The leaf and hand therefore
   // remain continuous across the cycle boundary, without a hidden reset.
   set(p.rightHand,lerp(lerp(.17,edge,reach),.17,back),height+.016+.15*Math.sin(angle),lerp(.39-.02*reach,.39,back));
   set(p.leftHand,-.18-.045*flip*(1-back),height+.015,.42);
   p.headYaw=(reverse?.14:-.14)*flip*(1-back)+Math.sin(t*.72)*.027*(1-reach+back);p.headPitch=.23-.07*Math.sin(flip*PI)+Math.sin(t*.41)*.012;
   if(leaf.current){
    leaf.current.rotation.z=angle;
    // Never toggle a page's visibility. Both printed sides remain present,
    // with a small elastic curl that settles above the underlying paper.
    const curl=.035*Math.sin(angle);
    for(const geometry of [turningPage.front,turningPage.back]){
     const vertices=geometry.attributes.position;
     for(let i=0;i<vertices.count;i++)vertices.setY(i,Math.sin(PI*vertices.getX(i)/.25)*curl);
     vertices.needsUpdate=true;geometry.computeVertexNormals();
    }
   }
   dom.dataset[taskKey]=t<7?'ler o volume':t<8.1?'alcançar a página':t<10.6?'virar a página':'retomar a leitura';
  }else{
   const writing=t<5.1||t>8.2&&t<12.5;
   const first=phase(t,0,5.1)-phase(t,5.8,7.8);
   const second=phase(t,8.2,12.5)-phase(t,13.2,16.65);
   const row=phase(t,5.8,7.8)-phase(t,13.2,16.65);
   const lift=phase(t,5.1,5.8)-phase(t,7.4,8.2)+phase(t,12.5,13.2)-phase(t,16,17);
   const stroke=phase(t,0,.3)-phase(t,4.8,5.1)+phase(t,8.2,8.5)-phase(t,12.2,12.5);
   set(p.rightHand,.02+(first+second)*.15+Math.sin(t*11)*.010*stroke,height+.052+lift*.12,.42+.035*row+Math.sin(t*14)*.004*stroke);
   p.headPitch=.29-lift*.14;p.headYaw=lift*.09;
   if(pencil.current){pencil.current.position.copy(p.rightHand);pencil.current.position.y-=.012;pencil.current.rotation.set(-.32,0,-.30+lift*.1);}
   dom.dataset[taskKey]=writing?'anotar no caderno':t<8.2?'reler a anotação':'conferir a ficha';
  }
 };
 return <>
  <Stool kit={kit} position={position} height={pelvis-.08} rotation={rotation}/>
  <Scholar kit={kit} actorRef={actor} pose={pose} update={update} position={position} rotation={rotation} variant={appearance??variant} backpack={backpack}/>
  <group position={position} rotation={[0,rotation,0]}>
   {device?<StudyDevice position={[0,height-.043,.46]} rotation={[0,Math.PI,0]} scale={1.12}/>:<group position={[0,height,variant?.55:.47]}>
    <Part kit={kit} material={variant?kit.m.green:kit.m.red} position={[0,-.027,0]} scale={[.53,.032,.38]} shadow/>
    <Part kit={kit} material={kit.m.paper} position={[0,-.007,0]} scale={[.50,.025,.35]}/>
    <mesh geometry={kit.page} material={kit.m.print} position={[-.25,.009,0]}/>
    <mesh geometry={kit.page} material={kit.m.print} position={[0,.010,0]}/>
    {!variant&&<group ref={leaf} position={[0,.016,0]}><mesh geometry={turningPage.front} material={kit.m.leafFront}/><mesh geometry={turningPage.back} material={kit.m.leafBack}/></group>}
   </group>}
   {!device&&variant===1&&<group ref={pencil}>
    <Part kit={kit} geometry="cylinder" material={kit.m.pencil} position={[0,.035,0]} scale={[.009,.15,.009]}/>
    <Part kit={kit} geometry="sphere" material={kit.m.graphite} position={[0,-.044,0]} scale={[.007,.015,.007]}/>
   </group>}
  </group>
 </>;
}

function CirculatingBook({kit,bookRef,coverRef}){
 return <group ref={bookRef} position={SHELF_END} rotation={[0,-PI/2,0]}>
  <Part kit={kit} material={kit.m.red} position={[0,-.027,0]} scale={[.31,.020,.40]} shadow/>
  <Part kit={kit} material={kit.m.paper} scale={[.285,.036,.374]}/>
  <mesh geometry={kit.page} material={kit.m.print} position={[-.125,.019,0]}/>
  <group ref={coverRef} position={[-.155,.027,0]}>
   <Part kit={kit} material={kit.m.red} position={[.155,0,0]} scale={[.31,.020,.40]} shadow/>
   <Part kit={kit} material={kit.m.gold} position={[.155,.012,0]} scale={[.17,.002,.21]}/>
   <Part kit={kit} material={kit.m.red} position={[.155,.014,0]} scale={[.157,.002,.198]}/>
  </group>
 </group>;
}

function plantedFeet(p,distance,walking,stride=.40){
 for(const [side,foot] of [[-1,p.leftFoot],[1,p.rightFoot]]){
  if(!walking){foot.set(side*.10,.055,side<0?.16:.16-stride*.5);continue;}
  const f=((distance/stride+(side>0?.5:0))%1+1)%1;
  if(f<.62)foot.set(side*.10,.055,.16-f*stride);
  else{
   const q=(f-.62)/.38,q2=q*q,q3=q2*q;
   // Match fore/aft speed at toe-off and heel contact. A squared lift gives
   // zero vertical speed at both contacts rather than a visibly jerky kick.
   const z=(2*q3-3*q2+1)*(.16-.62*stride)+(-2*q3+3*q2)*.16+(2*q3-3*q2+q)*(-.38*stride);
   foot.set(side*.10,.055+Math.sin(q*PI)**2*.075,z);
  }
 }
}

function Archivist({kit,time,dom}){
 const actor=useRef(),book=useRef(),cover=useRef();
 const pose=useMemo(()=>poseAt(.55),[]);
 const state=useMemo(()=>({}),[]);
 const stride=SHELF_TO_DESK/2;
 const scratch=useMemo(()=>({carry:new THREE.Vector3(),position:new THREE.Vector3(),left:new THREE.Vector3(),right:new THREE.Vector3(),q:new THREE.Quaternion(),bookQ:new THREE.Quaternion(),inv:new THREE.Quaternion(),axis:new THREE.Vector3(0,1,0)}),[]);
 const update=(p,root)=>{
  if(!root||!book.current||!cover.current)return;
  const s=archiveScholarCycleAt(time.current,state),w=scratch,t=s.t;
  root.position.set(s.x,SCHOLAR_GROUND,s.z);
  root.rotation.y=s.yaw;
  const step=s.distance/stride;
  const walkingWeight=s.walking?Math.sin(PI*clamp((t-(s.returning?13:2.25))/1.3)):0;
  p.pelvis=.55+Math.abs(Math.sin(step*PI*2))*.010*walkingWeight;
  p.lean=.01+.025*walkingWeight+s.lean;
  p.headPitch=.11-.075*walkingWeight+.29*clamp(s.lean/.225);
  p.headYaw=-.06*(phase(t,7.4,8.2)-phase(t,10.1,10.8));
  plantedFeet(p,s.distance/SHELF_READER_SCALE,s.walking,stride/SHELF_READER_SCALE);
  w.q.setFromAxisAngle(w.axis,s.yaw);w.inv.copy(w.q).invert();
  w.carry.set(0,.85,.21).multiplyScalar(SHELF_READER_SCALE).applyQuaternion(w.q).add(root.position);
  w.position.fromArray(s.atDesk?READING_DESK:SHELF_END).lerp(w.carry,s.bookT);
  const bookYaw=lerp(-PI/2,s.yaw,s.bookT);
  book.current.position.copy(w.position);
  book.current.rotation.y=bookYaw;
  cover.current.rotation.z=s.cover;
  w.bookQ.setFromAxisAngle(w.axis,bookYaw);
  const reading=phase(t,5.05,5.12)*(1-phase(t,11.52,11.55));
  const trace=phase(t,6.1,9.95)*(1-phase(t,10.15,10.6));
  w.left.set(lerp(-.125,-.155+.08*Math.cos(s.cover),reading),lerp(.025,.035+.08*Math.sin(s.cover),reading),lerp(-.06,-.08,reading));
  w.right.set(lerp(.125,.09-.03*trace,reading),lerp(.025,.035,reading),lerp(-.06,-.12+.09*trace,reading));
  for(const target of [w.left,w.right])target.applyQuaternion(w.bookQ).add(w.position).sub(root.position).applyQuaternion(w.inv).divideScalar(SHELF_READER_SCALE);
  p.leftHand.set(-.21,.76,.10).lerp(w.left,s.grasp);
  p.rightHand.set(.21,.76,.10).lerp(w.right,s.grasp);
  Object.assign(dom.dataset,{worldActor1X:s.x.toFixed(3),worldActor1Z:s.z.toFixed(3),worldArchivistTask:s.task,worldArchivistPayload:s.payload,worldArchivistCycle:String(s.cycle),worldArchivistDelivered:String(s.delivered),worldCirculatingBookPlace:s.payload==='book'?'hands':s.atDesk?'desk':'shelf',worldCirculatingBookOpen:(s.cover/(PI*.91)).toFixed(3)});
 };
 return <>
  <Scholar kit={kit} actorRef={actor} pose={pose} update={update} variant={2} position={[-.72,SCHOLAR_GROUND,SHELF_END[2]]} rotation={-PI/2} scale={SHELF_READER_SCALE}/>
  <Part kit={kit} material={kit.m.coat[0]} position={[-1.32,.978,-.38]} scale={[.65,.04,.50]} shadow/>
  <Part kit={kit} material={kit.m.coat[0]} position={[-1.49,.895,-.38]} scale={[.32,.16,.34]} shadow/>
  <Part kit={kit} material={kit.m.gold} position={[-1.32,.975,-.124]} scale={[.59,.018,.009]}/>
  <CirculatingBook kit={kit} bookRef={book} coverRef={cover}/>
 </>;
}

function Cataloguer({kit,time,dom}){
 const actor=useRef(),stamp=useRef(),card=useRef();
 const pose=useMemo(()=>poseAt(.55),[]);
 const update=(p,root)=>{
  const t=time.current%32,reach=phase(t,3.8,4.9),press=phase(t,5.3,5.65),lift=phase(t,6.2,6.9),rest=phase(t,8.4,9.5);
  const outbound=phase(t,12,18),inbound=phase(t,22,28),z=-1.6+1.9*(outbound-inbound);
  const yaw=PI-PI*phase(t,10,12)-PI/2*phase(t,18,20)-PI/2*phase(t,21,22);
  if(root){root.position.set(-4.8,SCHOLAR_GROUND,z);root.rotation.y=yaw;}
  const walk=phase(t,12,12.4)*(1-phase(t,17.6,18))+phase(t,22,22.4)*(1-phase(t,27.6,28));
  const stride=1.9*(outbound+inbound)/.42*PI*2;
  const inspect=phase(t,18,19)*(1-phase(t,20,21));
  const slide=(phase(t,7.4,8.2)-phase(t,9.5,10))*.025;
  p.pelvis=.55;p.lean=.025+.025*walk;p.headPitch=.23-.14*inspect;p.headYaw=-.07*inspect;
  for(const [i,side]of [-1,1].entries()){const foot=side<0?p.leftFoot:p.rightFoot,step=Math.sin(stride+i*PI);foot.set(side*.11,.055+Math.max(0,step)*.06*walk,.025+step*.13*walk);}
  set(p.leftHand,-.14,.872,.17+slide);
  set(p.rightHand,lerp(.22,.07,reach)+.15*rest,.88+.16*reach-.08*press+.08*lift-.16*rest,.08+.12*reach-.12*rest);
  if(stamp.current){stamp.current.position.copy(p.rightHand);stamp.current.position.y-=.048;}
  if(card.current)card.current.position.z=.18+slide;
  Object.assign(dom.dataset,{worldActor2X:'-4.800',worldActor2Z:z.toFixed(3),worldCataloguerTask:t<3.8?'ler a ficha':t<5.3?'posicionar o carimbo':t<6.2?'carimbar a ficha':t<10?'organizar o catálogo':t<12?'virar para o corredor da estante':t<18?'levar a ficha ao setor da coleção':t<22?'conferir as lombadas com a ficha':t<28?'voltar ao posto com a prancheta':'preparar a próxima conferência'});
 };
 return <Scholar kit={kit} actorRef={actor} pose={pose} update={update} variant={3} position={[-4.8,.095,-1.6]} rotation={PI}>
  <group name="Clipboard, record and stamp carried by the same cataloguer">
   <Part kit={kit} material={kit.m.coat[2]} position={[0,.84,.17]} scale={[.38,.025,.24]} rotation={[-.07,0,0]} shadow/>
   <Part kit={kit} material={kit.m.gold} position={[0,.855,.065]} scale={[.11,.015,.03]}/>
   <group ref={card} position={[0,.864,.18]}>
    <Part kit={kit} material={kit.m.paper} scale={[.32,.005,.20]}/>
    {[0,1,2,3].map(i=><Part key={i} kit={kit} material={kit.m.graphite} position={[-.02,.004,-.065+i*.023]} scale={[.19,.001,.003]}/>)}
   </group>
   <group ref={stamp}>
    <Part kit={kit} material={kit.m.ink} position={[0,-.026,0]} scale={[.065,.027,.055]}/>
    <Part kit={kit} geometry="cylinder" material={kit.m.gold} position={[0,.008,0]} scale={[.018,.055,.018]}/>
    <Part kit={kit} geometry="sphere" material={kit.m.red} position={[0,.039,0]} scale={[.035,.028,.030]}/>
   </group>
  </group>
 </Scholar>;
}

function StandingResearcher({kit,time,dom,instrument=false}){
 const actor=useRef(),pencil=useRef(),pointer=useRef();
 const pose=useMemo(()=>poseAt(.55),[]);
 const location=instrument?[4.52,.095,-2.18]:[-4.70,.095,1.60];
 const paperOffset=instrument?.14:0;
 const update=p=>{
  const t=(time.current*1.26+(instrument?7.2:2.6))%(instrument?19:16);
  p.pelvis=.55;p.lean=.045;p.headPitch=.23;p.headYaw=0;
  set(p.leftFoot,-.115,.055,.11);set(p.rightFoot,.115,.055,-.045);
  set(p.leftHand,-.16,.94+paperOffset,.27);
  if(instrument){
   const measure=phase(t,2,3.5)*(1-phase(t,9,10.7)),write=phase(t,11,12)*(1-phase(t,15.2,16.2));
   set(p.rightHand,.17-.11*measure+Math.sin(t*9)*.007*write,.95+paperOffset+.035*measure,.25+.08*measure);
   p.headPitch=.21+.06*measure;p.headYaw=-.10*measure;
   if(pencil.current){pencil.current.position.copy(p.rightHand);pencil.current.rotation.set(-.5,0,.30);}
   if(pointer.current)pointer.current.rotation.y=.12+.30*measure;
   dom.dataset.worldResearcherTask=measure>.5?'medir uma peça do arquivo':write>.1?'registrar a medida':'examinar a peça';
  }else{
   const point=phase(t,3.2,4.4)*(1-phase(t,8.2,9.6)),trace=phase(t,4.4,7.2);
   set(p.rightHand,lerp(.19,-.03,point)+trace*.075*point,.94+.018*point,.23+.09*point);
   p.headYaw=-.09*point;p.headPitch=.23+.04*point;
   dom.dataset.worldStudentTask=point>.1?'acompanhar o mapa com o dedo':'consultar o mapa do campus';
  }
 };
 return <>
  <Scholar kit={kit} actorRef={actor} pose={pose} update={update} variant={instrument?1:0} position={location} rotation={instrument?-.42:.35}/>
  <group position={location} rotation={[0,instrument?-.42:.35,0]}>
   <Part kit={kit} material={kit.m.coat[instrument?2:1]} position={[0,.915+paperOffset,.28]} scale={[.40,.025,.31]} shadow/>
   <Part kit={kit} material={kit.m.paper} position={[0,.933+paperOffset,.28]} scale={[.37,.009,.28]}/>
   {instrument?<>
    <group ref={pointer} position={[-.02,.957+paperOffset,.28]}>
     <Part kit={kit} geometry="ring" material={kit.m.gold} scale={[.058,.058,.058]} rotation={[PI/2,0,0]}/>
     <Part kit={kit} material={kit.m.ink} position={[0,0,.09]} scale={[.018,.012,.09]}/>
    </group>
    <group ref={pencil}><Part kit={kit} geometry="cylinder" material={kit.m.pencil} position={[0,.02,0]} scale={[.008,.13,.008]}/><Part kit={kit} geometry="sphere" material={kit.m.graphite} position={[0,-.05,0]} scale={[.006,.01,.006]}/></group>
   </>:<>
    {[-.10,0,.10].map((x,i)=><Part key={x} kit={kit} material={kit.m.green} position={[x,.94,.26+(i%2)*.05]} scale={[.057,.002,.068]} rotation={[0,i*.20,0]}/>)}
    <Part kit={kit} material={kit.m.red} position={[.035,.941,.28]} scale={[.008,.002,.21]} rotation={[0,.5,0]}/>
    <Part kit={kit} material={kit.m.gold} position={[-.02,.941,.28]} scale={[.33,.002,.006]} rotation={[0,-.25,0]}/>
   </>}
  </group>
 </>;
}

/** Guides the courier's EXISTING crate; this character never makes a copy. */
function DockWorker({kit,time,dom}){
 const actor=useRef(),pose=useMemo(()=>poseAt(.55),[]),grip=useRef(0),lastCase=useRef(null),lastTime=useRef(0);
 const target=useMemo(()=>new THREE.Vector3(),[]);
 const update=(p,root)=>{
  if(!root)return;const operation=supplyChainAt(time.current),s=operation.loader,position=s.position,c=Math.cos(s.yaw),sn=Math.sin(s.yaw),walk=s.walking?1:0,activeParcel=operation.cases.find(c=>c.id===s.caseId),pickupBend=activeParcel?.12*(1-deliveryEase(activeParcel.position[1]-position[1],.74,.90))*deliveryEase(Math.hypot(activeParcel.position[0]-position[0],activeParcel.position[2]-position[2]),.40,.55):0,crouch=Math.max(s.crouch||0,pickupBend);
  root.position.fromArray(position);root.rotation.y=s.yaw;
  p.pelvis=.55;p.pelvisAbsolute=.83-.58*crouch;p.lean=.035+.24*crouch+walk*.035;p.headPitch=.14+.16*crouch;p.headYaw=0;
  const dt=Math.min(.05,Math.max(0,time.current-lastTime.current));lastTime.current=time.current;
  if(s.caseId!==null&&s.caseId!==undefined)lastCase.current=s.caseId;
  const held=s.caseId!==null&&s.caseId!==undefined;grip.current=THREE.MathUtils.damp(grip.current,held?1:0,18,dt);
  const parcel=operation.cases.find(c=>c.id===lastCase.current);
  for(const [i,side]of [-1,1].entries()){
   const foot=side<0?p.leftFoot:p.rightFoot,hand=side<0?p.leftHand:p.rightHand,f=((s.distance/.43+i*.5)%1+1)%1;
   let z=.16-f*.43,lift=0;if(f>=.62){const u=(f-.62)/.38;z=-.1066+.2666*u*u*(3-2*u);lift=Math.sin(Math.PI*u)*.065;}
   foot.set(side*.11,.055+lift*walk,walk?z:.025);hand.set(side*.20,.83,.10);
   if(parcel&&grip.current>.001){
    const q=parcel.position,cy=Math.cos(parcel.yaw||0),sy=Math.sin(parcel.yaw||0),ax=position[0]-q[0],az=position[2]-q[2],px=cy*ax-sy*az,pz=sy*ax+cy*az;
    const norm=Math.max(.001,Math.hypot(ax,az)),radius=Math.min(.15/Math.max(.001,Math.abs(px)/norm),.20/Math.max(.001,Math.abs(pz)/norm)),hx=ax/norm*radius+c*side*.10,hz=az/norm*radius-sn*side*.10,lx=THREE.MathUtils.clamp(cy*hx-sy*hz,-.15,.15),lz=THREE.MathUtils.clamp(sy*hx+cy*hz,-.20,.20);
    const wx=q[0]+cy*lx+sy*lz,wz=q[2]-sy*lx+cy*lz,dx=wx-position[0],dz=wz-position[2];
    target.set(c*dx-sn*dz,q[1]-position[1]+.22,sn*dx+c*dz);hand.lerp(target,grip.current);
   }
  }
  Object.assign(dom.dataset,{worldDockWorkerTask:held?'retirar o volume da plataforma e entregar à base móvel':walk?'voltar à próxima caixa do caminhão':'conferir os volumes ainda no caminhão',worldDockWorkerCargo:held?'shared-case-'+s.caseId:'none',worldDockWorkerX:position[0].toFixed(3),worldDockWorkerZ:position[2].toFixed(3)});
 };
 return <Scholar kit={kit} actorRef={actor} pose={pose} update={update} variant={2} worker position={[8.72,COURIER_FLOOR,6.74]} rotation={Math.PI/2}/>;
}

function StudyDesk({kit,assets,x,z=3.30}){
 const wood=assets.mats.walnut;
 return <group position={[x,SCHOLAR_GROUND,z]}>
  <Suspense fallback={<>
   <Part kit={kit} material={wood} position={[0,1.02,0]} scale={[1.20,.12,.80]} shadow/>
   {[-1,1].flatMap(side=>[-1,1].map(end=><Part key={`${side}:${end}`} kit={kit} material={wood} position={[side*.47,.48,end*.29]} scale={[.091,.96,.091]} shadow/>))}
  </>}><ReadyArchiveTable width={1.80} depth={1.0} height={1.08}/></Suspense>
  <Part kit={kit} material={kit.m.green} position={[0,1.088,0]} scale={[1.65,.010,.88]}/>
 </group>;
}

function StudyTables({kit,assets,time,dom}){
 const centers=[-3.85,-1.60];
 return <group name="archive-study-tables" userData={{studyBounds:{min:[-4.75,0,2.18],max:[-.70,1.9,4.42]},tableCount:2,studentCount:8}}>
  {centers.map((x,table)=><group key={x} name={'collective-reading-table-'+(table+1)}>
   <StudyDesk kit={kit} assets={assets} x={x}/>
   {[0,1,2,3].map(seat=>{
    const north=seat<2,side=seat%2?1:-1,writing=(seat+table)%2===1;
    if(table===1&&(seat===1||seat===3))return null;
    if(table===0&&seat===1)return <ArchiveShelfStudent key={seat} assets={assets} time={time}/>;
    return <Reader key={seat} kit={kit} time={time} dom={dom}
     position={[x+side*.45,SCHOLAR_GROUND,north?2.45:4.15]} rotation={north?0:PI}
     seatPelvis={.72} bookHeight={1.134} device={true} backpack={table===0&&seat===2||table===1&&seat===0} variant={writing?1:0} appearance={(writing?1:0)+(table%2?2:0)}
     tempo={.92+table*.073+seat*.047} offset={table*4.7+seat*3.35}
     taskKey={'worldStudy'+(table+1)+String.fromCharCode(65+seat)+'Task'}/>;
   })}
  </group>)}
 </group>;
}

const PROMENADE_LENGTH=4.8;
const PROMENADE_CYCLE=18;
function Pedestrian({kit,time,dom}){
 const actor=useRef(),folio=useRef(),pose=useMemo(()=>poseAt(),[]);
 const update=(p,root)=>{
  if(!root)return;
  const t=(time.current+1.4)%PROMENADE_CYCLE;
  const outward=phase(t,0,6.9),returning=phase(t,9.2,16.1);
  const walksOut=t<6.9,walksBack=t>=9.2&&t<16.1;
  const distance=PROMENADE_LENGTH*(walksBack?returning:outward);
  const stride=PROMENADE_LENGTH/10;
  const step=Math.sin(distance/stride*PI*2);
  const motion=walksOut||walksBack?Math.sin(PI*clamp((t-(walksBack?9.2:0))/6.9)):0;
  const look=phase(t,6.3,7.15)-phase(t,8.45,9.2);
  const check=phase(t,15.55,16.3)-phase(t,17.2,18);
  const consult=Math.max(look,check);
  const x=-5.88+PROMENADE_LENGTH*(outward-returning);
  root.position.set(x,SCHOLAR_GROUND,4.70);
  root.rotation.y=PI/2+PI*(phase(t,7.9,9.2)-phase(t,16.6,18))+.40*look;
  p.pelvis=.55+.012*Math.abs(step)*motion;
  p.lean=.02+.055*motion;
  p.headPitch=.09+.19*consult;
  p.headYaw=.13*look-.18*check;
  p.leftHand.set(-.22,.77+.09*consult,.13+.08*consult);
  p.rightHand.set(lerp(.22,-.13,consult),.77+.09*consult,lerp(.09+.12*step*motion,.23,consult));
  plantedFeet(p,distance,walksOut||walksBack,stride);
  if(folio.current){
   folio.current.position.copy(p.leftHand);
   folio.current.position.y-=.085;
   folio.current.rotation.x=.12-.30*consult;
  }
  dom.dataset.worldPedestrianTask=look>.35?'comparar as notas junto à mesa':check>.35?'conferir o caderno de pesquisa':walksOut||walksBack?'levar o caderno às mesas de estudo':'preparar a mudança de direção';
  dom.dataset.worldPedestrianX=x.toFixed(3);
 };
 return <Scholar kit={kit} actorRef={actor} pose={pose} update={update} variant={3} position={[-5.88,SCHOLAR_GROUND,4.70]} rotation={PI/2}>
  <group ref={folio}>
   <Part kit={kit} material={kit.m.red} scale={[.046,.27,.19]} shadow/>
   <Part kit={kit} material={kit.m.paper} position={[.008,0,.017]} scale={[.036,.244,.167]}/>
   <Part kit={kit} material={kit.m.gold} position={[-.023,.083,0]} scale={[.005,.024,.15]}/>
  </group>
 </Scholar>;
}

export default function ArchiveScholars({assets,time}){
 const kit=useMemo(()=>makeKit(assets),[assets]),{gl}=useThree();
 useEffect(()=>()=>kit.dispose(),[kit]);
 useEffect(()=>{
  Object.assign(gl.domElement.dataset,{worldScholarCount:'15',worldTaskWalkingCount:'3',worldStudyTableCount:'2',worldStudyStudentCount:'8',worldStudyBounds:'x[-4.75,-.70],z[2.18,4.42]',worldScholarRig:'CC0 MakeHuman skinned mesh / authored task IK',worldScholarTasks:'reading,writing,book-circulation,cataloguing,map-study,measurement,unloading,promenade'});
  return()=>{for(const key of Object.keys(gl.domElement.dataset).filter(key=>key.startsWith('worldStudy')))delete gl.domElement.dataset[key];for(const key of ['worldScholarCount','worldTaskWalkingCount','worldStudyTableCount','worldScholarRig','worldScholarTasks','worldReader1Task','worldReader2Task','worldStudyReaderTask','worldStudyWriterTask','worldArchivistTask','worldArchivistPayload','worldArchivistCycle','worldArchivistDelivered','worldCirculatingBookPlace','worldCirculatingBookOpen','worldCataloguerTask','worldStudentTask','worldResearcherTask','worldDockWorkerTask','worldDockWorkerPhase','worldDockWorkerCargo','worldDockWorkerX','worldDockWorkerZ','worldPedestrianTask','worldPedestrianX'])delete gl.domElement.dataset[key];};
 },[gl]);
 return <group name="archive-working-scholars">
  <Reader kit={kit} time={time} position={[3.30,0,-.12]} variant={1} dom={gl.domElement}/>
  <Archivist kit={kit} time={time} dom={gl.domElement}/>
  <Cataloguer kit={kit} time={time} dom={gl.domElement}/>
  <StandingResearcher kit={kit} time={time} dom={gl.domElement}/>
  <StandingResearcher kit={kit} time={time} dom={gl.domElement} instrument/>
  <DockWorker kit={kit} time={time} dom={gl.domElement}/>
  <StudyTables kit={kit} assets={assets} time={time} dom={gl.domElement}/>
  <Pedestrian kit={kit} time={time} dom={gl.domElement}/>
 </group>;
}
