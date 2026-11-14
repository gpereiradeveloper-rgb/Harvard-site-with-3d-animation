# CHECKPOINT ATUAL — 13 de novembro de 2026

Este registro substitui as instruções de pausa e os estados antigos preservados abaixo. O usuário retomou o projeto e autorizou revisão, correções, GitHub e publicação. A versão revisada está salva localmente; a publicação ainda depende de restabelecer o acesso descrito adiante.

## Estado da revisão

- Projeto: `/Users/guilhermepereiragalvao/Documents/Codex/2026-11-04/co/work/harvard-veritas`; prévia `http://127.0.0.1:5174/`.
- Entrada ativa: `src/main.jsx` → `HarvardJourneyApp.jsx`. Preservados capa, chegada, mundo de arquivo e álbum/leitor. Navegação conserva o progresso após resize. Cenas pesadas carregam e montam perto de sua etapa; padrão Automática em nova sessão, com escolha manual de qualidade preservada.
- Scanner de recebimento com botão “Ver o scanner 3D”, foco de câmera, retorno ao ateliê e Escape. Fluxo compartilhado conserva oito caixas e dois paletes; as cinco caixas recebidas passam pelo mesmo túnel e cada uma é lida uma vez antes de completar o estoque superior.
- Empilhadeira, paleteira, trabalhadores, robô e carrinho seguem a mesma operação finita. Varredura logística a cada 10 ms verificou corpo da empilhadeira, rack, esteira, plataforma e cruzamentos. Cinco funcionários em pé: separação mínima aproximada de 0,422 m; motorista/carregador: aproximadamente 0,556 m.
- Modelos esqueléticos e mochilas escaneadas preservados. Foi identificado e corrigido um erro da otimização de culling que reduzia os corpos ao normalizar pelo envelope expandido: `ArchiveModelCulling.js` amplia somente a esfera de culling, mantendo a caixa física e as proporções originais. Teste dos GLBs reais confirma 1,72 m em quatro escalas por personagem. Materiais imutáveis são compartilhados sem descarte prematuro.
- `npm test`: 12 testes passaram. `npm run build`: passou. Detalhes e limites em `VALIDATION.md`. Não executar novamente sem motivo ou novas alterações.

## Entrega e publicação

- Repositório indicado: https://github.com/gpereiradeveloper-rgb/Harvard-site-with-3d-animation
- Envio/publicação pendentes: acesso GitHub retornou 403; projeto legado Sites retornou 404. Não apresentar a revisão como publicada nem fornecer o link antigo como prova desta entrega.
- Pacote de source: `harvard-veritas-revisado.zip`, no diretório de outputs do chat de 13/11, acompanhado de `ENTREGA.md`. Inclui código, testes, documentação e ativos com seus créditos/licenças; exclui configuração local, Git, dependências instaladas, build e arquivos temporários.
- Não ler/imprimir/copiar chaves de `.env.local`. Não publicar a configuração da demonstração de mapa. Não contratar serviços nem iniciar gerações pagas.

## Limites para a próxima retomada

As tarefas e apoios são cinemáticos e auditados por envelopes; não afirmar física geral, zero colisões triangulares, ultrarrealismo equivalente às referências ou técnica proprietária descoberta. Revisão visual e desempenho dependem do equipamento e da qualidade escolhida. Concluir o acesso GitHub/publicação e conferir a versão efetivamente publicada antes de declarar entrega online.

---
# HISTÓRICO PRESERVADO — substituído pelo checkpoint de 13/11 acima

# PAUSA SOLICITADA — 5 de novembro de 2026 — CENA VIVA

O usuário pediu **SALVAR TUDO E PARAR** para continuar depois. Não retomar alterações até nova solicitação. Não perder esta direção: agora ele aprovou a cena e disse “já está legal”, pedindo mais elementos 3D caminhando/atuando no MESMO cenário, no estilo do Sendoso, além de materiais e acabamento. Não voltar a foto com zoom nem ao corredor inventado antigo.

## Estado final salvo

