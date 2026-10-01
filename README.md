# BFF, Beer, Food & Freinds - site

Site do café BFF, em Vila Real.

- `index.html` - marca, o trio, quem somos, a patroa, galeria, horários, morada
- `menu.html` - menu carregado de uma API, com todos os estados
- `beer.html` - galeria das bebidas
- `food.html` - galeria da comida
- `equipa.html` - a equipa: fotografia de grupo e uma fotografia por pessoa

Sem framework. HTML, CSS e módulos ES nativos, mais GSAP alojado localmente.
Nenhum pedido a serviços externos em produção. As páginas são geradas por um
script pequeno a partir dos dados e das fotografias:

```bash
npm install        # uma vez, instala o sharp para as imagens
npm run build      # fotografias e páginas
npm run serve      # abre em http://localhost:3000
```

**Não editar `index.html`, `menu.html`, `beer.html`, `food.html` ou
`equipa.html` à mão.** São gerados. Os originais estão em
`tools/index.template.html`, `tools/menu.template.html` e `data/`.

---

## 1. O que é factual e de onde vem

Só entrou no site aquilo que existe no briefing, no ficheiro do logótipo,
nas fotografias fornecidas, ou no que o cliente pediu por escrito.
Nada foi inventado.

| Dado | Valor | Origem |
| --- | --- | --- |
| Nome | BFF, Beer, Food & Freinds | briefing |
| Assinatura | Your kind of place | texto dentro de `BFF-logo.ai` |
| Ano | 2021 | texto dentro de `BFF-logo.ai` |
| Localidade | Vila Real, Nossa Sr. da Conceição | briefing e logótipo |
| Morada | Rua DR Domingos Campos, Bloco D, loja 7 | briefing |
| Horários | ver `data/site.json` | briefing |
| Instagram | @bffbeerfoodfriends | briefing |
| Dourado | `#c3820b` | CMYK 10/40/95/15 extraído do logótipo |

Tudo isto vive em **`data/site.json`**, que é a única fonte de verdade.
Alterar lá muda o site inteiro.

### Duas coisas a confirmar

1. **A grafia do nome.** O briefing pede `Freinds` e diz para manter. O
   logótipo real escreve `FRIENDS` e o Instagram é `@bffbeerfoodfriends`.
   Ficou como o briefing pediu. Para corrigir basta o campo `name` em
   `data/site.json` e as ocorrências em `index.html` e `menu.html`.
2. **O link do Instagram.** O briefing dá o handle mas marca o URL como TBD.
   Está a ser usada a forma canónica `instagram.com/bffbeerfoodfriends/`.
   Confirmar antes de publicar.

### Ainda em falta (TBD)

Telefone, email, WhatsApp, código postal, coordenadas, URL exacto do Google
Maps e do embed, e as palavras da patroa. Nenhum destes tem texto inventado
a ocupar o lugar.

O texto de "Somos o café da cidade" foi escrito a pedido do cliente, com a
direcção que ele deu: café da cidade, conhecido por ser bom com as pessoas.
Os factos que usa (2021, Nossa Sr. da Conceição, as nove da manhã, as duas
da madrugada) vêm do briefing e dos horários reais. Fica em `about` dentro
de `data/site.json`, para se poder reescrever sem tocar no HTML.

---

## 2. As secções

```
hero      cartaz sobre a fotografia do balcão
trio      Beer / Food / Friends, juntos e fixos
sobre     quem somos, em cinco linhas
patroa    porque é que isto começou
galeria   carril de fotografias, rola na horizontal por si
horários  aberto ou fechado, ao vivo
onde      morada, mapa, Instagram
final     acto de fecho fixado, com a chamada para o menu
tira      a assinatura da casa, a reagir ao scroll
```

### O trio

As três palavras ficam **sempre visíveis ao mesmo tempo**, coladas umas às
outras, e o scroll acende uma de cada vez enquanto troca a fotografia por
trás. A distância de scroll é definida no JavaScript, não pela altura das
secções, e é por isso que o bloco se comporta igual em qualquer ecrã:

