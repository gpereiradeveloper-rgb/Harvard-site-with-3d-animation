import React from 'react';
import './ArchiveEditorial.css';

function DirectionArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 5 14 14M6 19h13V6" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

/** Editorial overlays designed in Figma; opacity follows the existing journey clock. */
export default function ArchiveEditorial({phase = 'world', className = ''}) {
  return (
    <>
      <aside className={`archive-editorial archive-editorial--world ${className}`} aria-hidden={phase !== 'world'}>
        <p className="archive-editorial__index"><span>02</span>O ateliê de ideias</p>
        <h2 className="archive-editorial__title">O saber<br /><em>ganha vida.</em></h2>
        <p className="archive-editorial__description">Livros que chegam. Ideias que circulam.<br />Conhecimento que encontra seu lugar.</p>
        <p className="archive-editorial__direction"><span>Role para explorar</span><DirectionArrow /></p>
      </aside>
      <aside className={`archive-editorial archive-editorial--passage ${className}`} aria-hidden={phase !== 'passage'}>
        <p className="archive-editorial__index"><span>03</span>Entre páginas</p>
        <h2 className="archive-editorial__title">Uma página.<br /><em>Novos mundos.</em></h2>
        <p className="archive-editorial__description">Entre memórias e descobertas,<br />cada volume abre um caminho.</p>
        <p className="archive-editorial__direction"><span>Continue até o álbum</span><DirectionArrow /></p>
      </aside>
    </>
  );
}