- Entrada ativa: `src/main.jsx` → `HarvardJourneyApp.jsx` e `HarvardJourney.css`.
- Um único track (1000svh desktop / 940svh mobile), GSAP + Lenis. Capa aprovada preservada; mapa Google real local; mundo 3D autoral vivo; álbum grande com seis volumes interativos.
- `GoogleCampusAtlas.jsx`: aproximação corrigida para Memorial Church em torno de lat42.3749,lng-71.1161 (a longitude antiga estava ~60m a oeste e focava o prédio ao lado). Heading termina0°, sem grande órbita. **Correção geográfica ainda requer confirmação visual do alvo final.**
- `HarvardArchiveWorld.jsx`: biblioteca, arquivo e pátio no mesmo palco; montagem por scroll; carrinho, páginas, livro articulado, gaveta, globo, luminárias, dois leitores e DOIS acadêmicos caminhando; prensa com alavanca/pistão/alimentação de folha. PBR fotográfico CC0 restaurado em `public/assets/atelier-materials/` (cor4K madeira, normais/roughness2K e reboco2K). Partículas e atores obedecem pausa/reduced; câmera/scroll permanecem ativos.
- Canvas expõe `data-world-progress`, `data-world-time`, cart-x/z, actor-count, walking-count, actor1/2-x/z, press-stroke, paused para QA.
- `HarvardAlbum3D.jsx/.css`: fólio físico navy/papel envelhecido ocupando quase toda a tela; seis mini livros chegam em sequência, capas abrem, bookmarks e notas se movem. Seleção levanta/abre antes de entregar `onVolume(id)`. Data attrs de progress/opening/assembled/ambient-time/selection/layout.
- `AlbumVolumeReader.jsx/.css`: seis volumes com fotos reais, três spreads/seis páginas, navegação por teclado/scroll. Pai agora tem botão VISÍVEL “Voltar à cena”. Pai também aplica inert nos overlays invisíveis; header é oculto no álbum e índice móvel foi reposicionado na dobra.
- `QuietScore.js`: música instrumental original opcional de cordas/flauta; nenhum áudio de trânsito ativo.
- `ChurchDepthScene.jsx` e fotografias front/organ/inscription continuam SALVOS, mas projeção fotográfica foi retirada do fluxo ativo: usuário rejeitou sensação de zoom. Fotos são usadas no acervo/álbum. Arquivos antigos continuam preservados como histórico.

## Verificação HONESTA e próxima retomada

Build passou antes dos últimos refinamentos, e novo build de checkpoint será executado para salvar. Última inspeção real: viewport506×827, Cinema1265×2067; cena inteira visível, atores/carrinho/folhas; álbum aberto com6 livros reais renderizados. Não declarar nível final igualSendoso, 8Knativo, DLSS ou caminhada fotográfica resolvida.

**A próxima tarefa deve ser QA estável antes de nova expansão.** As recargas HMR durante as alterações interromperam testes de navegação; ao clicar navegação e depois observar, posição às vezes voltou ao mundo. Pode ser interação simultânea do usuário/HMR; não afirmar tudo concluído. Prévia foi recarregada ao final para eliminar estado HMR, mas teste completo foi interrompido pelo pedido de pausa.

Pendências concretas: conferir ida/volta de scroll e destinos dos botões numa sessão sem edição; confirmar enquadramento corretoMemorialChurch; testar clicando livro na geometria3D e retorno do leitor sem deslocar; testar roda de mouse noReader (auditoria apontou cap100/limiar110/reset220ms, possivelmente não corrigido); confirmar override manual de reduced noReader (pai passa prop, componente pode ainda usar sóOS); rever legenda/índice do álbum em desktop e retrato; ouvir música e testarpausa; verificar shadersPBR reais sem erro após reload. Erros React de unmount foram vistos em logs DURANTEHMR, sem quebra visual; checar novamente após sessão limpa.

## Acesso, limites e salva

Google Demo Key já configurada SOMENTE em `.env.local` (gitignored), DEV-only. Usuário autorizou demonstração GRATUITA e termos. NÃO imprimir/repetir chave, não incluir em ZIP, Git ou artefato, não ativar billing/cartão. Demonstração não pode ir para produção. Publicação anterior continuaintacta; esta versão é progresso local, não publicada.

Workspace: `/Users/guilhermepereiragalvao/Documents/Codex/2026-11-04/co/work/harvard-veritas`. Prévia atual `http://127.0.0.1:5174/`. Backup completo sem segredos será salvo em `../../outputs/` com nome Harvard-progresso-cena-viva-2026-11-05*.zip e reciboJSON. Preservar `.env.local` no workspace para retomada.

Fontes e referências: `docs/reference-review-memorial.md`, `docs/atlas-reference-notes.md`, créditos ativos `public/assets/CREDITS-atlas.md`, `CREDITS-memorial-church.md` e `atelier-materials/CREDITS.md`. Sendoso original revisado em https://dribbble.com/shots/27323649-3D-Animation-For-Sendoso-com (filme4000×3000/13,1667s); não foram copiados modelos ou mídias. Não afirmar milhares de modelos analisados.

---
# Histórico preservado (supersedido pelo checkpoint acima)

# CHECKPOINT ATUAL — 5 de novembro de 2026: mundo 3D vivo + álbum