| Ecrã | Bloco das três palavras | Scroll da secção |
| --- | --- | --- |
| 320 px | 150 px | 2,0 ecrãs |
| 375 px | 157 px | 2,0 ecrãs |
| 961 px | 374 px | 2,5 ecrãs |

Para apertar ou alargar, muda-se um número em `js/motion.js`:

```js
const span = () => window.innerHeight * (wide ? 1.5 : 1.0);
```

### O final

A página fixa-se uma última vez para acabar num sítio, em vez de
simplesmente deixar de haver secções. O selo da casa cresce e roda por trás
enquanto a assinatura se monta linha a linha, e só depois aparece a chamada
para o menu. É o maior tipo da página, de propósito.

A seguir vem uma tira, uma só em toda a página, que anda sozinha e responde
à velocidade do scroll: acelera com quem rola e inverte o sentido quando se
volta atrás. Reage a quem lê em vez de andar sempre igual.

### A galeria

Rola na horizontal por si própria, em qualquer ecrã: com o dedo, com o
trackpad, ou arrastada com o rato. **Não fixa nada e não converte scroll
vertical em horizontal.** Chegou a fazê-lo e foi retirado: roubava o scroll
da página e obrigava a passar pela galeria inteira para continuar a ler.

As células têm todas a mesma proporção. As fotografias vêm em formatos
diferentes e sem isso o rodapé do carril ficava aos degraus.

A barra dourada ao lado do título segue a posição real da barra de scroll
horizontal, por isso mostra quanto falta seja qual for a forma de a mover.

### A patroa

A secção existe e está desenhada, mas o texto é dela. Enquanto
`owner.story` em `data/site.json` for `null`, a página mostra o convite a
escrever. Assim que esse campo tiver texto, o convite desaparece e o texto
publica-se tal e qual. Há um rascunho em `owner._rascunho` para aprovar ou
deitar fora. Não se escreve a história de uma pessoa real por ela.

## 2b. Fotografias

### Acrescentar fotografias

Largar os ficheiros na pasta certa e correr `npm run build`:

```
fotos-originais/beer/     bebidas, cerveja, cocktails, o bar
fotos-originais/food/     comida
fotos-originais/equipa/   grupo.jpg para a fotografia de grupo,
                          e uma por pessoa, ligada ao nome em data/equipa.json
```

- **Ordem:** a ordem alfabética dos ficheiros. `01-...`, `02-...` escolhe
  quem aparece primeiro.
- **Tamanho:** quanto maior, melhor. O build gera as versões pequenas
  (480, 760, 1120 e 1600 px) em AVIF, WebP e JPEG.
- **Telemóvel:** fotografias deitadas pela etiqueta EXIF são endireitadas.
  Testado com uma imagem de 2400x1800 marcada para rodar: saiu 1600x2133.
- **Legendas:** um `legendas.json` opcional na pasta dá o texto alternativo
  (o que um leitor de ecrã lê) e a legenda que aparece no site:
  `{ "01-francesinha.jpg": { "alt": "Francesinha no prato", "legenda": "A francesinha" } }`
  Sem ele, o texto alternativo é genérico e verdadeiro ("Comida do BFF").

O build só reprocessa o que mudou e apaga os ficheiros gerados de
fotografias que saíram dos originais.

### As seis originais

As fotografias usadas na página inicial estão listadas em `LEGACY` dentro de
`tools/build-images.mjs`, com a categoria de cada uma, e entram também nas
galerias Beer e Food, depois das fotografias novas.

**Uma nota sobre a qualidade.** Os originais que existem são capturas de
ecrã, entre 680 e 909 px de largura. Chegam para o carril e para as secções
a meia largura, mas o hero em ecrã grande fica esticado. Se houver os
ficheiros originais da máquina, vale a pena substituí-los em
`fotos-originais/` e correr o comando outra vez.

## 2b-bis. As páginas Beer, Food e Equipa

Geradas por `tools/build-pages.mjs` a partir de `data/galerias.json`,
`data/equipa.json` e `assets/fotos/fotos.json`. As fotografias ficam em HTML
estático (aparecem sem JavaScript); o JavaScript só acrescenta o movimento e
o visualizador.

- **O trio da página inicial leva a elas.** Cada palavra é um link, e a
  pastilha ao lado da legenda acompanha a palavra acesa, para quem não
  repara que as palavras são clicáveis (sobretudo no telemóvel).
