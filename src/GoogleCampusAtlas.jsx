import React,{useEffect,useRef} from 'react';
import gsap from 'gsap';

/* Optional, key-injected real-geography provider. This module contains no API
 * key and makes no SDK request until its owner supplies apiKey. Production
 * credentials, billing, consent and demo-key restrictions belong to the host.
 * API reference checked against Maps JavaScript v3.66 (November 2026):
 * https://developers.google.com/maps/documentation/javascript/reference/3d-map
 * https://developers.google.com/maps/documentation/javascript/reference/3d-map-draw
 */
const clamp=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
const smooth=n=>n*n*(3-2*n);
const lerp=(a,b,t)=>a+(b-a)*t;
const angle=(a,b,t)=>(a+(((b-a+540)%360)-180)*t+360)%360;
const FIRST_SCENE_IDLE_LIMIT=45000;
function cameraTransformChanged(previous,next){
 if(!previous)return true;
 // Ignore native rounding/jitter; accumulate small movements against the last
 // meaningful transform instead of extending the deadline on every tick.
 const latitudeMeters=(next.lat-previous.lat)*111320;
 const longitudeMeters=(next.lng-previous.lng)*82300;
 const headingDegrees=Math.abs(((next.heading-previous.heading+540)%360)-180);
 return Math.hypot(latitudeMeters,longitudeMeters)>.25||Math.abs(next.altitude-previous.altitude)>.25||Math.abs(next.range-previous.range)>.35||headingDegrees>.08||Math.abs(next.tilt-previous.tilt)>.08;
}

// Authored look-at points, not surveyed entrances or an interior navigation
// route. Their relationship follows Harvard's official visitor map:
// https://www.harvard.edu/visit/maps-directions/
export const GOOGLE_ATLAS_STOPS=Object.freeze([
 {at:0,lat:42.3743,lng:-71.1172,altitude:22,range:1050,tilt:52,heading:8},
 {at:.28,lat:42.3746,lng:-71.1169,altitude:23,range:680,tilt:58,heading:5},
 {at:.56,lat:42.3746,lng:-71.1162,altitude:22,range:370,tilt:66,heading:2},
 {at:.80,lat:42.37475,lng:-71.1161,altitude:20,range:185,tilt:73,heading:0},
 {at:1,lat:42.37480,lng:-71.1161,altitude:18,range:104,tilt:79,heading:0},
]);
export function googleAtlasCameraAt(progress){
 const p=clamp(progress);
 let index=GOOGLE_ATLAS_STOPS.findIndex((point,i)=>i<GOOGLE_ATLAS_STOPS.length-1&&p>=point.at&&p<=GOOGLE_ATLAS_STOPS[i+1].at);
 if(index<0)index=GOOGLE_ATLAS_STOPS.length-2;
 const a=GOOGLE_ATLAS_STOPS[index],b=GOOGLE_ATLAS_STOPS[index+1],t=smooth(clamp((p-a.at)/(b.at-a.at)));
 return{center:{lat:lerp(a.lat,b.lat,t),lng:lerp(a.lng,b.lng,t),altitude:lerp(a.altitude,b.altitude,t)},range:Math.exp(lerp(Math.log(a.range),Math.log(b.range),t)),tilt:lerp(a.tilt,b.tilt,t),heading:angle(a.heading,b.heading,t),roll:0};
}