Este bloco substitui a direção dos registros históricos abaixo. Preserve o histórico; não reinicie pelas soluções que o usuário já rejeitou.

## Intenção atual, aprovada pelo usuário

- Preservar a capa/hero aprovada.
- O objetivo agora é um mundo de Harvard em 3D, vivo e contínuo: uma cena inteira com montagem pelo scroll, elementos em atividade ao mesmo tempo, bons materiais, luz e acabamento. A referência Sendoso diz respeito à cena e à ação, não a copiar caminhões, esteiras ou ativos.
- A chegada geográfica é em direção à **Memorial Church**. Widener e Johnston Gate foram direções anteriores; não usá-las como destino atual do mapa.
- A direção aceita é mapa real → mundo de arquivo autoral → álbum interativo. O usuário rejeitou zooms sucessivos de fotografias e um livro pequeno flutuando sozinho sobre fundo verde.
- O álbum deve ocupar quase toda a tela e conter seis mini livros verdadeiramente interativos: `origins`, `library`, `architecture`, `collections`, `campus`, `research`.
- Cada volume abre conteúdo legível, fotografias, fontes e páginas. Não apresentar a nova cena autoral como um interior original digitalizado de Harvard.
- Nenhuma nova geração paga, assinatura, cobrança ou teste. O usuário recusou novas gerações pagas. Não perguntar novamente se ele tem filmagem própria ou SDK Matterport: ele já respondeu que não.

## Estado de integração no momento deste checkpoint

- `src/main.jsx` aponta para `HarvardJourneyApp.jsx`, que possui a timeline GSAP/Lenis, os controles, música e modais.
- O agente principal está trocando a etapa de `ChurchDepthScene.jsx` por `HarvardArchiveWorld.jsx`, desenvolvido pelo agente de campus. A nova cena precisa entrar como ambiente completo com construção e ações simultâneas. Conferir o import e o fluxo final antes de testar; não presumir que a substituição já foi compilada e revisada.
- A projeção fotográfica de profundidade foi aposentada da direção ativa. Não reconectar `ChurchDepthScene` ou a busca do YouTube como solução da jornada.
- `GoogleCampusAtlas.jsx` oferece o mapa 3D real na demonstração local. Não é trânsito ao vivo. O destino atual é Memorial Church.
- `HarvardAlbum3D.jsx` e `.css`: fólio físico em linho/navy e papel, quase toda a largura da viewport, seis mini livros com fotografias locais. A capa abre entre p=0 e ~.22; os livros chegam e se acomodam em sequência entre p~.10 e .32. A montagem reverte com o scroll.
- Ambiente do álbum: capas em ritmos diferentes, pequenos marcadores de tecido, duas folhas curvas e micro partículas. Seleção interrompe a ambientação e prioriza elevação/abertura, antes de `onVolume(id)`.
- A pausa congela somente o relógio ambiente. Scroll e cliques continuam atualizando o álbum. Canvas ativo permanece renderizando para responder ao objeto de movimento estável.
- O falso fallback do Canvas foi corrigido: R3F monta o `fallback` como filhos DOM do canvas mesmo com WebGL disponível. Não usar ali um componente cujo efeito marque falha. O fallback atual é texto passivo oculto da árvore acessível; falha real passa pelo boundary.
- `AlbumVolumeReader.jsx` e `.css`: três spreads / seis páginas por volume, duas páginas no desktop e uma no celular, navegação reversível, texto/fotografias/fontes oficiais. Pai controla o diálogo nativo e seu fechamento.
- Fontes do álbum são impressas em texturas de superfície; não há palavras 3D flutuando como títulos. Capa externa até 3072 × 4096; mini capas 768 × 1280. Não chamar o site de 8K.
- Música atual: `QuietScore.js`, composição procedural original de cordas dedilhadas/flauta via Web Audio. O antigo áudio exterior de Harvard Square não é a trilha desta direção.

## Interface dos módulos entregues

```jsx
<HarvardAlbum3D
  motion={albumMotion} // objeto estável, progress local 0..1
  quality={quality}
  reduced={reduced}
  paused={paused}
  active={active}
  onVolume={id => openReader(id)}
/>
<AlbumVolumeReader
  volume={volumeObject}
  onClose={closeReader}
  onOpenMedia={openOfficialFilm}
/>
```

`ALBUM_VOLUMES` também é exportado por `HarvardAlbum3D.jsx`. Campos: id, title, kicker, description, image, source, sourceName. O leitor escolhe o conteúdo pelo id.

Atributos DOM de QA do canvas do álbum: `data-album-progress`, `data-album-opening`, `data-album-selection`, `data-album-layout`, `data-album-assembled` (0..6), `data-album-ambient-time`. O último deve parar quando a pausa ambiente está ligada, enquanto progress/opening seguem comandos.

