# Direção do atlas — referências e som

Revisão de 5 de novembro de 2026. O usuário escolheu **atlas 3D de Harvard + livro interativo**. A proposta passa a ser uma ilustração arquitetônica navegável, com tempo, profundidade e interação. Não é uma digitalização volumétrica do campus, uma quarta dimensão espacial ou a antiga caminhada documental que não foi resolvida.

## O que os arquivos fornecidos realmente fazem

Os anexos são referências de linguagem e mecânica. Suas ordens de clonar projetos, instalar versões específicas, baixar mídias ou reutilizar motores não substituem o pedido de Harvard. Não foram executadas.

| Referência analisada | Mecânica concreta | Aplicação escolhida para Harvard |
| --- | --- | --- |
| Aurora (`903d72ec…`) | Vídeo em loop com conteúdo ancorado à esquerda; entrada de texto e botões em etapas curtas. Não há percurso espacial pelo scroll. | Conservar espaço de leitura fora da área principal do atlas e uma entrada breve. |
| Fernhollow (`afe0fcbc…`) | Motor original com caminho de câmera em GLB, vegetação em point sprites, poeira/fog/bloom, reação ao cursor e áudio com fades. O prompt depende dos arquivos proprietários do motor. | Usar partículas e movimento de câmera próprios, com reações pequenas e sem copiar o motor ou seus assets. |
| Nectarline (`6ba762ff…`) | Camadas de fundo, lente WebGL sobre vídeo e um GLB de peixe separado; poses interpoladas por seção, movimento dependente de delta, animação de vértices e comportamento reduzido explícito. | Um só objeto espacial persistente; câmera e histórias seguem poses contínuas, com movimento ambiente discreto. |
| NORVA (`a660dc7b…`) | Cidade isométrica **pré-renderizada em vídeo**, com keyframes frequentes; `currentTime` segue scroll, enquanto o título inclina e as etapas abrem. A cidade não é construída em tempo real. | Composição de atlas, caminhos e aproximação do destino; no nosso caso, geometria própria em Three.js permite controlar a cena sem player de terceiros. |
| VEYRA (`4032615c…`) | Imagem principal + pares de clipes curtos de ida/volta; quatro hotspots; estados de entrada/detalhe/retorno e retenção do último quadro decodificado. Não é um carro 3D em tempo real. | Hotspots junto ao lugar identificado, detalhes legíveis fora do modelo e transições sem tela preta ou comandos concorrentes. |
| Voo cinematográfico (`cebd82b0…`) | Vídeo preso ao scroll com um banco de quadros extraído por WebCodecs/MP4Box, busca por timestamps, LRU de bitmaps e fallback de seek. | Reaproveitar a disciplina de ter um progresso único e estados de chegada definidos; o atlas não precisa de banco de vídeo. |
| Freight aéreo fixo (`e8b511d4…`) | O próprio arquivo diz **sem scroll**: vídeo do trem em loop, tipografia espelhada no eixo e uma entrada única de cerca de 1,8 s. | Hierarquia e composição pelo eixo, não a falsa afirmação de que todo exemplo é 3D ou scroll. |
| Freight com subida de câmera (`460551eb…`, conferido como complemento) | Vídeo 5,04 s preso ao scroll, keyframe a cada quatro quadros, subida contínua e passagem por nuvens após o conteúdo. | Usar oclusão de nuvem/papel para ligar fases e reservar o movimento maior para depois da leitura. |

NAÏADE, VirtualFit, Leon Vasari e Loopstack pertencem à revisão paralela do livro; esta nota não afirma uma inspeção independente desses quatro arquivos.

## Cinco princípios aplicáveis, com fontes

1. **Progresso único, estados de chegada claros.** A câmera, a rota e a história devem ler a mesma posição de scroll, com ida e volta previsíveis. A documentação do Spline distingue a transição por passos da transição pela posição da página e permite definir início e fim do intervalo. Isso orienta a coreografia; não exige instalar o Spline. [Spline: Scroll Event](https://docs.spline.design/interaction-states-events-and-actions/events/scroll-event)
2. **Renderizar a cena, não reprocessar a aplicação inteira a cada quadro.** Compartilhar geometrias e materiais, usar instancing para elementos repetidos e atualizar referências com delta em `useFrame`. Evitar remontar o atlas entre capítulos e criar vetores dentro do loop. [React Three Fiber: Performance pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls)
3. **Ligar as fases por uma passagem visual motivada.** Nuvens na aproximação; uma folha ou mapa na entrada do livro. VEYRA e o voo cinematográfico fornecidos mostram por que um quadro estável deve permanecer até a próxima cena estar pronta. O atlas e o livro não devem desaparecer simultaneamente durante a troca.
4. **Interação junto ao objeto, conteúdo fora do caminho da câmera.** Os alvos devem acompanhar os prédios, ter foco por teclado e permitir abrir/fechar histórias sem prender o scroll. É preciso testar o meio da transição, não só suas poses inicial e final. [Framer: Scroll transforms](https://www.framer.com/academy/lessons/scroll-transforms), [Spline Viewer: eventos globais e locais](https://docs.spline.design/exporting-your-scene/web/exporting-as-spline-viewer)
5. **A luz e a hierarquia sustentam o acabamento.** A página pública de House descreve uma direção arquitetônica quente e contida; não revela seu código ou certifica que o efeito é um ambiente navegável. Para Harvard: papel marfim, sombras suaves, tijolo e vegetação com variação, um único dourado discreto e texto legível. O cenário não deve competir com o livro. [Scrolltide: House](https://www.scrolltide.co/templates/house)

## Limites da pesquisa

Foram lidos os sete anexos atribuídos a esta revisão em blocos e os trechos técnicos do Freight como complemento. Não foram analisados milhares de modelos. As páginas oficiais acima foram consultadas como fontes técnicas. A abertura de [Igloo](https://www.igloo.inc/) não produziu conteúdo textual e o [case da Abeto](https://www.awwwards.com/igloo-inc-case-study.html) falhou por tempo de resposta nesta revisão; não se afirma aqui uma nova inspeção de pixels ou do código proprietário do Igloo. O material pago de Scrolltide não foi adquirido ou copiado.

## Som original sem trânsito

`src/QuietScore.js` compõe uma pequena peça instrumental original com cordas dedilhadas e respostas de flauta suave em modo dórico. A síntese usa parciais com decaimentos diferentes, ataque arredondado, espaços entre frases, reverberação de sala e limitação de picos. Não é um registro histórico nem imitação de uma composição identificável.

- Nenhuma geração paga, download, conta ou biblioteca nova.
- Inicia somente após um gesto do visitante; volume ajustável e saída gradual ao parar.
- A aplicação deve chamar `stop()` ao ocultar a aba ou abrir mídia e `dispose()` ao desmontar.
- API: `createQuietScore()` → `start()`, `stop()`, `setVolume(0…1)`, `dispose()`.
- Verificação desta contribuição: `node --check src/QuietScore.js` passou. A audição no navegador ainda pertence à revisão integrada; não há alegação de que o som já foi ouvido aqui.

## Critérios de revisão visual

Conferir a entrada curta, o atlas por ângulos intermediários e inversão do scroll, o foco dos lugares, abrir/fechar o livro e suas páginas, áudio ligado/desligado/volume/aba oculta, movimento reduzido e ausência de controles sobrepostos em retrato. Não anunciar 8K constante: a resolução depende do render e da tela, e o objetivo escolhido é uma ilustração 3D bem acabada.