let sdkPromise,requestedKey;
function maps3D(apiKey){
 if(requestedKey&&requestedKey!==apiKey)return Promise.reject(new Error('MAPS_KEY_CHANGED_RELOAD_REQUIRED'));
 if(window.google?.maps?.importLibrary){requestedKey=apiKey;return window.google.maps.importLibrary('maps3d');}
 if(sdkPromise)return sdkPromise;
 requestedKey=apiKey;
 sdkPromise=new Promise((resolve,reject)=>{
  const callback=`__harvardMaps3DReady${Date.now()}`;
  const script=document.createElement('script');
  let settled=false;
  const finish=(error)=>{
   if(settled)return;settled=true;clearTimeout(timeout);delete window[callback];script.onerror=null;
   if(error){script.remove();sdkPromise=undefined;requestedKey=undefined;reject(new Error('MAPS_SDK_UNAVAILABLE'));return;}
   const importer=window.google?.maps?.importLibrary;
   if(!importer){sdkPromise=undefined;requestedKey=undefined;reject(new Error('MAPS_SDK_UNAVAILABLE'));return;}
   window.google.maps.importLibrary('maps3d').then(resolve,()=>{sdkPromise=undefined;requestedKey=undefined;reject(new Error('MAPS_3D_LIBRARY_UNAVAILABLE'));});
  };
  window[callback]=()=>finish();
  const params=new URLSearchParams({key:apiKey,v:'weekly',loading:'async',libraries:'maps3d',language:'pt-BR',region:'US',callback});
  script.src=`https://maps.googleapis.com/maps/api/js?${params}`;
  script.async=true;script.dataset.harvardMapsSdk='true';
  const nonce=document.querySelector('script[nonce]')?.nonce;if(nonce)script.nonce=nonce;
  script.onerror=()=>finish(new Error('NETWORK_ERROR'));
  const timeout=setTimeout(()=>finish(new Error('SDK_TIMEOUT')),30000);
  document.head.append(script);
 });
 return sdkPromise;
}

const LANDMARKS=[
 {id:'yard',name:'Harvard Yard',lat:42.3745,lng:-71.1175},
 {id:'memorial',name:'Memorial Hall',lat:42.3761,lng:-71.1150},
 {id:'university',name:'University Hall',lat:42.3745,lng:-71.1171},
 {id:'church',name:'Memorial Church',lat:42.37491,lng:-71.11603},
];

