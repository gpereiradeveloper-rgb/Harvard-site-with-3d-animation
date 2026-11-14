import React, {Suspense, useEffect, useMemo, useRef, useState} from 'react';
import {Canvas, useFrame, useThree} from '@react-three/fiber';
import {Environment, Lightformer, RoundedBox} from '@react-three/drei';
import * as THREE from 'three';
import {useViewportRenderQuality} from './RenderQuality';
import './HarvardAlbum3D.css';

const PAGE_W = 5.55, PAGE_H = 6.65, BOARD = .16;
const clamp = value => THREE.MathUtils.clamp(value, 0, 1);
const smooth = (a, b, value) => {const t = clamp((value - a) / (b - a)); return t * t * (3 - 2 * t);};
const seeded = (seed = 1636) => () => {seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646;};

export const ALBUM_VOLUMES = Object.freeze([
  {id:'origins', title:'As origens', kicker:'I / 1636', description:'As origens de Harvard e o começo de uma história de conhecimento.', image:'/assets/widener-4k.jpg', source:'https://www.harvard.edu/about/history/', sourceName:'Harvard University · História', color:'#d8cbae', ink:'#3d3540'},
  {id:'library', title:'A biblioteca', kicker:'II / OS LUGARES', description:'A Widener e a luz da Loker Reading Room, em fotografias originais.', image:'/assets/loker-4k.jpg', source:'https://library.harvard.edu/libraries/widener', sourceName:'Harvard Library · Widener', color:'#263b4b', ink:'#e3d0a1'},
  {id:'architecture', title:'Arquitetura', kicker:'III / FORMA E MEMÓRIA', description:'Observar a Memorial Church, seus ritmos, materiais e histórias.', image:'/assets/memorial-church-front.jpg', source:'https://memorialchurch.harvard.edu/history-0', sourceName:'Harvard · Memorial Church', color:'#65706c', ink:'#eee1bf'},
  {id:'collections', title:'O acervo', kicker:'IV / ENTRE PÁGINAS', description:'Livros, coleções e caminhos de pesquisa na Harvard Library.', image:'/assets/loker-4k.jpg', source:'https://library.harvard.edu/collections/gutenberg-bible', sourceName:'Harvard Library · Gutenberg Bible', color:'#b09b6c', ink:'#3e3440'},
  {id:'campus', title:'O campus', kicker:'V / CAMBRIDGE', description:'Lugares e perspectivas para continuar descobrindo Harvard.', image:'/assets/memorial-church-inscription.jpg', source:'https://www.harvard.edu/visit/maps-directions/', sourceName:'Harvard University · Mapas', color:'#4b5b4d', ink:'#eee2bd'},
  {id:'research', title:'Novas ideias', kicker:'VI / DESCOBRIR', description:'Uma pergunta, uma fonte, uma nova possibilidade de leitura.', image:'/assets/loker-4k.jpg', source:'https://www.harvard.edu/in-focus/', sourceName:'Harvard University · In Focus', color:'#4a4858', ink:'#eadbb5'},
]);

function canvasTexture(width, height, painter, color = true) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  painter(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace; texture.anisotropy = 12;
  return texture;
}

function fabricMaps() {
  const random = seeded(1915);
  const normal = canvasTexture(512, 512, (ctx, w, h) => {
    const pixels = ctx.createImageData(w, h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;pixels.data[i]=128+Math.sin(x*Math.PI/2)*22;pixels.data[i+1]=128+Math.sin(y*Math.PI/2)*23;pixels.data[i+2]=250;pixels.data[i+3]=255;}
    ctx.putImageData(pixels,0,0);
  },false);
  const rough = canvasTexture(256,256,(ctx,w,h)=>{const pixels=ctx.createImageData(w,h);for(let i=0;i<pixels.data.length;i+=4){const c=226+random()*24;pixels.data[i]=c;pixels.data[i+1]=c;pixels.data[i+2]=c;pixels.data[i+3]=255;}ctx.putImageData(pixels,0,0);},false);
  const fibre = canvasTexture(512,512,(ctx,w,h)=>{ctx.fillStyle='#bababa';ctx.fillRect(0,0,w,h);for(let i=0;i<12000;i++){const c=140+Math.floor(random()*100);ctx.fillStyle=`rgb(${c},${c},${c})`;ctx.fillRect(random()*w,random()*h,.4+random()*2,.4+random());}},false);
  return {normal,rough,fibre};
}