## Verificação e pendências honestas

- Os quatro arquivos de álbum/leitor passaram na verificação de sintaxe com esbuild, sem avisos. A raiz informou builds anteriores às últimas mudanças; o novo ambiente e a integração final precisam de build e revisão atualizados.
- O agente principal é responsável pela QA visual no navegador. Não inventar screenshots, FPS, viewports, desempenho ou aprovação estética.
- Pontos encontrados em auditoria de fonte, a confirmar/corrigir na raiz: botão de fechar o leitor visível no celular; `inert` em textos/botões de etapas invisíveis; roda de mouse lenta (limite por evento de 100 versus limiar 110 com reset 220ms); estado de movimento reduzido do aplicativo chegando ao leitor, além da preferência do sistema.
- Não atribuir à versão atual as provas do antigo player de vídeo ou do corredor anterior. Essa busca de filmagem foi substituída pela nova direção autorizada.
- Ver `VALIDATION.md` para a lista da revisão final; atualizá-la somente com evidência real.

## Ativos e direitos

- Fotografias locais novas da Memorial Church: fachada 5141 × 3420, órgão 5141 × 3426 (Ingfbruno, CC BY-SA 3.0); inscrição 4032 × 3024 (Greger Ravik, CC BY 2.0).
- Fontes e licenças: `public/assets/CREDITS-memorial-church.md`, novo `CREDITS-atlas.md`, e créditos históricos `CREDITS-v4.md`. A licença Optimer foi preservada nos créditos.
- Memorial Church oficial: https://memorialchurch.harvard.edu/history-0 . As fotografias são registros reais; o ambiente e a encadernação são criações autorais.
- Capa aprovada: `harvard-cinematic.mp4` / pôster, 2560 × 1440, 24fps, ~5.167s, interpretação gerada anteriormente. Não alterar sua composição nesta rodada.
- Não copiar ativos proprietários de Sendoso, Igloo, MotionSites ou templates.

## Segredos, save e publicação

- Configuração Google de demonstração é **somente local em desenvolvimento**. Não ler ou imprimir valores da chave. Não inserir configuração local, `.env*`, `.dev.vars*`, credenciais ou tokens em Git, ZIPs, screenshots de terminal, documentação ou arquivos publicados.
- Para cópias de progresso, incluir código/assets/docs e excluir explicitamente arquivos locais de configuração, credenciais, dependências e metadados Git. Este checkpoint não cria um ZIP.
- O usuário pediu que o progresso fique salvo; manter este checkpoint e gerar a próxima cópia segura ao concluir as alterações. Não apagar as cópias anteriores.
- Prévia local: http://127.0.0.1:5174/ . Reutilizar o servidor existente.
- Site existente: `appgprj_6aeb7e535db08191846d8c78e5dbd7dc`, público. URL histórica: https://harvard-veritas-immersive.greenhoop2.chatgpt.site/ . Não afirmar nova publicação sem resultado confirmado da ferramenta.
- Raiz controla fonte e publicação. O helper Sites controla commit/push/package; credenciais somente em memória/stdin. Preservar audiência pública.
- Backups históricos conhecidos: `outputs/Harvard-progresso-2026-11-05_11-27.zip`, `outputs/Harvard-progresso-real-2026-11-05_12-49.zip`. São versões anteriores, não garantia de snapshot desta direção.

---
# Histórico preservado — direções anteriores, substituídas

# CURRENT CHECKPOINT — 5 November 2026: short entry, walk still NOT solved

This section supersedes the historical notes below.

## Exact user intent
Preserve approved cover. One short book/portal transition, then already inside an ORIGINAL REAL Harvard library/office. Scroll must physically move forward/back through a short continuous interior route. No long introduction, no campus-wide tour, no invented CGI hallway, no static-photo zoom pretending to walk, no final outdoor360. End in an interactive book. No more paid generation; user has no own film or Matterport SDK access. Do not ask the same access/material question again or promise that shaders/8K can solve missing source footage.

## Honest current status
Entrance shortened: source reveal after ~0.60 viewport desktop /0.64 mobile. Begin button now goes through that transition to chapter2 in one action. Hero asset/text unchanged. Final book and media tabs retained. HOWEVER original goal is NOT achieved: selected HLS shot primarily tilts; native paused YouTube play button/captions appear. User correctly says it still feels like video. Do not call this a finished walk, Igloo-level result or8K.

