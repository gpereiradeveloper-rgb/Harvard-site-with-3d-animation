import React, {useCallback, useEffect, useId, useRef, useState} from 'react';
import './AlbumVolumeReader.css';

const SOURCES = {
  history: 'https://www.harvard.edu/about/history/',
  widener: 'https://library.harvard.edu/libraries/widener/about',
  gutenberg: 'https://library.harvard.edu/collections/gutenberg-bible',
  library: 'https://library.harvard.edu/',
  hollis: 'https://hollis.harvard.edu/',
  dash: 'https://dash.harvard.edu/',
  focus: 'https://www.harvard.edu/in-focus/',
  maps: 'https://www.harvard.edu/visit/maps-directions/',
  campus: 'https://college.harvard.edu/about/campus',
  church: 'https://memorialchurch.harvard.edu/history-0',
};
const PHOTOS = {
  loker: {src: '/assets/loker-4k.jpg', alt: 'Mesas de leitura, estantes e luz natural na Loker Reading Room da Widener Library.', caption: 'Loker Reading Room · Widener Library', credit: 'Jerem43 · CC BY-SA 3.0', href: 'https://commons.wikimedia.org/wiki/File:Loker_Reading_Room.jpg'},
  widener: {src: '/assets/widener-4k.jpg', alt: 'Fachada e escadaria da Harry Elkins Widener Memorial Library.', caption: 'Harry Elkins Widener Memorial Library', credit: 'Fotografia: Ajay Suresh'},
  memorial: {src: '/assets/memorial-hall.jpg', alt: 'A arquitetura de tijolos e a torre de Memorial Hall, em Harvard.', caption: 'Memorial Hall · Harvard University', credit: 'Fotografia: Daderot'},
  church: {src: '/assets/memorial-church-front.jpg', alt: 'Fachada frontal da Memorial Church e o caminho central diante de sua entrada.', caption: 'Memorial Church · Harvard University', credit: 'Ingfbruno · CC BY-SA 3.0', href: 'https://commons.wikimedia.org/wiki/File:USA-Harvard_Memorial_Church.jpg'},
  organ: {src: '/assets/memorial-church-organ.jpg', alt: 'Interior da Memorial Church, com o órgão e a arquitetura do ambiente.', caption: 'Interior da Memorial Church', credit: 'Ingfbruno · CC BY-SA 3.0', href: 'https://commons.wikimedia.org/wiki/File:USA-Harvard_Memorial_Church0.jpg'},
  inscription: {src: '/assets/memorial-church-inscription.jpg', alt: 'Detalhe fotográfico da inscrição memorial na Memorial Church de Harvard.', caption: 'A inscrição da Memorial Church', credit: 'Greger Ravik · CC BY 2.0', href: 'https://commons.wikimedia.org/wiki/File:Harvard_University_7_(49340526081).jpg'},
};
const VOLUMES = {
  origins: {
    roman: 'I', title: 'As origens', subtitle: 'O começo de uma\nlonga conversa.', theme: 'Memória & permanência', intro: 'Uma decisão pública, um legado de livros e uma história que continua a ser escrita. Voltar ao começo é aprender a olhar o presente com mais atenção.',
    pages: [
      {kind: 'opening', title: 'As origens', subtitle: 'O começo de uma\nlonga conversa.', label: 'Uma história que se abre', text: 'Uma decisão pública, um legado de livros e uma história que continua a ser escrita. Voltar ao começo é aprender a olhar o presente com mais atenção.'},
      {kind: 'date', title: 'Um começo\nem Massachusetts.', label: 'O ato de fundação', number: '1636', numberLabel: '28 de outubro', paragraphs: ['Harvard foi fundada em 28 de outubro de 1636 por uma decisão da Assembleia Geral da Colônia da Baía de Massachusetts.', 'A data é um ponto de partida. A história institucional reúne as pessoas, as decisões e as transformações que vieram depois.'], links: [{label: 'Ler a história de Harvard', href: SOURCES.history}]},
      {kind: 'essay', title: 'Um legado\nde livros.', label: 'John Harvard', initial: 'H', paragraphs: ['John Harvard foi o primeiro grande benfeitor da instituição. Ele deixou parte de seus bens e sua biblioteca.', 'Nessa origem, o gesto de doar livros oferece uma imagem duradoura: o conhecimento pode ser recebido, cuidado e compartilhado.'], note: 'Uma biblioteca é também um convite: continuar uma leitura iniciada por outras pessoas.', links: [{label: 'Conhecer as origens do nome', href: SOURCES.history}]},
      {kind: 'photo', title: 'A memória\nganha um lugar.', label: 'Uma fotografia de Harvard', photo: 'widener', paragraphs: ['A Widener pertence a outro capítulo dessa história. Aberta em 1915, foi um presente de Eleanor Elkins Widener em memória de seu filho Harry.', 'O edifício aproxima duas formas de permanência: guardar uma memória e oferecer um lugar para novas leituras.'], links: [{label: 'A história da Widener', href: SOURCES.widener}]},
      {kind: 'paths', title: 'Siga as\nfontes.', label: 'Três maneiras de continuar', paragraphs: ['Explore a narrativa institucional, encontre um livro e acompanhe uma pergunta até a próxima referência.'], paths: [{number: '01', title: 'A história', text: 'Pessoas e marcos na narrativa oficial de Harvard.', href: SOURCES.history}, {number: '02', title: 'A biblioteca', text: 'Serviços, coleções e lugares de leitura.', href: SOURCES.library}, {number: '03', title: 'O catálogo', text: 'Uma busca por autor, título ou assunto no HOLLIS.', href: SOURCES.hollis}]},
      {kind: 'closing', title: 'Toda origem\nabre um futuro.', label: 'Notas de leitura', paragraphs: ['O passado não termina em uma data. Ele volta a aparecer nos nomes, nas bibliotecas e nas perguntas que levamos conosco.', 'Este volume oferece um primeiro encontro. As fontes oficiais permitem seguir adiante com mais contexto.'], note: 'Escolha uma referência. Abra outra página. Continue a conversa.', links: [{label: 'Voltar à história de Harvard', href: SOURCES.history}]},
    ],
  },
  library: {
    roman: 'II', title: 'A biblioteca', theme: 'Livros & descobertas',
    pages: [
      {kind: 'opening', title: 'A biblioteca', subtitle: 'Há sempre\noutra página.', label: 'Lugares para descobrir', text: 'Entre uma sala de leitura e uma busca no catálogo, a curiosidade encontra diferentes ritmos. Este volume acompanha três gestos simples: entrar, procurar e ler.'},
      {kind: 'photo', title: 'Tempo\npara ler.', label: 'Loker Reading Room', photo: 'loker', paragraphs: ['Mesas, estantes e luz natural compõem a Loker Reading Room, na Widener Library.', 'A fotografia convida a desacelerar. Para conhecer espaços, serviços e formas de acesso, consulte as orientações da Harvard Library.'], links: [{label: 'Explorar a Harvard Library', href: SOURCES.library}]},
      {kind: 'date', title: 'Um nome,\numa memória.', label: 'Harry Elkins Widener Memorial Library', number: '1915', numberLabel: 'A abertura da Widener', paragraphs: ['A Widener abriu em 1915. Eleanor Elkins Widener ofereceu o edifício em memória de seu filho Harry.', 'A história oficial da biblioteca apresenta a origem dessa homenagem e o lugar da Widener na vida de Harvard.'], links: [{label: 'Ler a história da biblioteca', href: SOURCES.widener}]},
      {kind: 'paths', title: 'Encontre\num caminho.', label: 'Ferramentas de pesquisa', paths: [{number: '01', title: 'Harvard Library', text: 'Comece pelos serviços e pelas coleções da biblioteca.', href: SOURCES.library}, {number: '02', title: 'HOLLIS', text: 'Busque um título, um autor ou um assunto no catálogo.', href: SOURCES.hollis}, {number: '03', title: 'DASH', text: 'Explore o repositório de pesquisa em acesso aberto de Harvard.', href: SOURCES.dash}]},
      {kind: 'essay', title: 'A leitura\ncomeça antes.', label: 'Uma pequena prática', initial: 'L', paragraphs: ['Antes de abrir um livro, escolha uma pergunta. Ela pode ser ampla: como uma cidade muda? Ou mais específica: quem escreveu sobre este edifício?', 'No catálogo, experimente variar os termos. Ao encontrar uma obra, observe o autor, a edição e as referências. Cada detalhe pode sugerir uma nova direção.'], note: 'Anote três coisas: uma ideia, uma referência e uma pergunta que permaneceu.', links: [{label: 'Começar uma busca no HOLLIS', href: SOURCES.hollis}]},
      {kind: 'closing', title: 'O livro termina.\nA busca continua.', label: 'O próximo encontro', paragraphs: ['Você pode voltar a uma sala, a um autor ou a uma pergunta. A biblioteca oferece um ponto de partida para cada um desses movimentos.', 'Guarde uma referência que queira explorar com mais tempo. Uma boa leitura também pode começar depois.'], links: [{label: 'Abrir a Harvard Library', href: SOURCES.library}, {label: 'Explorar pesquisas no DASH', href: SOURCES.dash}]},
    ],
  },
  architecture: {
    roman: 'III', title: 'A arquitetura', theme: 'Forma & presença',
    pages: [
      {kind: 'opening', title: 'A arquitetura', subtitle: 'Lugares que\nensinam a olhar.', label: 'Um caderno de observação', text: 'Uma fachada pode ser lida devagar. Proporção, matéria, sombra e luz revelam detalhes que o primeiro olhar deixa passar. Aqui, os edifícios são um convite à atenção.'},
      {kind: 'photo', title: 'A escala\nda chegada.', label: 'Memorial Church', photo: 'church', paragraphs: ['O caminho central, os degraus e o pórtico da Memorial Church orientam o olhar para a entrada.', 'Observe a relação entre o edifício e o espaço diante dele. A arquitetura começa antes da porta: começa na forma como nos aproximamos.'], links: [{label: 'A história da Memorial Church', href: SOURCES.church}]},
      {kind: 'essay', title: 'Quatro formas\nde perceber.', label: 'Notas à margem', initial: 'A', paragraphs: ['Proporção. Compare a altura de uma abertura com a extensão da fachada. Repetição. Acompanhe o ritmo de janelas e pilares.', 'Matéria. Observe a textura de tijolos e pedras. Luz. Veja onde as superfícies ficam claras e onde uma sombra desenha profundidade.'], note: 'Experimente olhar o mesmo detalhe de perto e depois à distância. A leitura muda.', links: [{label: 'Localizar os espaços no mapa oficial', href: SOURCES.maps}]},
      {kind: 'photo', title: 'Uma outra\nperspectiva.', label: 'O interior da igreja', photo: 'organ', paragraphs: ['A fotografia apresenta o interior da Memorial Church, com o órgão e as proporções do ambiente.', 'Compare esta imagem com a fachada. Quais formas conduzem seu olhar? Quais detalhes pedem uma segunda leitura?'], links: [{label: 'Conhecer a Memorial Church', href: SOURCES.church}]},
      {kind: 'paths', title: 'Um olhar\nem três escalas.', label: 'Para a próxima observação', paths: [{number: '01', title: 'O detalhe', text: 'Uma moldura, uma junção, uma mudança de textura. Pare em um único elemento.', href: SOURCES.campus}, {number: '02', title: 'O edifício', text: 'Reúna os detalhes e observe o ritmo da fachada.', href: SOURCES.campus}, {number: '03', title: 'O lugar', text: 'Use o mapa oficial para compreender a relação entre os espaços.', href: SOURCES.maps}]},
      {kind: 'closing', title: 'A paisagem\né uma leitura.', label: 'Um registro pessoal', paragraphs: ['Leve uma pergunta para o próximo edifício que encontrar. A forma acompanha o uso? O lugar convida a entrar? O que a luz transforma?', 'Um caderno de arquitetura pode começar com uma fotografia, um desenho ou apenas uma frase bem observada.'], links: [{label: 'Consultar mapas e orientações', href: SOURCES.maps}]},
    ],
  },
  collections: {
    roman: 'IV', title: 'As coleções', theme: 'Objetos & histórias',
    pages: [
      {kind: 'opening', title: 'As coleções', subtitle: 'Um objeto.\nMuitas leituras.', label: 'A memória em suas mãos', text: 'Um livro guarda mais que palavras. Papel, encadernação e marcas de uso oferecem outras maneiras de perguntar. Uma coleção aproxima essas camadas e abre caminhos de pesquisa.'},
      {kind: 'essay', title: 'A página\nimpressa.', label: 'A Bíblia de Gutenberg em Harvard', initial: 'G', paragraphs: ['O exemplar da Bíblia de Gutenberg de Harvard foi impresso em papel e é encadernado em dois volumes.', 'Páginas selecionadas foram digitalizadas. A apresentação da Harvard Library permite conhecer o exemplar e acessar essas imagens.'], note: 'Uma página digital não substitui o objeto. Ela oferece outra forma de começar a observá-lo.', links: [{label: 'Explorar o exemplar de Harvard', href: SOURCES.gutenberg}]},
      {kind: 'photo', title: 'Guardar\ne descobrir.', label: 'Um lugar de leitura', photo: 'loker', paragraphs: ['Uma coleção ganha novas relações quando alguém a consulta. Um nome leva a outro; uma referência aproxima assuntos antes distantes.', 'A imagem da Loker Reading Room acompanha essa ideia de encontro entre o leitor e aquilo que foi preservado.'], links: [{label: 'Explorar a Harvard Library', href: SOURCES.library}]},
      {kind: 'essay', title: 'Olhe além\ndo texto.', label: 'Um exercício de observação', initial: 'P', paragraphs: ['Ao abrir uma página digitalizada, comece pelo conjunto. Observe a distribuição do texto, a largura das margens e a relação entre os elementos.', 'Depois, aproxime um detalhe. Registre o que você vê antes de interpretar. Separar observação e hipótese ajuda a formular perguntas mais cuidadosas.'], note: 'O que é visível? O que você gostaria de confirmar? Qual fonte pode ajudar?', links: [{label: 'Observar as páginas digitalizadas', href: SOURCES.gutenberg}]},
      {kind: 'paths', title: 'Da peça\nà pesquisa.', label: 'Três portas de entrada', paths: [{number: '01', title: 'Um exemplar', text: 'Comece pela apresentação da Bíblia de Gutenberg de Harvard.', href: SOURCES.gutenberg}, {number: '02', title: 'Um catálogo', text: 'Encontre autores, títulos e assuntos relacionados no HOLLIS.', href: SOURCES.hollis}, {number: '03', title: 'Uma biblioteca', text: 'Descubra outros recursos e coleções da Harvard Library.', href: SOURCES.library}]},
      {kind: 'closing', title: 'Preservar\né abrir caminhos.', label: 'A pergunta seguinte', paragraphs: ['Uma coleção pode ser visitada muitas vezes. Em cada encontro, uma nova pergunta reorganiza os mesmos detalhes.', 'Escolha uma página do exemplar de Gutenberg. Observe, anote e siga uma referência. A investigação começa nesse pequeno gesto.'], links: [{label: 'Reabrir a coleção Gutenberg', href: SOURCES.gutenberg}]},
    ],
  },
  campus: {
    roman: 'V', title: 'A vida no campus', theme: 'Encontros & cotidiano',
    pages: [
      {kind: 'opening', title: 'A vida no campus', subtitle: 'Entre um lugar\ne outro, a vida.', label: 'Harvard em movimento', text: 'Há uma dimensão do campus que se revela entre os edifícios: o tempo de chegar, de encontrar alguém e de descobrir outro caminho. Este volume reúne imagens e portas de entrada oficiais.'},
      {kind: 'photo', title: 'Um lugar\npara chegar.', label: 'Memorial Church', photo: 'church', paragraphs: ['Uma fotografia fixa uma vista. A experiência de um lugar reúne muitas outras: a aproximação, os sons, os encontros e o tempo de permanecer.', 'A Memorial Church é um dos lugares que podemos observar nesse encontro com o campus. Sua página oficial apresenta a história do edifício.'], links: [{label: 'Conhecer a Memorial Church', href: SOURCES.church}]},
      {kind: 'film', title: 'Uma nova\nperspectiva.', label: 'O campus em movimento', paragraphs: ['O filme oficial de Harvard College oferece outra forma de ver o campus: espaços, ritmos e cenas que uma imagem parada não consegue reunir.', 'Abra o filme para continuar essa visita visual. Depois, volte ao volume para explorar as próximas referências.'], links: [{label: 'Abrir a página oficial do campus', href: SOURCES.campus}]},
      {kind: 'photo', title: 'A memória\nnos detalhes.', label: 'A inscrição memorial', photo: 'inscription', paragraphs: ['Um detalhe pode mudar a leitura de um lugar. A fotografia aproxima a inscrição da Memorial Church.', 'Olhe primeiro para o que está registrado na imagem. Depois, consulte a fonte oficial para reunir a observação e seu contexto.'], links: [{label: 'Ler a história da Memorial Church', href: SOURCES.church}]},
      {kind: 'paths', title: 'Prepare\nseu encontro.', label: 'Referências oficiais', paths: [{number: '01', title: 'Ver o campus', text: 'Comece pela apresentação de Harvard College.', href: SOURCES.campus}, {number: '02', title: 'Localizar', text: 'Consulte mapas e orientações para se situar.', href: SOURCES.maps}, {number: '03', title: 'Descobrir', text: 'Encontre temas e histórias na série Harvard In Focus.', href: SOURCES.focus}]},
      {kind: 'closing', title: 'Leve\numa curiosidade.', label: 'Depois da última página', paragraphs: ['Uma boa visita começa com uma abertura: perceber algo que você ainda não conhece.', 'Escolha um lugar para observar com mais calma, uma história para ler ou uma pergunta para levar adiante. O campus ganha sentido nesses encontros.'], links: [{label: 'Continuar no campus oficial', href: SOURCES.campus}, {label: 'Consultar mapas e direções', href: SOURCES.maps}]},
    ],
  },
  research: {
    roman: 'VI', title: 'A pesquisa', theme: 'Perguntas & possibilidades',
    pages: [
      {kind: 'opening', title: 'A pesquisa', subtitle: 'O mundo muda\ncom uma pergunta.', label: 'A curiosidade em prática', text: 'Pesquisar é fazer uma pergunta e aceitar que a resposta pode transformá-la. Este volume apresenta um pequeno percurso de leitura, da descoberta de um tema à consulta de suas fontes.'},
      {kind: 'essay', title: 'Comece\npelo interesse.', label: 'Harvard In Focus', initial: '?', paragraphs: ['A série Harvard In Focus reúne conteúdos em torno de temas. É uma porta de entrada para encontrar histórias, perspectivas e assuntos para explorar.', 'Escolha um tema que desperte sua curiosidade. Antes de seguir, escreva em uma frase o que você gostaria de compreender melhor.'], note: 'Uma pergunta útil não precisa ser perfeita. Precisa oferecer um próximo passo.', links: [{label: 'Explorar Harvard In Focus', href: SOURCES.focus}]},
      {kind: 'photo', title: 'Leia, relacione,\nvolte a perguntar.', label: 'O trabalho da atenção', photo: 'loker', paragraphs: ['Uma ideia ganha contexto quando encontra outras referências. Observe de onde vem uma afirmação e quais perguntas ela deixa em aberto.', 'O catálogo HOLLIS pode ajudar a localizar obras relacionadas ao tema que você escolheu.'], links: [{label: 'Pesquisar no catálogo HOLLIS', href: SOURCES.hollis}]},
      {kind: 'essay', title: 'Uma porta\npara a leitura.', label: 'DASH · acesso aberto', initial: 'D', paragraphs: ['DASH é o repositório de pesquisa em acesso aberto de Harvard. Ele oferece outro caminho para encontrar trabalhos e acompanhar suas referências.', 'Ao ler, procure o problema investigado, a forma como foi abordado e os limites apresentados. A conclusão faz mais sentido ao lado dessas escolhas.'], note: 'Registre a fonte junto com a ideia. Mais tarde, você poderá reencontrar o contexto.', links: [{label: 'Explorar o repositório DASH', href: SOURCES.dash}]},
      {kind: 'paths', title: 'Três gestos\npara investigar.', label: 'Uma prática de leitura', paths: [{number: '01', title: 'Descobrir', text: 'Encontre um tema e formule sua primeira pergunta.', href: SOURCES.focus}, {number: '02', title: 'Relacionar', text: 'Busque obras, autores e assuntos no catálogo.', href: SOURCES.hollis}, {number: '03', title: 'Aprofundar', text: 'Leia trabalhos no DASH e acompanhe suas referências.', href: SOURCES.dash}]},
      {kind: 'closing', title: 'A próxima\npergunta é sua.', label: 'Um caderno em aberto', paragraphs: ['Depois de uma leitura, anote o que mudou na sua compreensão. Quais ideias ficaram mais claras? O que ainda precisa de uma fonte?', 'Pesquisar também é aprender a formular melhor aquilo que não sabemos. A próxima pergunta pode nascer justamente aí.'], links: [{label: 'Descobrir um tema em Harvard In Focus', href: SOURCES.focus}, {label: 'Continuar a leitura no DASH', href: SOURCES.dash}]},
    ],
  },
};