- **A palavra do topo** é cheia com uma fotografia da página
  (`heroFoto` em `data/galerias.json`; na equipa, a de grupo), e o tamanho
  ajusta-se ao número de letras para "& Friends" nunca partir a linha.
- **A galeria** é em colunas: cada fotografia mantém a sua proporção, e
  aguenta cinco ou cinquenta.
- **O visualizador** abre ao tocar numa fotografia: setas, teclado, arrastar
  no telemóvel, Esc para fechar.
- **No fim de cada página** as três palavras voltam como navegação: quem
  entrou pelo "Food" segue para "& Friends" sem voltar atrás.
- **A navegação** tem uma fonte só (`tools/lib/layout.mjs`) para as cinco
  páginas. "Nós" e "O espaço" saíram para dar lugar a Beer, Food e Equipa.

### Modo pré-visualização

Enquanto `preview` for `true` em `data/galerias.json`, cada galeria é
completada com quadrados "Foto por chegar" até ao mínimo indicado, e a
equipa mostra cartões "Nome / Função" por preencher. **Pôr `false` antes de
publicar.** Com `false`, o que não existe simplesmente não aparece.

### A equipa

`data/equipa.json` tem a fotografia de grupo, uma frase opcional, e a
lista de membros, cada um com o ficheiro da fotografia, o nome e a função.
Nada aparece se não estiver lá escrito. Uma fotografia na pasta da equipa
que não esteja ligada a ninguém fica de fora, com um aviso no build.

## 2c. Movimento

Tudo o que se mexe está em `js/motion.js`, com GSAP e ScrollTrigger
alojados localmente em `assets/vendor/` (sem pedidos a CDNs).

Passa tudo por `gsap.matchMedia()` com três condições: ecrã largo, ecrã
estreito e `prefers-reduced-motion`. Quando o formato muda, o GSAP reverte
sozinho o que já não se aplica e monta o resto. Quem tem movimento reduzido
ligado no sistema não recebe um único ScrollTrigger.

Cada ScrollTrigger declara `refreshPriority` a partir da posição real do
elemento na página, porque uma secção fixada muda a altura de tudo o que
vem a seguir e a ordem de recálculo tem de seguir a ordem da página.

**Atenção ao sinal.** A documentação do GSAP diz "lower = refreshed first",
mas o comportamento real da versão 3.13 é o contrário: recalcula primeiro
quem tem o número mais alto. Com o sinal trocado, o final colava-se ao ecrã
ainda a meio do "Onde estamos", por cima da morada, 845 px cedo demais (a
altura exacta do espaçador do trio). Foi medido no browser com as quatro
variantes possíveis e só uma funciona. O topo da página fica com zero e vai
descendo para números negativos.

### A rede de segurança

Um `gsap.from` com `autoAlpha` esconde o elemento no momento em que é
criado e só o volta a mostrar quando a animação corre. Se o motor engasgar
entre uma coisa e outra, o texto fica invisível para sempre. São três
camadas contra isso:

1. **A entrada do hero** salta para o fim se ao fim de três segundos ainda
   lá vai a meio.
2. **Cada revelação** faz o mesmo dois segundos depois de o seu gatilho
   disparar.
3. **Um vigia** amostra o contador de frames do GSAP durante os primeiros
   doze segundos, e outra vez sempre que o separador volta a estar à
   frente. Dois intervalos seguidos sem um único frame, com a página
   visível, e desiste-se do movimento: mostra-se tudo de uma vez.

A primeira versão disto verificava uma só vez, dois segundos depois de
arrancar, e não chegava: se o motor desse alguns frames e só depois
parasse, a verificação passava e a marca ficava meia transparente. Foi
apanhado em testes.

Nenhuma frase deste site depende de uma animação para ser lida.

## 2d. As passagens entre secções

Sete causas de solavanco, corrigidas:

1. **Recálculo a meio do scroll.** As fotografias preguiçosas chamavam
   `ScrollTrigger.refresh()` quando a última acabava de carregar, no meio da
   página. Como cada `.ph` já reserva a proporção em CSS, uma imagem a
   chegar não muda o layout: o refresh foi removido.