## Current code and verification
src/main.jsx -> RealHarvardApp.jsx /RealHarvardApp.css. ScrollFilm.jsx official YouTubeAPI, source CXkjHLBr_y0 (Tour the Harvard Law School Library), PRIMARY https://hls.harvard.edu/amicus-libris/langdell-reading-room-closed-until-future-notice/ . Interval now262.4–265.3s avoids the editorial dissolve at~261.6s in the earlier260–264sample. Source native1920x1080 confirmed in source player, quality transmission remains provider-managed.
ScrollSeek.mjs implements latest-destination, time-acknowledged seeks; fixes coarse PAUSED-event-only throttling. Player stays mounted for the whole journey, avoiding remount on reverse. Global visible fallback outside hidden layer supports autoplay gesture/retry/source link/skip; 20s load watchdog. Book Boundary +20s fallback avoids indefinite gate. No external-source video downloaded/rehosted.
13 tests passed (9fixedDPR/fade +4seek-driver), production build passed. Local QA actual395x827CSS, canvas987x2067 in Cinema, no horizontal overflow. Data observed:60%source263.574,state2;68%264.130,state2;reverse58%263.482,state2;final100%265.300,state2 with sameiframewidget2. Actual rendered source still has pausedplayerUI and a camera tilt: these time checks DO NOT prove walk/quality acceptance. Endbook screenshot saved outputs/harvard-livro-final-2026-11-05.png. Acervo tab showed valid officiallinks. Some CUA locator clicks caused scroll position drift; do not falsely certify all interactions/desktop. Need manual UX confirmation if further source work succeeds.

## Sources and blocker
Focused primary-source searches found no directly published MP4/WebM of a continuous original Harvard interior walk. Public Widener Matterport requires legitimate SDK/domain access for custom camera control. Countway540p screenrecording was rejected. HLS1080p sample remains prototype. Additional official YouTube candidates in docs/progress-2026-11-05/LATEST.md, but native player alone cannot deliver the desired seamless immersive look. Existing official College13.85s MP4 was inspected via native browser at5.13s,8.7s,end13.85s: exterior campus/tree/courtyard/dog, no suitable continuous interior. SwiftAVFoundation frame extraction failed (-11821/-12911), no installs.
Do not keep looping on shader/lighting edits to fake a realHarvardwalk. Need a usable continuous original interior source (native footage/frame sequence or licensed camera-control API). Current media cannot be converted into a continuous spatial walk merely by connecting seekTo.

## Save and hosting
Current local dev http://127.0.0.1:5174/ is already running. Existing public Site appgprj_6aeb7e535db08191846d8c78e5dbd7dc live https://harvard-veritas-immersive.greenhoop2.chatgpt.site/ remains version3 unless a later verified save/deployment states otherwise. This iteration should be saved as progress, NOT deployed as a finished experience. Root is preparing a fresh ZIP and cloud save-only version. Credentials must stay only in memory/stdin. Use Sites workflow; helper owns commit/push/package. Do not save credentials or the unsolicited get_site bypass token in files.
Active assets40.22MB. Old full snapshot126.97MB and previous40.34MB ZIP are in outputs. Unused CGI/panorama assets safely moved to work/harvard-cgi-assets-backup-2026-11-05. New docs README/VALIDATION/credits/LATEST accurately describe prototype; preserve Optimerlicense tail. See output save receipt for final snapshot/version after this checkpoint.

---
# Historical checkpoints (superseded)

# Latest steering and new source
User now requires VERY SHORT entrance: keepapprovedcover, onebriefbookeffect, thenalreadyinrealoffice/library. CSSreal-track reducedto240svhdesktop/250svhmobile: real-spacerevealatp.425 is<1viewportofscroll. Sourcepreloadnowstartsatpageload(hidden,asynchronous), sofilmshouldbereadybeforefirstscroll.

Newimportantresearch: YouTubechallengehasgoneawayonNORMALretryoftheoriginalblockedURL(noCAPTCHAinteractedwith,nobypass). CUA tab8 (widenerFilm) nowopensofficialHarvardLawSchoolvideo CXkjHLBr_y0, TourtheHarvardLawSchoolLibrary. Originalprimaryhttps://hls.harvard.edu/amicus-libris/langdell-reading-room-closed-until-future-notice/ linksitandstatesreadingroomsectionstarts4:18. Nativequalitymenuoffers1080pHD;720pwasplayingautomatically;selected1080throughnormalnativeplayerUI. Currentpausedtime~267s (4:27) showsREALLangdellReadingRoomceiling/chandelier/Latininscriptions. Needinspect4:18..4:50forbestshortcontinuousforwardshotendingatreadingdesks. Sourceisprofessionalrealcamera, farbetterfitthanCountway540. MainappSTILLCountway365..401prototype; havenotimplementedYouTubeIFrameAPIyet. Mustnotclaimswappeddone. CoulduseofficialYouTubeAPIseekToforgenuinescrollwithoutpaidSDK; respectnativebranding/requirementsanddonotdownload/rehost. Needverifyembedallowed+seekperformance. PrimaryAPI docs https://developers.google.com/youtube/iframe_api_reference (notyetread). Noaccountcreation/paymentneeded.