function Arrow({back = false, diagonal = false}) {
  return <svg className={back ? 'avr-arrow-back' : undefined} viewBox="0 0 24 24" aria-hidden="true" fill="none"><path d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h15m-6-6 6 6-6 6'} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function SourceLink({href, children}) {
  return <a className="avr-source-link" href={href} target="_blank" rel="noopener noreferrer">{children}<Arrow diagonal/></a>;
}
function Lines({text}) { return text.split('\n').map((line, index) => <React.Fragment key={line}>{index > 0 && <br/>}{line}</React.Fragment>); }
function VolumeMark({number}) {
  return <div className="avr-volume-mark" aria-hidden="true"><span>H</span><i/><small>VERITAS</small><b>{number}</b></div>;
}
function PageContent({data, edition, number, onOpenMedia}) {
  if (data.kind === 'opening') return <div className="avr-opening"><span className="avr-eyebrow">{data.label}</span><h2>{data.title}</h2><p className="avr-opening-subtitle"><Lines text={data.subtitle}/></p><div className="avr-opening-rule"/><p className="avr-opening-intro">{data.text}</p><VolumeMark number={edition.roman}/><p className="avr-edition">Um atlas de ideias · Cambridge, Massachusetts</p></div>;
  return <>
    <div className="avr-chapter-heading"><span className="avr-eyebrow">{data.label}</span><h3><Lines text={data.title}/></h3></div>
    {data.kind === 'date' && <div className="avr-date">{data.number}<span>{data.numberLabel}</span></div>}
    {data.kind === 'photo' && <figure className="avr-photo"><img src={PHOTOS[data.photo].src} alt={PHOTOS[data.photo].alt} loading="eager" draggable="false"/><figcaption><span>{PHOTOS[data.photo].caption}</span>{PHOTOS[data.photo].href ? <a href={PHOTOS[data.photo].href} target="_blank" rel="noopener noreferrer">{PHOTOS[data.photo].credit}</a> : <span>{PHOTOS[data.photo].credit}</span>}</figcaption></figure>}
    {data.kind === 'essay' && <span className="avr-initial" aria-hidden="true">{data.initial}</span>}
    {data.kind === 'film' && <div className="avr-film"><img src={PHOTOS.widener.src} alt="A fachada da Widener Library, apresentada como fotografia do campus." draggable="false"/><button type="button" onClick={() => onOpenMedia?.('film')} disabled={!onOpenMedia} aria-label="Assistir ao filme oficial de Harvard College"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="m12 8 13 8-13 8V8Z" fill="currentColor"/></svg><span>Assistir ao filme oficial</span><small>Harvard College</small></button><span className="avr-film-credit">Fotografia: Ajay Suresh</span></div>}
    <div className="avr-prose">{data.paragraphs?.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
    {data.paths && <div className="avr-paths">{data.paths.map(path => <a key={path.number} href={path.href} target="_blank" rel="noopener noreferrer"><span className="avr-path-number">{path.number}</span><div><h4>{path.title}</h4><p>{path.text}</p></div><Arrow diagonal/></a>)}</div>}
    {data.note && <aside className="avr-note"><span>À margem</span><p>{data.note}</p></aside>}
    {data.kind === 'closing' && <div className="avr-colophon"><span>Fim do volume {edition.roman}</span><p>Edição digital independente, sem vínculo institucional com Harvard. Textos editoriais com referências oficiais; fotografias identificadas nas páginas.</p><svg className="avr-colophon-flower" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v18M3 12h18M5.64 5.64l12.72 12.72M5.64 18.36 18.36 5.64" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg></div>}
    {data.links && <div className="avr-source-list">{data.links.map(link => <SourceLink key={link.href} href={link.href}>{link.label}</SourceLink>)}</div>}
  </>;
}
function Page({number, edition, side = 'single', decorative = false, onOpenMedia}) {
  const data = edition.pages[number];
  return <article className={`avr-page avr-page-${side} avr-page-${data.kind}`} aria-label={`Página ${number + 1} de 6: ${data.title.replaceAll('\n', ' ')}`} aria-hidden={decorative || undefined} inert={decorative || undefined}>
    <header className="avr-running-head"><span>Harvard</span><span>{edition.theme}</span></header>
    <div className="avr-page-body" data-lenis-prevent data-lenis-prevent-wheel tabIndex={decorative ? -1 : 0} role="region" aria-label={`Conteúdo da página ${number + 1}`}><PageContent data={data} edition={edition} number={number} onOpenMedia={onOpenMedia}/></div>
    <footer className="avr-page-footer"><span>{edition.title}</span><span>{String(number + 1).padStart(2, '0')}</span></footer>
  </article>;
}

/** Place inside the parent's native dialog. The parent owns its close button. */
export default function AlbumVolumeReader({volume, onClose, onOpenMedia, reduced: reducedByApp = false}) {
  const edition = VOLUMES[volume?.id] || VOLUMES.origins;
  const root = useRef(null), book = useRef(null), wheel = useRef({amount: 0, at: 0, sign: 0}), cooldown = useRef(0), turnLock = useRef(false), touch = useRef(null);
  const [page, setPage] = useState(0), [turn, setTurn] = useState(null);
  const [single, setSingle] = useState(() => typeof window !== 'undefined' && window.innerWidth < 800);
  const [prefersReduced, setPrefersReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const reduced = Boolean(reducedByApp || prefersReduced);
  const headingId = useId(), statusId = useId();
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setPrefersReduced(media.matches);
    media.addEventListener('change', updateMotion);
    const observer = new ResizeObserver(entries => setSingle(entries[0].contentRect.width < 800));
    observer.observe(root.current);
    const focus = requestAnimationFrame(() => root.current?.focus({preventScroll: true}));
    return () => {media.removeEventListener('change', updateMotion); observer.disconnect(); cancelAnimationFrame(focus);};
  }, []);
  useEffect(() => {setPage(0); setTurn(null); turnLock.current = false; wheel.current.amount = 0;}, [volume?.id]);
  useEffect(() => {setPage(current => single ? current : Math.floor(current / 2) * 2); setTurn(null); turnLock.current = false;}, [single]);
  const finishTurn = useCallback(() => {
    if (!turn) return;
    setPage(turn.to);
    setTurn(null);
    turnLock.current = false;
  }, [turn]);
  useEffect(() => {
    if (!turn) return;
    if (reduced) {finishTurn(); return;}
    const timer = setTimeout(finishTurn, 880);
    return () => clearTimeout(timer);
  }, [turn, reduced, finishTurn]);
  const navigate = useCallback(requested => {
    if (turnLock.current) return;
    const to = single ? Math.max(0, Math.min(5, requested)) : Math.max(0, Math.min(4, Math.floor(requested / 2) * 2));
    if (to === page) return;
    cooldown.current = performance.now() + (reduced ? 480 : 1000);
    wheel.current = {amount: 0, at: 0, sign: 0};
    if (reduced) setPage(to);
    else {turnLock.current = true; setTurn({from: page, to, direction: to > page ? 'next' : 'previous'});}
  }, [page, single, reduced]);
  useEffect(() => {
    const element = root.current;
    const onWheel = event => {
      if (event.ctrlKey) return;
      event.stopPropagation();
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.3 ? event.deltaX : event.deltaY;
      if (!delta) return;
      const body = event.target instanceof Element ? event.target.closest('.avr-page-body') : null;
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.3;
      if (!horizontal && body && body.scrollHeight > body.clientHeight + 3) {
        const canScroll = delta > 0 ? body.scrollTop + body.clientHeight < body.scrollHeight - 3 : body.scrollTop > 3;
        if (canScroll) {wheel.current.amount = 0; return;}
      }
      event.preventDefault();
      const now = performance.now();
      if (turnLock.current || now < cooldown.current) {wheel.current.amount = 0; return;}
      const sign = Math.sign(delta), scaled = delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 500 : 1);
      // A mouse notch must reach the threshold on its own. Small trackpad
      // deltas accumulate, including deliberate, slower wheel movements.
      if (now - wheel.current.at > 750 || sign !== wheel.current.sign) wheel.current.amount = 0;
      const amount = event.deltaMode ? Math.max(100, Math.abs(scaled)) : Math.abs(scaled);
      wheel.current.amount += Math.min(240, amount);
      wheel.current.at = now; wheel.current.sign = sign;
      if (wheel.current.amount >= 100) {wheel.current.amount = 0; navigate(page + sign * (single ? 1 : 2));}
    };
    element.addEventListener('wheel', onWheel, {passive: false});
    return () => element.removeEventListener('wheel', onWheel);
  }, [navigate, page, single]);
  const step = single ? 1 : 2;
  const visible = single ? [turn ? turn.to : page] : turn ? turn.direction === 'next' ? [turn.from, turn.to + 1] : [turn.to, turn.from + 1] : [page, page + 1];
  const front = turn && (single ? turn.from : turn.direction === 'next' ? turn.from + 1 : turn.from);
  const back = turn && (single ? turn.to : turn.direction === 'next' ? turn.to : turn.to + 1);
  const announcement = `${edition.title}. ${single ? `Página ${page + 1} de 6` : `Páginas ${page + 1} e ${page + 2} de 6`}.`;
  return <section ref={root} lang="pt-BR" className={`album-volume-reader ${single ? 'avr-single' : 'avr-spread'} ${reduced ? 'avr-reduced' : ''}`} tabIndex={-1} aria-labelledby={headingId} aria-describedby={statusId} data-volume={volume?.id || 'origins'} data-page-index={page} onKeyDown={event => {
    if (event.altKey || event.ctrlKey || event.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    if (['ArrowRight', 'PageDown', 'ArrowLeft', 'PageUp', 'Home', 'End'].includes(event.key)) {event.preventDefault(); navigate(event.key === 'Home' ? 0 : event.key === 'End' ? 5 : page + (['ArrowRight', 'PageDown'].includes(event.key) ? step : -step));}
    if (event.key === 'Escape' && onClose) {event.preventDefault(); event.stopPropagation(); onClose();}
  }}>
    <header className="avr-toolbar"><div className="avr-toolbar-brand"><span className="avr-brand-monogram" aria-hidden="true">H</span><span>Harvard<span>Um atlas de ideias</span></span></div><div className="avr-toolbar-title"><span>Volume {edition.roman}</span><h1 id={headingId}>{edition.title}</h1></div><span className="avr-toolbar-edition">Edição de leitura<span>Cambridge, Massachusetts</span></span></header>
    <div className="avr-stage"><div ref={book} className="avr-book" onTouchStart={event => {if (event.touches.length === 1) touch.current = {x: event.touches[0].clientX, y: event.touches[0].clientY};}} onTouchEnd={event => {if (!touch.current || !event.changedTouches.length) return; const dx = event.changedTouches[0].clientX - touch.current.x, dy = event.changedTouches[0].clientY - touch.current.y; touch.current = null; if (Math.abs(dx) > 75 && Math.abs(dx) > Math.abs(dy) * 1.6) navigate(page + (dx < 0 ? step : -step));}}>
      <div className="avr-book-cover" aria-hidden="true"/><div className="avr-page-edges" aria-hidden="true"/>
      <div className="avr-page-pair">{visible.map((number, index) => <Page key={`${volume?.id}-${index}-${number}`} number={number} edition={edition} side={single ? 'single' : index === 0 ? 'left' : 'right'} onOpenMedia={onOpenMedia}/>)}</div>
      {!single && <span className="avr-gutter" aria-hidden="true"/>}
      {turn && <div className={`avr-leaf avr-leaf-${turn.direction}`} aria-hidden="true" onAnimationEnd={event => {if (event.target === event.currentTarget) finishTurn();}}><div className="avr-leaf-face avr-leaf-front"><Page number={front} edition={edition} decorative onOpenMedia={onOpenMedia}/></div><div className="avr-leaf-face avr-leaf-back"><Page number={back} edition={edition} decorative onOpenMedia={onOpenMedia}/></div></div>}
    </div></div>
    <footer className="avr-controls"><p className="avr-control-hint"><span aria-hidden="true">↔</span> Role ou use as setas<span className="avr-wheel-hint"> · Role ao final da página para continuar</span></p><nav className="avr-pagination" aria-label="Navegação do volume"><button type="button" onClick={() => navigate(page - step)} disabled={page === 0 || Boolean(turn)} aria-label={single ? 'Página anterior' : 'Páginas anteriores'}><Arrow back/><span>Anterior</span></button><span className="avr-counter" aria-hidden="true"><b>{String(page + 1).padStart(2, '0')}{!single && ` — ${String(page + 2).padStart(2, '0')}`}</b><i/>06</span><button type="button" onClick={() => navigate(page + step)} disabled={page >= (single ? 5 : 4) || Boolean(turn)} aria-label={single ? 'Próxima página' : 'Próximas páginas'}><span>Próxima</span><Arrow/></button></nav><span className="avr-controls-theme">{edition.theme}</span></footer>
    <p id={statusId} className="avr-sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
  </section>;
}
