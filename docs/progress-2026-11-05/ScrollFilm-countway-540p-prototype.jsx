import React,{useEffect,useRef,useState} from 'react';
let library;
function loadPlayer(){
 if(window.Vimeo?.Player)return Promise.resolve(window.Vimeo.Player);
 if(!library)library=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://player.vimeo.com/api/player.js';s.async=true;s.onload=()=>window.Vimeo?.Player?resolve(window.Vimeo.Player):reject(Error('Player unavailable'));s.onerror=reject;document.head.append(s);});
 return library;
}
export const REAL_FILM={url:'https://player.vimeo.com/video/529027309?h=3e580bdd5a&playsinline=1&muted=1&autoplay=1&autopause=0&quality=540p&background=1',source:'https://countway.harvard.edu/about/tours',start:365,end:401,nativeQuality:'540p'};
/** Only one seek is in flight. New scroll targets replace stale queued targets;
 * the timeline never plays independently from the user's scroll. */
export default function ScrollFilm({journey,active,onReady,onError}){
 const frame=useRef(),api=useRef(),target=useRef(REAL_FILM.start),last=useRef(-1),busy=useRef(false),alive=useRef(true),activeRef=useRef(active),[status,setStatus]=useState('loading');
 activeRef.current=active;
 useEffect(()=>{
  alive.current=true;let timer;
  loadPlayer().then(async Player=>{
   if(!alive.current)return;
   const element=document.createElement('iframe');element.src=REAL_FILM.url;element.title='Percurso real pela Countway Library, Harvard — controlado pelo scroll';element.allow='autoplay; fullscreen; picture-in-picture';element.allowFullscreen=true;frame.current.replaceChildren(element);const player=new Player(element);api.current=player;
   await player.ready();await player.setMuted(true);await player.setQuality('540p').catch(()=>{});await player.pause();await player.setCurrentTime(REAL_FILM.start);await player.pause();
   if(!alive.current)return;last.current=REAL_FILM.start;setStatus('ready');onReady?.();
   const tick=async()=>{
    const t=Math.min(1,Math.max(0,(journey.progress-.425)/.425));target.current=REAL_FILM.start+t*(REAL_FILM.end-REAL_FILM.start);
    if(activeRef.current&&!busy.current&&Math.abs(last.current-target.current)>.075){busy.current=true;const requested=target.current;try{await player.setCurrentTime(requested);await player.pause();last.current=requested;if(alive.current)element.setAttribute('data-film-seconds',String(requested.toFixed(3)));}catch{if(alive.current)setStatus('error');}finally{busy.current=false;}}
    if(alive.current)timer=setTimeout(tick,75);
   };tick();
  }).catch(()=>{if(alive.current){setStatus('error');onError?.();}});
  return()=>{alive.current=false;clearTimeout(timer);api.current?.destroy().catch(()=>{});api.current=null;};
 },[journey,onReady,onError]);
 return <div className="real-scroll-film" data-status={status}>
  <div ref={frame} className="real-scroll-film__host"/>
  {status==='loading'&&<div className="real-film-loading" role="status">Preparando o percurso real…</div>}
  {status==='error'&&<div className="real-film-loading" role="status">O vídeo não respondeu. <a href={REAL_FILM.source} target="_blank" rel="noopener noreferrer">Abrir a fonte oficial ↗</a></div>}
 </div>;
}