function drawShield(ctx,x,y,size=1) {
  ctx.save();ctx.translate(x,y);ctx.scale(size,size);ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-65,-72);ctx.lineTo(65,-72);ctx.lineTo(65,11);ctx.bezierCurveTo(60,55,28,84,0,102);ctx.bezierCurveTo(-28,84,-60,55,-65,11);ctx.closePath();ctx.stroke();
  for(const [bx,by,label]of[[-31,-21,'VE'],[31,-21,'RI'],[0,39,'TAS']]){ctx.strokeRect(bx-24,by-19,48,34);ctx.beginPath();ctx.moveTo(bx,by-19);ctx.lineTo(bx,by+15);ctx.stroke();ctx.font='12px Georgia,serif';ctx.textAlign='center';ctx.fillText(label,bx,by+4);}
  ctx.restore();
}

function drawPaper(ctx,w,h) {
  const random=seeded(1636);ctx.fillStyle='#eae0cb';ctx.fillRect(0,0,w,h);
  const light=ctx.createRadialGradient(w*.42,h*.3,0,w*.42,h*.3,h*.9);light.addColorStop(0,'#fff8e880');light.addColorStop(1,'#a58a5920');ctx.fillStyle=light;ctx.fillRect(0,0,w,h);
  for(let i=0;i<43000;i++){ctx.fillStyle=`rgba(117,89,43,${.025+random()*.045})`;ctx.fillRect(random()*w,random()*h,.5+random()*2.1,.4+random());}
  ctx.strokeStyle='#a18c614d';ctx.lineWidth=1.5;ctx.strokeRect(57,57,w-114,h-114);ctx.lineWidth=.7;ctx.strokeRect(66,66,w-132,h-132);
}

function pageMap(side,portrait) {
  return canvasTexture(1664,2048,(ctx,w,h)=>{
    drawPaper(ctx,w,h);
    if(portrait){ctx.translate(w/2,h/2);ctx.rotate(Math.PI/2);ctx.translate(-h/2,-w/2);[w,h]=[h,w];}
    ctx.textAlign='left';ctx.fillStyle='#85714b';ctx.font='23px Georgia,serif';ctx.fillText(side==='left'?'HARVARD · UM ATLAS DE IDEIAS':'SEIS VOLUMES · MUITOS CAMINHOS',126,143);
    ctx.fillStyle='#303b46';ctx.font='112px Georgia,serif';ctx.fillText(side==='left'?'O conhecimento':'Escolha um',126,300);ctx.font='italic 109px Georgia,serif';ctx.fillText(side==='left'?'abre caminhos.':'novo capítulo.',126,423);
    ctx.strokeStyle='#a188575f';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(126,479);ctx.lineTo(w-126,479);ctx.stroke();
    ctx.fillStyle='#8f7952';ctx.font='27px Georgia,serif';ctx.textAlign='center';ctx.fillText(side==='left'?'ORIGENS · BIBLIOTECA · ARQUITETURA':'ACERVO · CAMPUS · NOVAS IDEIAS',w/2,h-238);
    ctx.font='italic 31px Georgia,serif';ctx.fillStyle='#7e6a4b';ctx.fillText(side==='left'?'Um lugar para guardar novas perguntas.':'Toque em um volume para abrir sua história.',w/2,h-166);
    ctx.font='20px Georgia,serif';ctx.fillStyle='#a38b61';ctx.fillText(side==='left'?'I':'II',w/2,h-93);
  });
}

function outerCoverMap() {
  return canvasTexture(3072,4096,(ctx,w,h)=>{
    ctx.fillStyle='#253644';ctx.fillRect(0,0,w,h);const random=seeded(1636);
    for(let i=0;i<65000;i++){ctx.fillStyle=`rgba(225,218,194,${random()*.045})`;ctx.fillRect(random()*w,random()*h,1,2);}
    ctx.strokeStyle='#b69b63';ctx.lineWidth=4;ctx.strokeRect(158,158,w-316,h-316);ctx.lineWidth=1.5;ctx.strokeRect(183,183,w-366,h-366);
    ctx.fillStyle='#d9c59b';ctx.textAlign='center';ctx.font='41px Georgia,serif';ctx.fillText('CAMBRIDGE · MASSACHUSETTS',w/2,506);
    ctx.strokeStyle='#c5ac77';drawShield(ctx,w/2,1225,3.0);
    ctx.font='306px Georgia,serif';ctx.fillText('HARVARD',w/2,2198);ctx.font='italic 161px Georgia,serif';ctx.fillText('Um atlas de ideias.',w/2,2487);
    ctx.beginPath();ctx.moveTo(w*.43,2820);ctx.lineTo(w*.57,2820);ctx.stroke();ctx.font='93px Georgia,serif';ctx.fillText('VERITAS',w/2,3146);ctx.font='53px Georgia,serif';ctx.fillText('EST. 1636',w/2,3570);
  });
}