# Latest checkpoint — real corridor prototype

User steering: KEEP APPROVED HERO/COVER. Remove outdoor360final entirely and all inventedHarvardarchitecture. Firstscrollreveals3Dbookportal; enter REAL Harvardlibrary/office; scrollmust advancecamera, includingcurves. Only a SHORT corridor to a library/office or exit is needed. Prefer a visible library/office withdesks/books asdestination, notgenericcorridor. End atinteractivebookwithHarvardimages/media/links. Do notclaimcomplete,8Knativeorlife-real atcurrentquality.

## Current active app
- Entry src/main.jsx -> RealHarvardApp.jsx + RealHarvardApp.css. OriginalheroMP4/poster retained. GSAP+Lenis sharedticker.4chapters.
- BookThreshold.jsx is responsive: opened7-model-unitspreadfits69%portraitwidth or45%desktopwidth. Intentional full-screenzoomonlyatp.30-.425. Userreportedbooktoobigandthiswasfixed; screenshot outputs/livro-enquadramento-ajustado.png verifiedat395x827 CSS, canvas987x2067,24%journey.
- PagePortal/VeritasBook now acceptportalType library; viewportfillsLokerphotographywhile entering.
- ScrollFilm.jsx is ACTIVE real-source prototype: nativeVimeoSDK, source https://player.vimeo.com/video/529027309?h=3e580bdd5a, officialsource https://countway.harvard.edu/about/tours . CountwayLibrary/HarvardMedicalSchool/Boston. Sourceis anOFFICIAL SCREENRECORDINGOFVIRTUALTOURof2021, NOT camera-shotfootage. Native958x540, MAX540pconfirmedbothHTMLvideodimensionsandqualitymenu.
- Shorttimemapping365..401seconds overjourneyp.425..85. Singleasyncseekinflight, newesttargetwins, alwayspauseafterseek. backgroundmodeandCSScoveruseofficialVimeoparameters. No download/rehostingofvideo. Scrollcontrols seek; noindependentplayback.
- Lastbrowserproofofprevious83secmap: p69%,source400.892s,ready,pausednativeplayer. Needfinishforward/backvalidationaftershorteningto36secandnewimperativeiframehost.
- Video ispreloadedafterp.29; progressioncap.40untilfirstseekready. Bookcap.10untilready. HMRreadinesswasfixedwithoneffectcallback.
- EndbookHTMLtabs: realLokerphoto,HarvardLibrary/GutenbergBible/Wikipedia/source links. No outdoorpanorama/constructedhallinactivepage.

## Critical unresolved quality/source issue
The Countwayclipisablurrytechnicalproofanduserdoesnotyetacceptasdestination. NeedbetterrealHarvardlibrary/officesource. Cannotcallthisfinishedhighresolution. UserhasNOMatterportSDKaccessorownfilm; userDECLINEDanynewpaidgeneration. No trials/subscriptions/newpaidjobs.
- RealWidenerpublicMatterport fs3gQv7n1QGverifiedinthebrowser: actualLokerbeautifulreadingspace, nativewalkbyclicks. Customscrollcamera requireslegitimateSDKkey/domainaccess; notavailable. Nativeiframealonecannotbefalselycalledscrollwalk. WidenerTour.jsx/CSS savedbutno longeractive.
- Promising PRIMARY NEW SOURCES toinspect: HLSLibrarytour https://hls.harvard.edu/amicus-libris/langdell-reading-room-closed-until-future-notice/ embedsYouTube CXkjHLBr_y0. Article saysreadingroomportionstarts4:18 (Langdell/Caspersenbooks,tables).
- OfficialHoughtonvideo https://www.youtube.com/watch?v=r_S9o9BnU_c linkedfrom https://www.harvard.edu/visit/tours/ .
- EarlierindependentYouTubewalkvideo zKIEospIOzMhitGoogleSorryCAPTCHAinCUAtab7. Respectchallenge; donotbypassviaalternatefetch/embed/proxy/downloaders. NeeduserconfirmationtointeractwithCAPTCHA oruserhandoffbeforecontinuingYouTubeinspection. Couldaskpermissionnowifnecessary. Noauthorizationyet.
- CountwaychannelrelatedVimeovideos1037957815,1036096372,643655824returned401: STOP, do NOT guesshashes/bypass.
- HarvardLawgeneralvirtualtourprimarypage https://hls.harvard.edu/today/video-a-virtual-tour-of-harvard-law-school/ lookup started(execsession55756) notyetcollected.

