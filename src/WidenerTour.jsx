import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import './WidenerTour.css';

const TOUR='https://my.matterport.com/show/?m=fs3gQv7n1QG';
const SOURCE='https://library.harvard.edu/libraries/widener';

/** The original public viewer stays intact; no model assets or SDK are copied. */
export default function WidenerTour({open,onClose}){
 const dialog=useRef(null),closeButton=useRef(null),returnFocus=useRef(null),[frameLoaded,setFrameLoaded]=useState(false);
 const restoreFocus=()=>{const target=returnFocus.current;returnFocus.current=null;if(target?.isConnected)target.focus({preventScroll:true});};
 useEffect(()=>{
  const d=dialog.current;if(!d||!open)return;
  returnFocus.current=document.activeElement;setFrameLoaded(false);
  if(!d.open)d.showModal();
  closeButton.current?.focus({preventScroll:true});
  return()=>{if(d.open)d.close();restoreFocus();};
 },[open]);
 if(typeof document==='undefined')return null;
 return createPortal(<dialog ref={dialog} className="widener-tour" data-lenis-prevent aria-labelledby="widener-tour-title" aria-describedby="widener-tour-caption" onCancel={event=>{event.preventDefault();onClose();}} onClose={()=>{if(!dialog.current?.open)restoreFocus();}}>
  <div className="widener-tour__layout">
   <header className="widener-tour__header">
    <div><p>HARVARD LIBRARY</p><h2 id="widener-tour-title">Dentro da Widener.</h2></div>
    <button ref={closeButton} type="button" onClick={onClose} className="widener-tour__close" aria-label="Fechar visita à Widener"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.4"/></svg></button>
   </header>
   <div className="widener-tour__viewer">
    {open&&<iframe src={TOUR} title="Tour oficial e interativo da Widener Library, Harvard" loading="lazy" allow="fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" onLoad={()=>setFrameLoaded(true)}/>}
    {open&&!frameLoaded&&<p className="widener-tour__loading" role="status">Abrindo a visita oficial…</p>}
   </div>
   <footer className="widener-tour__footer">
    <p id="widener-tour-caption">Visita real publicada pela <a href={SOURCE} target="_blank" rel="noopener noreferrer">Harvard Library</a>. Explore os espaços no visualizador original, com seus controles e créditos.</p>
    <a className="widener-tour__external" href={TOUR} target="_blank" rel="noopener noreferrer">Abrir visita em nova aba <span aria-hidden="true">↗</span></a>
   </footer>
  </div>
 </dialog>,document.body);
}