const imagePromises=new Map();
function localImage(path){if(!imagePromises.has(path))imagePromises.set(path,new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=path;}));return imagePromises.get(path);}
function coverMap(volume){return canvasTexture(768,1280,(ctx,w,h)=>{
  const random=seeded(1636);ctx.fillStyle=volume.color;ctx.fillRect(0,0,w,h);
  for(let i=0;i<13000;i++){ctx.fillStyle=`rgba(230,223,203,${random()*.045})`;ctx.fillRect(random()*w,random()*h,.5,1.6);}
  ctx.strokeStyle=volume.ink;ctx.globalAlpha=.5;ctx.lineWidth=1.8;ctx.strokeRect(38,38,w-76,h-76);ctx.strokeRect(47,47,w-94,h-94);ctx.globalAlpha=1;ctx.fillStyle=volume.ink;ctx.textAlign='center';ctx.font='29px Georgia,serif';ctx.fillText('HARVARD',w/2,143);ctx.font='23px Georgia,serif';ctx.fillText(volume.kicker,w/2,216);
  let font=91;while(font>58){ctx.font=`${font}px Georgia,serif`;if(ctx.measureText(volume.title).width<w-120)break;font-=2;}ctx.fillText(volume.title,w/2,390);
  ctx.fillStyle=volume.ink;ctx.globalAlpha=.12;ctx.fillRect(94,478,w-188,491);ctx.globalAlpha=.55;ctx.lineWidth=1;ctx.strokeRect(85,469,w-170,509);ctx.globalAlpha=1;
  ctx.fillStyle=volume.ink;ctx.font='italic 26px Georgia,serif';ctx.fillText('Um volume para descobrir.',w/2,1095);ctx.font='21px Georgia,serif';ctx.fillText('VERITAS',w/2,1173);
});}

function assembled(frame,order) {
  const scroll=smooth(.10+order*.026,.17+order*.030,frame.progress||0);
  const command=frame.selection?smooth(.05+order*.018,.25+order*.018,frame.selectionElapsed||0):0;
  return Math.max(scroll,command);
}