2. **A barra do browser em telemóvel.** Aparece e desaparece durante o
   scroll e muda a altura do ecrã, o que obrigava a recalcular tudo.
   Resolvido com `ScrollTrigger.config({ ignoreMobileResize: true })`.
3. **Duas medidas para a mesma coisa.** O palco do trio media-se em
   `innerHeight` enquanto o CSS lhe dava `100svh`. Passou a medir-se a si
   próprio.
4. **Entrada a rolar depressa.** `anticipatePin: 1` nas três secções fixadas
   tira o salto antes de colarem.
5. **A deriva das fotos contra o pin.** Dentro do carril fixado a posição
   vertical das células nunca muda, e seis triggers a partilhar o mesmo
   intervalo faziam a galeria tremer. Em ecrã largo a deriva das células
   deixou de existir.
6. **O carril roubava o scroll.** Convertia scroll vertical em avanço
   horizontal, o que prendia a leitura até a galeria acabar. Removido: o
   carril passou a rolar por si, e a galeria deixou de ser uma secção
   fixada.
7. **O final por cima do "Onde estamos".** O `refreshPriority` estava com
   o sinal trocado, por isso o final calculava o seu ponto de arranque antes
   de o trio inserir o espaçador. Ver a nota sobre o sinal em **2c**.
8. **Alturas que mudam depois do arranque.** Os horários re-desenham-se com
   os dados reais e as pastilhas do menu trocam de esqueleto para resposta,
   ambos depois de os ScrollTriggers estarem feitos. Um `ResizeObserver`
   sobre o `body` recalcula quando a altura da página muda, e desliga-se ao
   fim de quinze segundos para não recalcular a meio de um scroll.
9. **Revelações que nunca chegavam.** Um bloco perto do fim de uma página
   curta, num ecrã alto, tinha o ponto de arranque para lá do scroll máximo.
   O `clamp()` do GSAP resolvia o fim mas estragava o princípio (prendia a
   zero os blocos já visíveis ao abrir, que então nunca disparavam). O
   `reach()` em `js/motion.js` só limita o fim.
10. **Legenda trocada a rolar depressa.** Empilhavam-se tweens sobre a mesma
   legenda e o `onComplete` do mais antigo repunha o texto errado. Agora há
   uma guarda por índice e `overwrite: true`.

Sobraram duas secções fixadas, o trio e o final.

Verificação: um varrimento da página inteira de três em três terços de
ecrã, a comparar as caixas de todas as secções visíveis em cada posição.
**Zero sobreposições** a 375, 748 e 1440 px de largura, e os dois pins
arrancam exactamente onde as suas secções começam, ao pixel.

## 3. O menu

O menu nunca está escrito no frontend.

```
browser  ->  /api/menu  ->  api.biip.pt/v1/<endpoint>
             (assina)       (responde)
                 |
            adapters/biip.js  ->  normalize.js  ->  render.js
```

### O que se sabe da API do biip

Verificado no cliente público de `app.biip.pt`, não assumido:

- `POST https://api.biip.pt/v1/<endpoint>`
- Cabeçalhos `X-BIIP-APIKEY`, `X-BIIP-SIGNATURE`, `X-BIIP-CLIENT`
- A assinatura é um HMAC-SHA256 do corpo JSON feito com um segredo
- Envelope `{ "Response": { "StatusCode", "StatusMessage", "Content" } }`
- Produtos com `name`, `description`, `imagem_url`, `price`, agrupados por
  `product_family_name` e `product_subfamily_name`, mais uma lista
  `unavailable_products`

**A API do biip não é pública.** Exige credenciais emitidas por eles, e o
segredo do HMAC não pode viver no browser. Por isso existe `api/menu.js`:
uma função serverless que assina do lado do servidor. O browser fala com
`/api/menu` e nunca vê credenciais.

### Pôr o menu a funcionar

1. Pedir credenciais ao biip (`info@biip.pt`): chave, segredo, identificador
   de cliente, o endpoint do menu e o código da loja BFF.
2. Definir as variáveis de ambiente no alojamento:

