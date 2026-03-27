# Design: Jogo Arco e Flecha

**Data:** 2026-03-27
**Escopo:** Portar `bow-game.zip` (arrow-game.html) para o padrão do projeto joguinhos-jose

---

## Contexto

O jogo original é um demo SVG+GSAP de arco e flecha: o jogador puxa a corda do arco com o mouse/touch e solta para lançar uma flecha em direção a um alvo. O código fonte está em `bow-game.zip/110/arrow-game.html`.

---

## Arquivo a Criar

**`jogos/arco.js`** — IIFE que expõe `window.ArcoGame = { abrir, fechar }`.

Nenhum outro arquivo novo é necessário (sem assets de imagem/audio, sem sprites).

---

## Arquivos Modificados

- `jogos/joguinhos-modal.js` — adicionar entrada no array `JOGOS`
- `index.html` — adicionar `<script src="jogos/arco.js">`

---

## Arquitetura

### Pattern IIFE (igual a aranha.js)

```
(function () {
  'use strict';

  // --- Áudio ---
  var SomArco = { ... }          // Web Audio API, cleanup no fechar()

  // --- Estado ---
  var overlay, rafId, ...

  // --- Lógica do jogo (código original intocado) ---
  // svg, cursor, arrows, randomAngle, target, lineSegment, pivot
  // draw(), aim(), loose(), hitTest(), onMiss(), showMessage(),
  // getMouseSVG(), getIntersection()

  // --- Abrir / Fechar ---
  function abrir() { ... }       // cria overlay, injeta scripts GSAP, init jogo
  function fechar() { ... }      // remove overlay, limpa listeners, fecha AudioContext

  window.ArcoGame = { abrir: abrir, fechar: fechar };
})();
```

### Dependências Externas (injetadas dinamicamente no abrir())

| Script | CDN | Motivo |
|---|---|---|
| TweenMax 1.19.1 | cdnjs.cloudflare.com | Animações do arco/flecha |
| MorphSVGPlugin | s3-us-west-2.amazonaws.com/s.cdpn.io | pathDataToBezier para trajetória da flecha |

Os `<script>` são criados no `abrir()` e removidos no `fechar()` para não poluir o DOM global.

### Overlay

- `position:fixed; inset:0; z-index:1000; background:#222` (fundo original do jogo)
- SVG do jogo inserido dentro do overlay, `width:100%; height:100%; position:absolute; top:0; left:0`
- Botão fechar `✕` no canto superior direito (padrão do projeto: 48×48px, bg rgba branco)
- ESC fecha o jogo

### Touch

O jogo original usa apenas `window.addEventListener("mousedown/mousemove/mouseup")`. Para touch:

- `touchstart` → dispara `mousedown` sintético com `clientX/Y` do primeiro toque
- `touchmove` → dispara `mousemove` sintético
- `touchend` → dispara `mouseup` sintético

Listeners adicionados ao `overlay` com `{ passive: false }` para permitir `preventDefault()`.

---

## Áudio (Web Audio API)

Sons sintetizados dentro da IIFE, sem arquivos externos. Cleanup no `fechar()`.

| Evento | Som | Implementação |
|---|---|---|
| Esticar o arco (durante aim()) | Chiado/tensão crescente | Oscillator `sawtooth`, freq sobe com a distância do pull |
| Soltar/disparo (loose()) | Whoosh curto | Noise buffer filtrado, decay rápido ~0.15s |
| Acerto no alvo (hitTest — hit) | Ding metálico | Oscillator `sine` 880Hz + harmônico, decay 0.3s |
| Bullseye (hitTest — loveyou) | Fanfarra curta | 3 notas ascendentes (523→659→784Hz) |
| Erro/miss (onMiss()) | Thud suave | Oscillator `triangle` freq baixa + decay |

Throttle no som de esticar: máximo 1 trigger a cada 80ms para não saturar.

---

## Hub

```javascript
{
    id: 'arco',
    nome: 'Arco',
    icon: 'sports',
    cor: 'linear-gradient(135deg, #1a3a1a, #2d7a2d)',
    abrir: function() { if (window.ArcoGame) window.ArcoGame.abrir(); },
    fechar: function() { if (window.ArcoGame) window.ArcoGame.fechar(); }
}
```

---

## SPARC

- **S (Security):** sem innerHTML com dados dinâmicos; scripts CDN injetados são URLs fixas hardcoded
- **P (Performance):** GSAP gerencia o loop de animação; sem requestAnimationFrame manual necessário
- **A (Architecture):** IIFE encapsulado; cleanup completo no fechar(); separação clara init/game/audio
- **R (Reliability):** Touch + mouse; ESC para sair; scripts CDN carregados com onload antes de iniciar jogo
- **C (Code Quality):** Código original do jogo preservado integralmente; wrappers mínimos ao redor

---

## Checklist de Entrega

- [ ] `jogos/arco.js` criado com IIFE + overlay + touch + áudio + cleanup
- [ ] Entrada adicionada em `JOGOS` (joguinhos-modal.js)
- [ ] `<script src="jogos/arco.js">` adicionado em `index.html`
- [ ] Verificar no browser: arco funciona, sons tocam, ESC fecha, sem leaks