function Bookmark({frame,order,reduced,color}) {
  const geometry=useMemo(()=>{const g=new THREE.PlaneGeometry(.082,.46,1,15);g.translate(0,-.23,0);return g;},[]);
  const base=useMemo(()=>new Float32Array(geometry.attributes.position.array),[geometry]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame(()=>{const p=geometry.attributes.position,time=frame.clock||0;for(let i=0;i<p.count;i++){const x=base[i*3],y=base[i*3+1],u=-y/.46;p.setXYZ(i,x+(reduced?0:Math.sin(time*.72+order*.9-u*2.3)*.017*u*u),y,Math.sin(u*2.3)*.024+(reduced?0:Math.sin(time*.85+order-u*3)*.028*u*u));}p.needsUpdate=true;geometry.computeVertexNormals();});
  return <mesh geometry={geometry} position={[.27,-1.05,.025]} rotation-z={order%2?.09:-.07} castShadow><meshPhysicalMaterial color={color} roughness={.72} sheen={.7} sheenColor="#ead7a7" side={THREE.DoubleSide}/></mesh>;
}

function ArchiveNote({side,portrait,fabric,frame,reduced}) {
  const ref=useRef(),order=side==='left'?0:1;
  const texture=useMemo(()=>canvasTexture(1024,640,(ctx,w,h)=>{drawPaper(ctx,w,h);ctx.textAlign='left';ctx.fillStyle='#43505a';ctx.font='italic 72px Georgia,serif';ctx.fillText(order?'Uma nova pergunta.':'Notas do atlas.',90,175);ctx.strokeStyle='#b09b7044';ctx.lineWidth=1.4;for(let y=250;y<540;y+=76){ctx.beginPath();ctx.moveTo(95,y);ctx.lineTo(w-100-(y%3)*17,y);ctx.stroke();}ctx.font='21px Georgia,serif';ctx.fillStyle='#9b8254';ctx.fillText('HARVARD · VERITAS',95,574);}),[order]);
  const geometry=useMemo(()=>new THREE.PlaneGeometry(1.18,.78,18,10),[]),base=useMemo(()=>new Float32Array(geometry.attributes.position.array),[geometry]);
  useEffect(()=>()=>{texture.dispose();geometry.dispose();},[texture,geometry]);
  useFrame(()=>{
    if(!ref.current)return;const build=Math.max(smooth(.205+order*.025,.32+order*.025,frame.progress||0),frame.selection?smooth(.15,.42,frame.selectionElapsed||0):0),time=frame.clock||0,ambient=reduced||frame.selection?0:1;
    ref.current.visible=build>.005;
    const x=portrait?(side==='left'?1.85:-1.85):(side==='left'?-1.85:1.85),y=portrait?(side==='left'?-2.20:2.20):-2.31;
    ref.current.position.set(x+(1-build)*(side==='left'?-.32:.32),y-(1-build)*.32,.12+(1-build)*.55+ambient*Math.sin(time*.52+order)*.012);
    ref.current.rotation.set((1-build)*-.23,0,(portrait?-Math.PI/2:0)+(side==='left'?-.105:.085)+(1-build)*.12);
    const p=geometry.attributes.position;for(let i=0;i<p.count;i++){const x0=base[i*3],y0=base[i*3+1],u=(x0+.59)/1.18,v=(y0+.39)/.78;p.setXYZ(i,x0,y0,Math.sin(u*Math.PI)*.014+Math.pow(u,3)*(.026+ambient*Math.sin(time*.65+order+v*1.2)*.019));}p.needsUpdate=true;geometry.computeVertexNormals();
  });
  return <mesh ref={ref} geometry={geometry} castShadow receiveShadow><meshStandardMaterial map={texture} bumpMap={fabric.fibre} bumpScale={.0016} roughness={.96} side={THREE.DoubleSide}/></mesh>;
}

function ArchiveDust({frame,reduced}) {
  const points=useRef();
  const geometry=useMemo(()=>{const random=seeded(1932),a=new Float32Array(36*3);for(let i=0;i<36;i++){a[i*3]=(random()-.5)*10.5;a[i*3+1]=(random()-.5)*6.1;a[i*3+2]=.6+random()*.9;}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(a,3));return g;},[]),base=useMemo(()=>new Float32Array(geometry.attributes.position.array),[geometry]);
  const soft=useMemo(()=>canvasTexture(32,32,(ctx,w,h)=>{const g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'#fff4d5');g.addColorStop(.25,'#fff4d5b0');g.addColorStop(1,'#fff4d500');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}),[]);
  useEffect(()=>()=>{geometry.dispose();soft.dispose();},[geometry,soft]);
  useFrame(()=>{if(!points.current)return;points.current.visible=!reduced&&frame.opening>.8;const p=geometry.attributes.position,time=frame.clock||0;for(let i=0;i<p.count;i++)p.setXYZ(i,base[i*3]+Math.sin(time*.12+i)*.025,base[i*3+1]+Math.sin(time*.16+i*.7)*.045,base[i*3+2]);p.needsUpdate=true;points.current.material.opacity=.16*smooth(.15,.32,frame.progress||0);});
  return <points ref={points} geometry={geometry}><pointsMaterial map={soft} color="#f6e3b5" size={.035} sizeAttenuation transparent opacity={.14} depthWrite={false} blending={THREE.AdditiveBlending}/></points>;
}

