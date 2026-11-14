# Harvard — um mundo de ideias

Experiência editorial independente em português, sem vínculo institucional com Harvard University. A direção atual é uma **cena 3D viva**, com construção pelo scroll, ações simultâneas e um álbum de volumes interativos. A capa aprovada permanece preservada.

A versão de trabalho de 13 de novembro reúne o ateliê, modelos prontos licenciados, scanner tridimensional, recebimento e álbum. As referências de Vedant Hegde e Alex Bender/Fancy orientam materiais, composição e movimento; os arquivos proprietários desses artistas não foram fornecidos nem copiados.

## Executar

Requer Node.js 20.19+ ou 22.12+.

```sh
npm ci
npm run dev
```

`npm test` executa as regressões de proporções e circulação. `npm run build` gera `dist/`; `npm run preview` serve o build. A prévia de trabalho usa `http://127.0.0.1:5174/`. Reutilize o servidor já aberto antes de iniciar outro na mesma porta.

## Direção que está sendo integrada

1. **Capa preservada.** O filme temático e a composição inicial já aprovados.
2. **Chegada geográfica.** Google Maps 3D na demonstração local aproxima Harvard e a Memorial Church. As imagens pertencem ao provedor; não representam trânsito ao vivo.
3. **Mundo de arquivo em 3D.** `HarvardArchiveWorld.jsx` é a nova cena autoral em construção: ambiente completo, câmera contínua, montagem de elementos pelo scroll e movimentos simultâneos. A intenção é perceber um lugar em atividade, não apenas objetos isolados ou uma série de fotografias ampliadas.
4. **Álbum de descoberta.** `HarvardAlbum3D.jsx` apresenta uma encadernação física digital que ocupa quase toda a largura da tela, com seis mini livros. Os volumes chegam em sequência, acomodam-se nas páginas e respondem à interação.
5. **Leitura.** `AlbumVolumeReader.jsx` abre três spreads por volume, com texto legível, fotografias originais, fontes oficiais e navegação por botões, teclado, toque e scroll.

A entrada é `src/main.jsx` → `HarvardJourneyApp.jsx`. A raiz controla a timeline, os modais e a passagem entre os módulos. O ateliê substitui a etapa fotográfica na jornada atual. `ChurchDepthScene.jsx`, `ScrollFilm.jsx` e os antigos corredores permanecem como histórico; não devem ser reconectados ao fluxo por engano.

## Recebimento e circulação

Oito caixas identificadas e dois paletes participam de uma operação única de 272 segundos. Caminhão, carrinho, robô, recebedor, paleteira e empilhadeira compartilham o mesmo estado. As cinco caixas recebidas passam pelo scanner uma vez; depois são apoiadas no palete e armazenadas. A leitura tem uma moldura volumétrica junto da própria caixa, varredura local, dimensões e contagem.

O botão **Ver o scanner 3D** aproxima a câmera e **Voltar ao ateliê** restaura a perspectiva geral. O avanço para a passagem do álbum encerra essa aproximação.

Personagens usam esqueletos e animações licenciados; mãos e pés seguem alvos de tarefa. Mochilas têm posição persistente, junto da cadeira ou presas ao esqueleto. A operação é uma coreografia cinemática determinística: não é um motor de dinâmica rígida. Os testes verificam suportes, identidades, continuidade e envelopes de circulação; não certificam todas as superfícies de roupa e dedos.

## Cena, movimento e controles

O álbum usa geometria real de capas, lombada, papel e seis pequenos volumes. A montagem principal ocorre aproximadamente entre 10% e 32% de seu progresso local. Depois, capas, marcadores, folhas curvas e micro partículas mantêm movimentos discretos. A seleção tem prioridade e abre o leitor após a elevação do livro escolhido.

O controle de pausa interrompe movimentos autônomos e música. Ele não deve bloquear comandos do visitante: scroll, navegação e seleção continuam funcionando. Movimento reduzido elimina animações autônomas e encurta transições; a qualidade escolhida permanece fixa ao rolar.

## Resolução e natureza das imagens

- Capa temática: vídeo gerado anteriormente, 2560 × 1440, 24 fps, aproximadamente 5,167 s.
- Álbum: texturas procedurais e impressão de capa até 3072 × 4096; mini capas em 768 × 1280. A resolução do canvas depende da tela, da GPU e do modo escolhido.
- Fotografias originais da Memorial Church: fachada 5141 × 3420; órgão/interior 5141 × 3426; inscrição 4032 × 3024.
- Widener: variante web 3840 × 2160. Loker Reading Room: original 9184 × 2404 e variante 4096 × 1072.

Essas dimensões não tornam o site inteiro 8K. O ambiente de arquivo e a encadernação são interpretações artísticas em 3D, não digitalizações de um interior ou livro histórico identificado. Fotografias e mapa real devem ser distinguidos dos elementos autorais.

## Mapa de demonstração e configuração local

A demonstração Google 3D é restrita ao desenvolvimento. A configuração local não deve ser copiada para documentação, arquivos de progresso, Git, ZIPs ou publicação. Não ler, imprimir ou arquivar valores de chave. O código usa uma condição de desenvolvimento; uma versão de produção precisa manter um fallback honesto se não houver configuração autorizada para seu domínio.

Não ativar serviço pago, assinatura, teste ou nova geração de mídia. O usuário recusou novas gerações pagas; esta rodada usa código próprio e materiais já disponíveis.

## Ferramentas e fontes

React, Three.js, React Three Fiber, Drei, GSAP ScrollTrigger, Lenis e Web Audio. A música opcional de `QuietScore.js` é uma composição procedural original, inspirada em cordas dedilhadas e flauta. Não é uma gravação histórica ou o áudio da igreja.

- [Créditos atuais](public/assets/CREDITS-atlas.md)
- [Fotografias da Memorial Church](public/assets/CREDITS-memorial-church.md)
- [Estado de validação](VALIDATION.md)
- [Checkpoint para retomar](CHECKPOINT.md)
- [História de Harvard](https://www.harvard.edu/about/history/)
- [Memorial Church — história oficial](https://memorialchurch.harvard.edu/history-0)
- [Harvard Library](https://library.harvard.edu/)

Sendoso, Igloo/Abeto, MotionSites e Scrolltide são referências de continuidade, materiais, luz e composição. Nenhuma mídia, modelo ou shader proprietário dessas referências foi copiado.
