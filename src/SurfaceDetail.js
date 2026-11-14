import * as THREE from 'three';
/** A deterministic paper-fibre height field, shared by pages and stamped foil. */
export function makeFibreTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=2048;
 const c=canvas.getContext('2d');c.fillStyle='#d9d9d9';c.fillRect(0,0,2048,2048);
 let seed=1915;const r=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646;};
 for(let i=0;i<70000;i++){const x=r()*2048,y=r()*2048,angle=r()*Math.PI*2,length=2+r()*11;c.strokeStyle=r()>.5?'rgba(255,255,255,.13)':'rgba(60,60,60,.12)';c.lineWidth=.35+r()*.65;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+Math.cos(angle)*length*.4,y+Math.sin(angle)*length*.4+1,x+Math.cos(angle)*length,y+Math.sin(angle)*length);c.stroke();}
 const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.NoColorSpace;t.anisotropy=16;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1.5,2);return t;
}