function MiniVolume({volume,index,side,portrait,fabric,frame,selected,hovered,onHover,onSelect,onDelivered,active,reduced}) {
  const lift=useRef(),cover=useRef(),phase=useRef(0),hover=useRef(0),ambientWeight=useRef(0),delivered=useRef(false),order=index+(side==='right'?3:0);
  const {invalidate}=useThree();
  const texture=useMemo(()=>coverMap(volume),[volume]);
  const interior=useMemo(()=>canvasTexture(768,1280,(ctx,w,h)=>{drawPaper(ctx,w,h);ctx.textAlign='center';ctx.fillStyle='#34434b';ctx.font='65px Georgia,serif';ctx.fillText(volume.title,w/2,410);ctx.font='italic 38px Georgia,serif';ctx.fillText('A descoberta continua.',w/2,620);ctx.fillStyle='#a18a5d';ctx.font='31px Georgia,serif';ctx.fillText(volume.kicker,w/2,993);}),[volume]);
  useEffect(()=>{let live=true;localImage(volume.image).then(image=>{if(!live||!image)return;const ctx=texture.image.getContext('2d'),x=94,y=478,w=580,h=491,ratio=w/h;let sw=image.width,sh=image.height,sx=0,sy=0;if(sw/sh>ratio){sw=sh*ratio;sx=(image.width-sw)/2;}else{sh=sw/ratio;sy=(image.height-sh)/2;}ctx.drawImage(image,sx,sy,sw,sh,x,y,w,h);texture.needsUpdate=true;invalidate();});return()=>{live=false;};},[volume,texture,invalidate]);
  useEffect(()=>()=>{texture.dispose();interior.dispose();},[texture,interior]);
  useEffect(()=>{if(!selected)delivered.current=false;},[selected]);
  const x=portrait?0:(index-1)*1.64,y=portrait?(1-index)*1.87:-.36;
  useFrame((state,delta)=>{
    const dt=Math.min(delta,.08),build=assembled(frame,order),target=selected&&frame.opening>.92&&build>.96?1:0,time=frame.clock||0;
    phase.current=reduced?target:THREE.MathUtils.damp(phase.current,target,7.5,dt);
    hover.current=reduced?0:THREE.MathUtils.damp(hover.current,hovered&&!selected&&frame.opening>.9?1:0,10,dt);
    const ambientTarget=!reduced&&!frame.selection&&!hovered&&frame.opening>.95&&build>.995?1:0;
    if(!frame.paused||frame.selection||hovered||reduced)ambientWeight.current=THREE.MathUtils.damp(ambientWeight.current,ambientTarget,9,dt);
    const ambient=ambientWeight.current*smooth(.85,.95,frame.opening)*smooth(.97,1,build),drift=Math.sin(time*.72+order*.83)*.018*ambient,breath=(.078+Math.sin(time*.86+order*.91)*.078)*ambient;
    if(lift.current){lift.current.visible=build>.005;lift.current.scale.setScalar(.84+.16*build);lift.current.position.set(x+(1-build)*(index-1)*.28,y+(1-build)*(.63+order*.045),.21+(1-build)*.96+phase.current*1.16+hover.current*.13+drift);lift.current.rotation.set(-(1-build)*.22-phase.current*.12,phase.current*-.16+hover.current*-.08,(portrait?-Math.PI/2:0)+(index-1)*.028+phase.current*.025+(1-build)*(index%2?-.17:.13));}
    if(cover.current)cover.current.rotation.y=-phase.current*2.55-breath-(1-build)*.16-hover.current*.11;
    if(selected&&phase.current>.965&&!delivered.current){delivered.current=true;onDelivered(volume.id);}
  });
  const select=event=>{event.stopPropagation();if(active&&frame.opening>.85&&!selected)onSelect(volume.id);};
  return <group ref={lift} position={[x,y,.21]} rotation-z={portrait?-Math.PI/2:(index-1)*.028} onClick={select} onPointerOver={event=>{event.stopPropagation();if(active&&frame.opening>.85)onHover(volume.id);}} onPointerOut={()=>onHover(null)}>
    <RoundedBox args={[1.30,2.27,.085]} radius={.027} smoothness={3} position={[0,0,-.13]} castShadow receiveShadow><meshPhysicalMaterial color={volume.color} normalMap={fabric.normal} normalScale={new THREE.Vector2(.15,.15)} roughnessMap={fabric.rough} roughness={.95}/></RoundedBox>
    <RoundedBox args={[1.20,2.14,.19]} radius={.014} smoothness={2} position={[.013,0,.003]} castShadow receiveShadow><meshStandardMaterial color="#dfd3b7" roughness={.94}/></RoundedBox>
    {Array.from({length:8},(_,i)=><mesh key={i} position={[.616,0,-.078+i*.023]}><boxGeometry args={[.005,2.1,.006]}/><meshStandardMaterial color={i%3?'#cabea1':'#f0e7d0'} roughness={1}/></mesh>)}
    <mesh position={[.012,0,.103]}><planeGeometry args={[1.18,2.11]}/><meshStandardMaterial map={interior} roughness={.96}/></mesh>
    <Bookmark frame={frame} order={order} reduced={reduced} color={index%2?'#a08a5b':'#7e8e8a'}/>
    <RoundedBox args={[.095,2.28,.285]} radius={.032} smoothness={3} position={[-.622,0,-.002]} castShadow><meshPhysicalMaterial color={volume.color} normalMap={fabric.normal} roughnessMap={fabric.rough} roughness={.96}/></RoundedBox>
    <group ref={cover} position={[-.65,0,.143]}>
      <RoundedBox args={[1.30,2.27,.075]} radius={.026} smoothness={3} position={[.65,0,0]} castShadow receiveShadow><meshPhysicalMaterial color={volume.color} normalMap={fabric.normal} normalScale={new THREE.Vector2(.17,.17)} roughnessMap={fabric.rough} roughness={.94}/></RoundedBox>
      <mesh position={[.65,0,.039]}><planeGeometry args={[1.27,2.235]}/><meshPhysicalMaterial map={texture} normalMap={fabric.normal} normalScale={new THREE.Vector2(.12,.12)} roughnessMap={fabric.rough} roughness={.94} metalness={0}/></mesh>
      <mesh position={[.65,0,-.039]} rotation-y={Math.PI}><planeGeometry args={[1.24,2.18]}/><meshStandardMaterial map={interior} roughness={.94}/></mesh>
    </group>
  </group>;
}

