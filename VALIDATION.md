# Validação — Harvard Veritas

Atualização: 13 de novembro de 2026. Esta nota descreve a versão local revisada, sem confundir testes automatizados com aprovação visual ou publicação.

## Verificações concluídas

- `npm test`: 12 testes passaram. A suíte inclui fluxo de caixas, leitura do scanner, continuidade e reprodução do estado ao avançar/voltar o relógio, espaços de circulação, suporte dos livros e proporções dos personagens. Quatro testes de busca de vídeo são históricos e não certificam o mundo 3D atual.
- `npm run build`: build de produção passou.
- Proporções: a otimização de culling inicialmente ampliou a caixa usada para normalizar os modelos, reduzindo seus corpos enquanto os alvos de movimento mantinham a escala anterior. A correção mantém a caixa física original e reserva o envelope ampliado somente à esfera de descarte de renderização. Dois testes com os GLBs reais verificam limites invariantes, altura real de 1,72 m e proporções originais em quatro escalas de ator.
- Scanner: botão “Ver o scanner 3D” aproxima a câmera do recebimento; “Voltar ao ateliê” e Escape retornam à composição geral. Cinco caixas recebidas passam pelo túnel e são lidas uma vez. As oito identidades de caixas e os dois paletes persistem até o armazenamento final, sem duplicação de carga por renderizador.
- Logística: varredura em passos de 10 ms verifica funcionários, corpo da empilhadeira importada, rack, esteira, borda da plataforma e cruzamento do robô com o transportador/carrinho. A distância mínima observada entre os cinco funcionários em pé foi aproximadamente 0,422 m; motorista e carregador mantiveram aproximadamente 0,556 m. A operação termina com ambos os paletes no rack superior e os equipamentos sem movimento residual.
- Estudantes: varredura de 3.360 s em passos de 50 ms registrou separação mínima entre pessoas de 0,42216 m, entre robôs e pessoas de 0,51624 m e distância do centro do torso à área da mesa de 0,220 m. Erro de suporte dos livros ficou abaixo de precisão numérica; saltos de posição nas transições amostradas ficaram abaixo de 0,003 mm para intervalo de 2 microssegundos.
- Mochilas: modelo escaneado, lugar próprio ao lado da cadeira, sem arrasto ao movimentar o estudante. Auditoria dos dois esqueletos em três escalas registrou folga lateral da cadeira de aproximadamente 9,18 cm e erro de posição de estacionamento inferior a 7e-15 m.
- Navegação: atualização do tamanho da janela preserva o progresso da jornada. Cenas pesadas têm carregamento e montagem adiados conforme a proximidade de sua etapa. O padrão de uma nova sessão é qualidade Automática; a escolha manual de Alta/Cinema permanece sob controle do visitante e não é rebaixada durante a rolagem.

## Limites da evidência

A animação usa trajetórias cinemáticas e tarefas coordenadas por um relógio compartilhado, não uma simulação geral de corpos rígidos. As auditorias usam esqueletos, planos de apoio e envelopes geométricos; não certificam ausência de interseção entre todos os triângulos de dedos, roupas, mochilas ou cenografia em todo enquadramento. Desempenho varia com equipamento, resolução e qualidade selecionada; não se promete taxa de quadros constante.

A direção visual se inspira em Vedant Hegde/Sendoso e Alex Bender/FANCY. Os modelos licenciados e as cenas autorais não são os arquivos proprietários dessas obras, nem equivalência comprovada de materiais, medidas, técnica de produção ou ultrarrealismo. Não se declara resolução 8K nativa ou DLSS.

## Publicação e retomada

A versão revisada está na prévia local `http://127.0.0.1:5174/`. O envio ao GitHub e a publicação permanecem pendentes: o acesso ao repositório retornou 403 e o projeto legado de Sites retornou 404. Não há novo link público validado para esta revisão.

Repositório indicado: https://github.com/gpereiradeveloper-rgb/Harvard-site-with-3d-animation

A demonstração de mapa continua restrita ao desenvolvimento. A configuração local foi excluída do pacote de entrega e não deve ser lida, impressa, copiada ao GitHub ou publicada. O pacote conserva as licenças e créditos dos ativos.