## Save/backup locations
- Fulloldprogresssnapshot outputs/Harvard-progresso-2026-11-05_11-27.zip (126969489bytes) preservesallmaquettecode/assets.
- UnusedCGI/panoramaassetsMOVED, notdeleted: ../harvard-cgi-assets-backup-2026-11-05 . Latestactivepublicassets40.22MB. Removedassetsnotneededbyactiveentry. LegacyArchiveWorld/etc remaininsrcbutNOTimported;theirtexturesnowinbackup.
- ThisnewZIPsnapshotbelowpreserveslatestactiveprototypeandcode. No.newliveversiondeployed;olderpublicSiteunchanged.

## Verification/preview
- Latest9render-quality/rAFfadetestspassed. Productionbuildpassedmultiple times; lastsourcechangesneedfinalbuild. Bundlewarn~1.08MBbookdynamicchunk.
- Local http://127.0.0.1:5174/ serveralreadyrunning. SelectedCUAbrowser2, walkPreview tab4,realFilmCountwaytab6, CAPTCHA widenerFilmtab7mayhavebeenclosed. Listtabsbeforeuse. CUAviewportoverrideRESET; actual395x827. Do notreapply1440 overridewithoutcheckingheight(theIABhad1440x3110not900).
- Needvalidate: new36secmapforward/back/idle;portraitbookfixedscreenshotexists;endmedia tabs;audio;noerrors;sourcecredits/README/VALIDATIONstale.
- ExistingSites project appgprj_6aeb7e535db08191846d8c78e5dbd7dc, audiencePUBLIC. Live https://harvard-veritas-immersive.greenhoop2.chatgpt.site/ . HEADstilld080a33...unlessfutureworkflowchanges. Sourcehelperownscommit/push/package; mintfreshcredentialandkeepsecretsonlysessionmemory/stdin. LocalZIPsaveisdonewithoutpublication.


---
## Earlier history
# Latest steering — 5 November 2026

User explicitly accepts the CURRENT HERO/COVER as perfect: preserve it. Remove the final outdoor 360 entirely. Replace the invented corridor with ORIGINAL REAL Harvard interiors. Desired journey: first scroll reveals thematic book/portal, enters actual library/office, scroll moves physically forward through successive real spaces and curves, ends at a desk/book with media/images/wiki/Harvard links. Do not continue polishing fake ArchiveHall or claim it is original Harvard. Current real assets: official Widener Matterport model fs3gQv7n1QG, verified browser opens original Loker with native controls. Custom scroll camera requires legitimate SDK key/access; no such key currently available. No new paid generation allowed. Need actual continuous licensed footage or a supported public viewer control API for true scroll-driven walk. Public embed alone is NOT this requested interaction.

# Checkpoint — Harvard immersive, 5 November 2026

## User intent and current acceptance
The user wants a photographic/lifelike Harvard experience, not a maquette. Scroll must walk continuously THROUGH successive interior spaces, approach a realistic crimson/gold folio, open it and travel INTO a word/page before discovering the Yard. Igloo and Scrolltide Umbral/Rann Mahal are reference quality; do not copy proprietary assets. The current preview is still rejected as too artificial. Do not claim the project is complete or native 8K everywhere.

Latest specific correction: frosted/blue main windows are unacceptable. They must become clear with coherent exterior space, real parallax, convincing light and reflections. Do not restore a flat photo pasted behind glass. Current frost is a temporary unsuccessful workaround.

## Budget
User explicitly selected CONTINUE WITHOUT NEW PAID GENERATION. Do not start Higgsfield trials, subscriptions, purchases or paid jobs. Previous single authorized exterior film is already generated: MiniMax H3, 2560x1440, 5.167s. Higgsfield balance was verified 0. Quotes only: 15s MiniMax2K30 credits, Kling4K90, FLUX4K195. No new job submitted. DLSS5 is NVIDIA RTX technology, unavailable directly on the Apple M5/browser; do not advertise DLSS in the site.

## Project and preview
Checkout: /Users/guilhermepereiragalvao/Documents/Codex/2026-11-04/co/work/harvard-veritas
Existing public Sites project: appgprj_6aeb7e535db08191846d8c78e5dbd7dc
Live older edition: https://harvard-veritas-immersive.greenhoop2.chatgpt.site/
Local dev: http://127.0.0.1:5174/ (server already running, avoid duplicate). Last HTTP readiness:200. This checkpoint is NOT a new deployment. Preserve PUBLIC audience. Use Sites skill/source helper for future synchronization and publication; credentials must stay in session memory/stdin, never files.