function AlbumScene({motion,quality,reduced,paused,active,selected,hovered,onHover,onSelect,onDelivered,onOpened,onReady}) {
  const root=useRef(),hinge=useRef(),spine=useRef(),progress=useRef(0),opening=useRef(0),ambientClock=useRef(0),selectionClock=useRef(0),lastSelection=useRef(null),ready=useRef(false),wasOpen=useRef(false);
  const {camera,size,gl}=useThree();
  const portrait=size.width/size.height<.88;
  const fabric=useMemo(fabricMaps,[]),leftMap=useMemo(()=>pageMap('left',portrait),[portrait]),rightMap=useMemo(()=>pageMap('right',portrait),[portrait]),coverMap=useMemo(outerCoverMap,[]);
  const frame=useMemo(()=>({opening:0,progress:0,clock:0,paused:false,selection:null,selectionElapsed:0}),[]),eye=useMemo(()=>new THREE.Vector3(),[]);
  useEffect(()=>()=>{Object.values(fabric).forEach(t=>t.dispose());coverMap.dispose();},[fabric,coverMap]);
  useEffect(()=>()=>leftMap.dispose(),[leftMap]);useEffect(()=>()=>rightMap.dispose(),[rightMap]);
  useFrame((state,delta)=>{
    if(!root.current||!hinge.current)return;
    const dt=Math.min(delta,.08);
    // Scrolling and choosing a volume are visitor commands. The ambient pause
    // control must never freeze the requested book position or block a click.
    const requested=clamp(motion?.progress||0);progress.current=reduced?requested:THREE.MathUtils.damp(progress.current,requested,12,dt);const target=selected?1:smooth(0,.22,progress.current);opening.current=reduced?target:THREE.MathUtils.damp(opening.current,target,10,dt);
    if(active&&!paused&&!reduced)ambientClock.current+=dt;
    if(lastSelection.current!==selected){lastSelection.current=selected;selectionClock.current=0;}
    if(selected)selectionClock.current+=dt;
    const o=opening.current;frame.opening=o;frame.progress=progress.current;frame.clock=ambientClock.current;frame.paused=paused;frame.selection=selected;frame.selectionElapsed=selectionClock.current;
    hinge.current.rotation.y=-Math.PI*o;hinge.current.position.z=.995-o*1.015;
    if(spine.current){spine.current.scale.z=1-o*.81;spine.current.position.z=.30-o*.44;}
    eye.set(0,portrait?.25:1.35,16.3);camera.position.copy(eye);camera.lookAt(0,0,0);camera.updateProjectionMatrix();
    const viewH=2*eye.length()*Math.tan(THREE.MathUtils.degToRad(36)/2),viewW=viewH*size.width/size.height;
    const contentW=portrait?PAGE_H:PAGE_W*2,contentH=portrait?PAGE_W*2:PAGE_H,scale=Math.min(viewW*.94/contentW,viewH*.91/contentH);
    root.current.scale.setScalar(scale);root.current.rotation.set(0,0,portrait?Math.PI/2:0);
    // Closed cover is centred; the object expands into a complete, fitted spread.
    const offset=(1-o)*PAGE_W*.5*scale;
    root.current.position.set(portrait?0:-offset,portrait?-offset:0,0);
    const opened=o>.94;if(opened!==wasOpen.current){wasOpen.current=opened;onOpened(opened);}
    gl.domElement.dataset.albumProgress=progress.current.toFixed(4);gl.domElement.dataset.albumOpening=o.toFixed(4);gl.domElement.dataset.albumSelection=selected||'';gl.domElement.dataset.albumLayout=portrait?'portrait':'landscape';gl.domElement.dataset.albumAmbientTime=ambientClock.current.toFixed(3);gl.domElement.dataset.albumAssembled=ALBUM_VOLUMES.filter((_,order)=>assembled(frame,order)>.99).length;
    gl.domElement.style.cursor=hovered&&active?'pointer':'auto';
    if(!ready.current){ready.current=true;onReady?.();}
  },-1);
  const cloth={color:'#263846',normalMap:fabric.normal,normalScale:new THREE.Vector2(.19,.19),roughnessMap:fabric.rough,roughness:.97,sheen:.15,sheenColor:'#b4bcc0'};
  const paperMaterial={bumpMap:fabric.fibre,bumpScale:.0026,roughnessMap:fabric.rough,roughness:.99};
  return <>
    <ambientLight intensity={.42}/><hemisphereLight args={['#fff5df','#575041',1.1]}/>
    <spotLight position={[-5,8,13]} angle={.7} penumbra={.9} intensity={285} decay={2} color="#fff2d4" castShadow shadow-mapSize-width={quality==='cinema'?2048:1536} shadow-mapSize-height={quality==='cinema'?2048:1536} shadow-camera-near={1} shadow-camera-far={40} shadow-bias={-.0002}/>
    <directionalLight position={[7,-2,5]} intensity={1.1} color="#d9e5ec"/>
    <Environment resolution={256}><Lightformer position={[-5,5,8]} rotation-y={.35} scale={[5,9,1]} intensity={1.6} color="#fff5de"/><Lightformer position={[6,1,7]} rotation-y={-.5} scale={[4,8,1]} intensity={1.1} color="#e5edf2"/></Environment>
    <mesh position={[0,0,-1.05]} receiveShadow><planeGeometry args={[55,55]}/><meshStandardMaterial color="#c5b79c" bumpMap={fabric.fibre} bumpScale={.012} roughness={1}/></mesh>
    <group ref={root}>
      <RoundedBox args={[PAGE_W+.15,PAGE_H+.17,BOARD]} radius={.055} smoothness={4} position={[PAGE_W/2,0,-.29]} castShadow receiveShadow><meshPhysicalMaterial {...cloth}/></RoundedBox>
      {Array.from({length:14},(_,i)=><mesh key={i} position={[PAGE_W/2+.007,0,-.20+i*.018]} castShadow receiveShadow><boxGeometry args={[PAGE_W-.11,PAGE_H-.1,.014]}/><meshStandardMaterial color={i%4?'#d9cbaa':'#ebdfc6'} roughness={.98}/></mesh>)}
      <mesh position={[PAGE_W/2,0,.069]} receiveShadow><planeGeometry args={[PAGE_W-.055,PAGE_H-.055]}/><meshStandardMaterial map={rightMap} {...paperMaterial}/></mesh>
      <group position={[PAGE_W/2,0,.08]}>{ALBUM_VOLUMES.slice(3).map((volume,index)=><MiniVolume key={volume.id} volume={volume} index={index} side="right" portrait={portrait} fabric={fabric} frame={frame} selected={selected===volume.id} hovered={hovered===volume.id} onHover={onHover} onSelect={onSelect} onDelivered={onDelivered} active={active} reduced={reduced}/>)}<ArchiveNote side="right" portrait={portrait} fabric={fabric} frame={frame} reduced={reduced}/></group>
      <RoundedBox ref={spine} args={[.19,PAGE_H+.16,1.31]} radius={.075} smoothness={4} position={[0,0,.30]} castShadow receiveShadow><meshPhysicalMaterial {...cloth} color="#1b2c38"/>{[-2.85,-2.55,2.55,2.85].map(y=><mesh key={y} position={[.018,y,.660]}><boxGeometry args={[.10,.014,.018]}/><meshStandardMaterial color="#b8a27a" roughness={.9}/></mesh>)}</RoundedBox>
      <group ref={hinge} position={[0,0,.995]}>
        <RoundedBox args={[PAGE_W+.15,PAGE_H+.17,BOARD]} radius={.055} smoothness={4} position={[PAGE_W/2,0,0]} castShadow receiveShadow><meshPhysicalMaterial {...cloth}/></RoundedBox>
        <mesh position={[PAGE_W/2,0,.082]}><planeGeometry args={[PAGE_W+.075,PAGE_H+.09]}/><meshPhysicalMaterial map={coverMap} normalMap={fabric.normal} normalScale={new THREE.Vector2(.14,.14)} roughnessMap={fabric.rough} roughness={.95}/></mesh>
        <group position={[PAGE_W/2,0,-.087]} rotation-y={Math.PI}>
          <mesh receiveShadow><planeGeometry args={[PAGE_W-.055,PAGE_H-.055]}/><meshStandardMaterial map={leftMap} {...paperMaterial}/></mesh>
          {ALBUM_VOLUMES.slice(0,3).map((volume,index)=><MiniVolume key={volume.id} volume={volume} index={index} side="left" portrait={portrait} fabric={fabric} frame={frame} selected={selected===volume.id} hovered={hovered===volume.id} onHover={onHover} onSelect={onSelect} onDelivered={onDelivered} active={active} reduced={reduced}/>)}
          <ArchiveNote side="left" portrait={portrait} fabric={fabric} frame={frame} reduced={reduced}/>
        </group>
      </group>
      <ArchiveDust frame={frame} reduced={reduced}/>
    </group>
  </>;
}