export default function GoogleCampusAtlas({apiKey,motion,active=true,onReady,onError,onSelect}){
 const host=useRef(),activeRef=useRef(active),callbacks=useRef({onReady,onError,onSelect});
 const usableKey=typeof apiKey==='string'?apiKey.trim():'';
 activeRef.current=active;callbacks.current={onReady,onError,onSelect};
 useEffect(()=>{
  if(!usableKey||!host.current)return;
  let alive=true,map,ticker,rendererDeadline,ready=false,failed=false,lastProgress=-1;
  let lastCameraActivity=performance.now(),lastCameraSnapshot,wasCameraActive=activeRef.current&&!document.hidden;
  const cleanups=[];
  const status=value=>{if(alive&&host.current)host.current.dataset.mapStatus=value;};
  const fail=code=>{
   if(!alive||failed)return;failed=true;status('error');clearTimeout(rendererDeadline);
   if(ticker)gsap.ticker.remove(ticker);
   callbacks.current.onError?.(new Error(code));
  };
  const checkFirstScene=()=>{
   if(!alive||ready||failed)return;
   const now=performance.now();
   if(!activeRef.current||document.hidden)lastCameraActivity=now;
   const remaining=FIRST_SCENE_IDLE_LIMIT-(now-lastCameraActivity);
   if(remaining<=0){fail('MAPS_FIRST_SCENE_TIMEOUT');return;}
   rendererDeadline=setTimeout(checkFirstScene,remaining);
  };
  const visibilityChanged=()=>{lastCameraActivity=performance.now();wasCameraActive=activeRef.current&&!document.hidden;};
  document.addEventListener('visibilitychange',visibilityChanged);
  cleanups.push(()=>document.removeEventListener('visibilitychange',visibilityChanged));
  status('loading-sdk');
  maps3D(usableKey).then(library=>{
   if(!alive)return;
   const {Map3DElement,MapMode,QualityMode,GestureHandling,Marker3DInteractiveElement}=library;
   if(typeof Map3DElement!=='function'){fail('MAPS_3D_UNAVAILABLE');return;}
   const initial=googleAtlasCameraAt(motion?.progress||0);
   map=new Map3DElement({...initial,
    mode:MapMode.SATELLITE,
    qualityMode:QualityMode.FIDELITY,
    // v3.66's 3D GestureHandling has COOPERATIVE/AUTO/GREEDY, not NONE.
    // Ordinary wheel/one-finger input therefore scrolls the host page.
    gestureHandling:GestureHandling.COOPERATIVE,
    defaultUIHidden:true,
    description:'Vista geográfica tridimensional de Harvard. Role a página para seguir o percurso; escolha um lugar para conhecer sua história.',
   });
   Object.assign(map.style,{display:'block',position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'auto'});
   map.dataset.harvardGeographicMap='true';
   const steady=event=>{
    if(!alive||failed)return;
    map.dataset.mapSteady=String(Boolean(event.isSteady));
    if(event.isSteady&&!ready){ready=true;clearTimeout(rendererDeadline);status('ready');callbacks.current.onReady?.();}
   };
   const mapError=()=>fail('MAPS_3D_INITIALIZATION_FAILED');
   map.addEventListener('gmp-steadychange',steady);map.addEventListener('gmp-error',mapError);
   cleanups.push(()=>map.removeEventListener('gmp-steadychange',steady),()=>map.removeEventListener('gmp-error',mapError));
   // These attributes reflect native camera properties, not a claim that its
   // geographic tiles have finished rendering (only isSteady reports that).
   const cameraDiagnostics=()=>{
    const snapshot={range:Number(map.range),lat:Number(map.center?.lat),lng:Number(map.center?.lng),altitude:Number(map.center?.altitude),heading:Number(map.heading),tilt:Number(map.tilt)};
    if(Object.values(snapshot).every(Number.isFinite)&&cameraTransformChanged(lastCameraSnapshot,snapshot)){lastCameraSnapshot=snapshot;lastCameraActivity=performance.now();}
    const values={cameraRange:Number(map.range).toFixed(2),cameraLat:Number(map.center?.lat).toFixed(7),cameraLng:Number(map.center?.lng).toFixed(7),cameraHeading:Number(map.heading).toFixed(3),cameraTilt:Number(map.tilt).toFixed(3)};
    for(const [name,value]of Object.entries(values))if(map.dataset[name]!==value)map.dataset[name]=value;
   };
   for(const name of['gmp-centerchange','gmp-rangechange','gmp-headingchange','gmp-tiltchange']){
    map.addEventListener(name,cameraDiagnostics);cleanups.push(()=>map.removeEventListener(name,cameraDiagnostics));
   }
   if(typeof Marker3DInteractiveElement==='function'){
    for(const place of LANDMARKS){
     try{
      const marker=new Marker3DInteractiveElement({position:{lat:place.lat,lng:place.lng},label:place.name,title:`Descobrir ${place.name}`,sizePreserved:true,drawsWhenOccluded:true});
      marker.dataset.landmark=place.id;
      const select=event=>{event.stopPropagation();callbacks.current.onSelect?.(place.id);};
      marker.addEventListener('gmp-click',select);map.append(marker);
      cleanups.push(()=>marker.removeEventListener('gmp-click',select));
     }catch{/* The base map remains usable through the host's story buttons. */}
    }
   }
   // Never overlay, crop, restyle or disable the provider attribution. The
   // enclosing layout must reserve the map's native bottom attribution strip.
   host.current.replaceChildren(map);status('loading-map');
   const writeCamera=()=>{
    if(!alive||failed||!map)return;
    const p=clamp(motion?.progress||0);if(Math.abs(p-lastProgress)<.000015)return;lastProgress=p;
    const c=googleAtlasCameraAt(p);
    map.range=c.range;map.tilt=c.tilt;map.heading=c.heading;map.roll=0;map.center=c.center;
    cameraDiagnostics();
   };
   writeCamera();
   ticker=()=>{
    const cameraActive=activeRef.current&&!document.hidden;
    if(cameraActive&&!wasCameraActive)lastCameraActivity=performance.now();
    wasCameraActive=cameraActive;
    if(cameraActive)writeCamera();
   };gsap.ticker.add(ticker);
   // Ready means the first scene finished rendering, not merely SDK loaded.
   // Rendering cannot become steady while the visitor keeps moving the camera.
   // Give tiles a full idle interval, excluding hidden/inactive-map time.
   lastCameraActivity=performance.now();
   rendererDeadline=setTimeout(checkFirstScene,FIRST_SCENE_IDLE_LIMIT);
  }).catch(()=>fail('MAPS_SDK_UNAVAILABLE'));
  return()=>{
   alive=false;clearTimeout(rendererDeadline);if(ticker)gsap.ticker.remove(ticker);
   cleanups.forEach(remove=>remove());map?.remove();
  };
 },[usableKey,motion]);
 if(!usableKey)return null;
 return <div ref={host} className="google-campus-atlas" data-provider="google-maps-3d" style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'auto'}}/>;
}
