import React,{forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';
import {createScrollSeekDriver} from './ScrollSeek.mjs';

export const REAL_FILM={videoId:'CXkjHLBr_y0',source:'https://hls.harvard.edu/amicus-libris/langdell-reading-room-closed-until-future-notice/',start:262.4,end:265.3,nativeQuality:'1080p',place:'Langdell Hall · Harvard Law School'};
let library;
function loadPlayer(){
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(!library)library=new Promise((resolve,reject)=>{const prior=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{prior?.();resolve(window.YT);};const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;script.onerror=()=>{library=undefined;reject(new Error('Player unavailable'));};document.head.append(script);});
 return library;
}
/** Source-player prototype: scroll controls the time of a short original take.
 * This embedded excerpt is not a volumetric scan or a continuous interior walk. */
export default forwardRef(function ScrollFilm({journey,active,onReady,onError,onStatus},ref){
 const host=useRef(),api=useRef(),activeRef=useRef(active),callbacks=useRef({onReady,onError,onStatus}),[status,setStatus]=useState('loading'),[attempt,setAttempt]=useState(0);
 activeRef.current=active;callbacks.current={onReady,onError,onStatus};
 useImperativeHandle(ref,()=>({start(){api.current?.mute();api.current?.playVideo();},retry(){setAttempt(n=>n+1);}}),[]);
 useEffect(()=>{
  let alive=true,initial=true,played=false,timer,watchdog,player,driver;
  const update=next=>{if(alive){setStatus(next);callbacks.current.onStatus?.(next);}};
  const fail=()=>{if(alive){clearTimeout(watchdog);update('error');callbacks.current.onError?.();}};
  const publishReady=()=>{if(!alive||!initial)return;initial=false;clearTimeout(watchdog);update('ready');callbacks.current.onReady?.();};
  update('loading');
  watchdog=setTimeout(fail,20000);
  loadPlayer().then(YT=>{
   if(!alive)return;
   const mount=document.createElement('div');host.current.replaceChildren(mount);
   player=new YT.Player(mount,{width:1280,height:720,videoId:REAL_FILM.videoId,playerVars:{autoplay:1,mute:1,controls:0,disablekb:1,playsinline:1,rel:0,start:262,cc_load_policy:0,origin:window.location.origin},events:{
    onReady:e=>{if(!alive)return;e.target.mute();e.target.seekTo(REAL_FILM.start,true);e.target.playVideo();},
    onStateChange:e=>{
     if(!alive)return;
     if(initial&&e.data===1&&player.getCurrentTime()>=REAL_FILM.start-.20){played=true;player.pauseVideo();}
     else if(initial&&played&&e.data===2)publishReady();
     else if(!initial&&e.data===1)player.pauseVideo();
    },
    onError:fail,
    onAutoplayBlocked:()=>{if(alive){clearTimeout(watchdog);update('blocked');}}
   }});api.current=player;
   driver=createScrollSeekDriver({readTime:()=>player.getCurrentTime(),readState:()=>player.getPlayerState(),seek:time=>player.seekTo(time,true),pause:()=>player.pauseVideo(),now:()=>performance.now(),start:REAL_FILM.start,end:REAL_FILM.end});
   const tick=()=>{
    if(!alive)return;
    if(initial&&player.getPlayerState?.()===1&&player.getCurrentTime()>=REAL_FILM.start-.20){played=true;player.pauseVideo();}
    if(!initial){
     const {time,target}=driver.tick(journey.progress,activeRef.current);
     const frame=player.getIframe?.();
     frame?.setAttribute('data-film-seconds',String(time.toFixed(3)));
     frame?.setAttribute('data-film-target',String(target.toFixed(3)));
     frame?.setAttribute('data-film-state',String(player.getPlayerState()));
    }
    timer=setTimeout(tick,50);
   };tick();
  }).catch(fail);
  return()=>{alive=false;clearTimeout(timer);clearTimeout(watchdog);player?.destroy?.();api.current=null;};
 },[journey,attempt]);
 return <div className="real-scroll-film" data-status={status}><div ref={host} className="real-scroll-film__host"/>
  {status==='loading'&&<div className="real-film-loading" role="status">Preparando a sala de leitura…</div>}
 </div>;
});
