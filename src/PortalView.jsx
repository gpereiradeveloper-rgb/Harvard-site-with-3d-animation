import React,{useEffect,useMemo} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {useTexture} from '@react-three/drei';
import * as THREE from 'three';
export function librarySource(gl,width){return width>760&&gl.capabilities.maxTextureSize>=16384?'/assets/loker-native.jpg':'/assets/loker-4k.jpg';}
export function yardSource(gl,width){return width>760&&gl.capabilities.maxTextureSize>=8192?'/assets/harvard-yard-8k.jpg':'/assets/harvard-yard-4k.jpg';}
/** A live window samples the same view as its destination, preserving the join. */
export default function PortalView({geometry,type='yard',motion}){
 const {gl,size}=useThree();const map=useTexture(type==='library'?librarySource(gl,size.width):yardSource(gl,size.width));
 const material=useMemo(()=>new THREE.ShaderMaterial({toneMapped:false,uniforms:{image:{value:map},resolution:{value:new THREE.Vector2()},imageAspect:{value:map.image.width/map.image.height},reveal:{value:0}},vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform sampler2D image;uniform vec2 resolution;uniform float imageAspect;uniform float reveal;void main(){vec2 xy=(gl_FragCoord.xy/resolution)*2.-1.;float aspect=resolution.x/resolution.y;${type==='library'?'vec2 uv=vec2(.5+xy.x*.5*aspect/imageAspect,.5+xy.y*.5);':'vec3 ray=normalize(vec3(xy.x*aspect*.726543,xy.y*.726543,-1.));vec2 uv=vec2(fract(1.-atan(-ray.x,-ray.z)/6.283185307),.5+asin(ray.y)/3.141592654);'}vec3 color=texture2D(image,uv).rgb;gl_FragColor=vec4(mix(vec3(.65,.45,.19),color,reveal),1.);\n#include <colorspace_fragment>\n}`}),[map,type]);
 useEffect(()=>{map.colorSpace=THREE.SRGBColorSpace;if(type==='yard')map.wrapS=THREE.RepeatWrapping;map.needsUpdate=true;},[map,type]);
 useFrame(()=>{gl.getDrawingBufferSize(material.uniforms.resolution.value);material.uniforms.reveal.value=type==='library'?THREE.MathUtils.smoothstep(motion?.journey??0,.49,.57):1;});
 useEffect(()=>()=>material.dispose(),[material]);return <mesh geometry={geometry} material={material}/>;
}