```
BIIP_API_KEY=...
BIIP_API_SECRET=...
BIIP_CLIENT=...
BIIP_ENDPOINT=menu
BIIP_STORE=...
```

3. Publicar. `api/menu.js` está escrito no formato Vercel. Para Netlify ou
   Cloudflare muda a assinatura da função, não a lógica.

Detalhe a confirmar com o biip: se o digest do HMAC vai em hexadecimal ou em
base64. Controla-se com `BIIP_SIG_ENCODING`.

### Enquanto não houver credenciais

A página mostra o estado "menu indisponível" com um botão para tentar de
novo. É deliberado: mais vale um estado honesto do que um menu falso.

### Outras fontes

Em `js/menu/config.js`:

- `mode: "static"` lê um JSON servido em `/data/menu.json`
- `adapter: "passthrough"` aceita já o modelo canónico, sem adaptação
- `?demo=1` no URL carrega `data/menu.demo.json`, com um aviso permanente na
  página. Serve para testar os estados. Nunca aparece em produção.

### Adicionar outra API

Escrever um ficheiro em `js/menu/adapters/`, devolver o modelo canónico de
`normalize.js`, e registá-lo no mapa `ADAPTERS` de `js/menu/client.js`.
A interface não muda, porque nunca lê campos crus.

---

## 4. Marca

O `BFF-logo.ai` é um PDF por dentro. As formas vectoriais foram extraídas
directamente dele, simplificadas e recoloridas. Nada foi redesenhado.

```
assets/brand/
  favicon.svg              as letras BFF reais, num selo
  og.png                   1200x630 para partilhas
  logo/
    bff-lockup.svg         horizontal, para fundo escuro   (~35 KB gz)
    bff-lockup-light.svg   horizontal, para fundo claro
    bff-badge.svg          selo circular, para fundo escuro (~20 KB gz)
    bff-badge-light.svg    selo circular, para fundo claro
    bff-badge-mono.svg     selo a uma cor
```

Paleta, tipografia e espaçamento estão em `css/tokens.css`. Um tema só
(escuro), um acento só (o dourado do logótipo), e uma regra de forma:
superfícies a direito, controlos em cápsula.

Tipos: **Anton** para display, **Archivo** para texto. Alojados aqui em
`assets/fonts/`, sem pedidos ao Google em produção.

---

## 5. Desempenho e acessibilidade

- Zero dependências de terceiros em tempo de execução
- Fontes e ícones locais; o ruído de filme é um filtro SVG, não uma imagem
- Nenhum listener de `scroll`. IntersectionObserver e um ciclo `rAF` que só
  corre enquanto o tour está visível e pára com o separador escondido
- Só se animam `transform` e `opacity`
- `prefers-reduced-motion` respeitado em toda a parte
- Contraste verificado: todo o texto passa WCAG AA
- Navegação por teclado, foco sempre visível, link para saltar conteúdo
- Alvos de toque com 44 px ou mais
- `min-h: 100dvh`, nunca `100vh`
- Dados estruturados `CafeOrCoffeeShop` só com informação real

---

## 6. Estrutura

```
index.html menu.html beer.html food.html equipa.html   gerados, não editar
tools/
  build-images.mjs    fotografias
  build-pages.mjs     páginas
  lib/layout.mjs      navegação, rodapé e <picture> partilhados
  index.template.html menu.template.html
fotos-originais/      os originais, por categoria: beer/ food/ equipa/
data/galerias.json    textos e mínimos das páginas Beer, Food e Equipa
data/equipa.json      a equipa
api/menu.js           proxy que assina os pedidos ao biip
data/site.json        dados factuais, fonte de verdade
data/menu.demo.json   dados de demonstração, só com ?demo=1
css/
  tokens.css base.css site.css story.css menu.css galeria.css
js/
  main.js             arranque da página principal
  menu-page.js        arranque da página do menu
  galeria-page.js     arranque das páginas Beer, Food e Equipa
  lightbox.js         o visualizador de fotografias
  motion.js           todo o movimento, GSAP e ScrollTrigger
  hours.js            aberto ou fechado, semana agrupada
  nav.js icons.js
  menu/               config, client, normalize, render, adapters/biip
assets/
  brand/ fonts/ fotos/ ui/ vendor/
```