## Implemented
- main.jsx: GSAP ScrollTrigger + Lenis shared ticker,900svh desktop/800mobile, decoupled camera progress,5chapters, modal/audio controls. Current import is ArchiveWorld.jsx, not old HarvardWorld/CinematicScene.
- ArchiveWorld.jsx: full metre-scale hallway camera route, continuous CatmullRom arc-length walk until p=.5, book approach and A-hole portal p=.65-.81, panorama after.81. New stronger window sunlight/lower ambient, area-light library initialized, tone mapping/N8AO/SMAA/low bloom.
- ArchiveHall.jsx: true arches/columns/coffered ceiling/panelling. Photographic plaster PBR, frostedglass currently MUSTREPLACE per latestfeedback.
- ArchiveFloor.jsx: textured rough oak, planar reflection512/1024, restrained mirror. Still needs aesthetic and performance review.
- ArchiveFurnishings.jsx: licensed CC0 scanned bookcases/books/desks/chairs, green reading lamps. LOD geometry with stable textures/DPR.
- VeritasBook.jsx: red4Kleather albedo/2Knormalroughness, raised gold lettering, paper fibres, animated hinges/pages, physical portal to actual A counterhole.
- RenderQuality.jsx: persistent fixed quality mode, one Canvas dpr source. No scroll/mouse/FPS downgrades. Cinema16MPcap,maxdimension8192; not promised8Kframebuffer.
- LoopingFilm.jsx: custom rAF250ms fading from heldopacity, fadeout.55seconds beforeend,100msendeddelay, cancellationguards. Posterfallback.
- WidenerTour.jsx/CSS: native dialog lazily embeds official public Matterport tour (fs3gQv7n1QG),brandingretained,externalfallback. Integrated header/mobile buttons and modal scroll/audio/render pause. Browser embed still unverified.
- HarvardSquare real CC BY ambient replaces syntheticoscillators. OfficialCollegefilm native AAC is digital silence, cannot invent originalsound; captiontruthfullyseparateambience. AudioUXbrowserchecks stillpending.

## Verification so far
Latest productionbuild passed after WidenerTour integration. Nine meaningful quality-persistence and rAFfade tests passed. Agent geometry reports in this folder. No browsererror logs on previous hall view. Browser screenshots show meaningful lighting improvement but user still sees maquette. Do NOT turn these checks into a claim of photographic realism.

## Unfinished / next steps
1. Complete free exterior real3Dtrees/ground. Subagent hit usage limit. Only public/assets/exterior/jacaranda_tree/jacaranda-tree.gltf and .bin were written; textures may be missing! Not imported or deployed. Inspect GLTF image URIs, obtain official PolyHaven CC0 source, optimize within ~20MB. No ArchiveExterior.jsx exists yet.
2. Replace frostedblue windows with clear physical glass. Add local room reflection probe, coherent sun/exterior illumination; no flat-photo fallback. PCSS soft shadows were researched but NOT applied. No SSGI package installed.
3. Browser-check bookopening/readabletext/portaljoin, camera path and actual stableDPR during chapters/reload. Confirm no clipping/blankpage; current path was revised but closeupnotyetreviewed.
4. Verify Widener official iframe in CUA. This is a real photographic tour from Harvard Library, NOT ours or custom-scroll API. Matterport SDK requires account/key/licensing; do not bypass.
5. Finish credits/README/VALIDATION,remove unused legacy modules/assets after safebackup. public assets~137MB with unused alternatives. Current CREDITS-v4 still describes abandoned Lokerphotoplane (not currenthall), needscorrection.
6. User asked to save all progress due usage limit. This checkpoint and ZIP preserve source/assets/audit. Continue from here, do not rebuild from scratch or keep promising the screenshot will become lifelike through resolution alone.

## Browser
Use cua_repl for all browser control, rewriteDocumentation after compaction. Selected IAB browser id2. Latest preview tabid4; mayexpireonturnend, rebind/listtabs first. Viewport actual769x827 CSS; prior viewport.set reported success withoutapplying. Reset viewportcap ifsessionstillset. No arbitrary browser automation via shell.

## Primary references
https://www.scrolltide.co/templates/rann-mahal — officialdescription: onefilmcutto240frames,5copychapters.
https://www.scrolltide.co/templates — Umbral isonecontinuouscamerafilm.
https://www.scrolltide.co/templates/mariana —11plates stackedindepth.
https://news.harvard.edu/gazette/story/2020/04/360-degree-virtual-tour-simulates-walk-through-widener-library/
https://library.harvard.edu/libraries/widener
https://my.matterport.com/show/?m=fs3gQv7n1QG
https://research.nvidia.com/labs/adlr/DLSS5/