function AlbumFallback({onVolume}) {
  return <div className="ha3-fallback"><p className="ha3-eyebrow">HARVARD · UM ATLAS DE IDEIAS</p><h2>Escolha um volume.</h2><p>A leitura permanece disponível neste navegador.</p><div>{ALBUM_VOLUMES.map(volume=><button key={volume.id} onClick={()=>onVolume?.(volume.id)}>{volume.title}<span aria-hidden="true">↗</span></button>)}</div></div>;
}

class AlbumBoundary extends React.Component {
  state={failed:false};static getDerivedStateFromError(){return{failed:true};}
  componentDidCatch(){this.props.onFailure?.();}
  render(){return this.state.failed?<AlbumFallback onVolume={this.props.onVolume}/>:this.props.children;}
}

/** Full-viewport physical folio. Parent supplies BOOK-LOCAL scroll progress 0..1. */
export default function HarvardAlbum3D({motion,quality='high',reduced=false,paused=false,active=true,onVolume,onReady}) {
  const profile=useViewportRenderQuality(quality),zero=useRef({progress:0});
  const [selected,setSelected]=useState(null),[hovered,setHovered]=useState(null),[opened,setOpened]=useState(false),[failed,setFailed]=useState(false);
  const delivered=useRef(false),callback=useRef(onVolume),resetTimer=useRef();callback.current=onVolume;
  useEffect(()=>{if(!active){clearTimeout(resetTimer.current);setSelected(null);setHovered(null);delivered.current=false;}},[active]);
  useEffect(()=>()=>clearTimeout(resetTimer.current),[]);
  const select=id=>{if(!active||selected)return;if(failed){callback.current?.(id);return;}clearTimeout(resetTimer.current);delivered.current=false;setSelected(id);};
  const handoff=id=>{if(delivered.current)return;delivered.current=true;callback.current?.(id);resetTimer.current=setTimeout(()=>{setSelected(null);setHovered(null);},350);};
  return <section className={`harvard-album-3d ${opened?'ha3-open':'ha3-closed'} ${selected?'ha3-selecting':''}`} aria-label="Álbum de Harvard com seis volumes interativos" data-active={active}>
    <div className="ha3-canvas"><AlbumBoundary onVolume={onVolume} onFailure={()=>setFailed(true)}><Canvas dpr={profile.dpr} shadows={{type:THREE.PCFSoftShadowMap}} frameloop={active?'always':'demand'} camera={{position:[0,1.35,16.3],fov:36,near:.1,far:65}} gl={{alpha:true,antialias:true,powerPreference:'high-performance'}} fallback={<span aria-hidden="true">Álbum visual de Harvard.</span>} onCreated={({gl})=>{gl.domElement.setAttribute('aria-hidden','true');gl.setClearColor('#000000',0);gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.08;}}><Suspense fallback={null}><AlbumScene motion={motion||zero.current} quality={quality} reduced={reduced} paused={paused} active={active} selected={selected} hovered={hovered} onHover={setHovered} onSelect={select} onDelivered={handoff} onOpened={setOpened} onReady={onReady}/></Suspense></Canvas></AlbumBoundary></div>
    <div className="ha3-instruction" aria-hidden="true"><span>{opened?'SEIS VOLUMES. NOVAS PERSPECTIVAS.':'UM ÁLBUM PARA DESCOBRIR.'}</span><p>{selected?'Abrindo o volume…':opened?'Escolha um livro. Continue a descoberta.':'Role para abrir — ou escolha um volume.'}</p></div>
    <nav className="ha3-volume-nav" aria-label="Volumes do álbum">{ALBUM_VOLUMES.map((volume,index)=><button key={volume.id} onClick={()=>select(volume.id)} onPointerEnter={()=>setHovered(volume.id)} onPointerLeave={()=>setHovered(null)} onFocus={()=>setHovered(volume.id)} onBlur={()=>setHovered(null)} disabled={Boolean(selected)||!active} aria-label={`Abrir ${volume.title}`}><span>{String(index+1).padStart(2,'0')}</span>{volume.title}</button>)}</nav>
    <p className="ha3-sr" role="status" aria-live="polite">{selected?`Abrindo ${ALBUM_VOLUMES.find(v=>v.id===selected)?.title}`:opened?'Álbum aberto. Selecione um dos seis volumes.':'Álbum fechado. Role para abrir ou escolha um volume nos controles.'}</p>
  </section>;
}
