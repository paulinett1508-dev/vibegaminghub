# Controles — Padrao Landscape PSP

Documento de referencia do padrao de controles adotado pelos jogos que
usam overlay em tela cheia com layout horizontal estilo PSP.

## Contexto

Tres jogos do hub compartilham o mesmo esqueleto de controle:

- **SNES** (`jogos/snes.js`) — emulador via EmulatorJS
- **Donkey Kong** (`jogos/donkeykong.js`) — emulador Atari 7800 via EmulatorJS
- **Sonic** (`jogos/sonic.js`) — runner em canvas proprio

O padrao nasceu com o SNES apos um bug em que o uso de `transform: rotate(90deg)`
para simular landscape em celulares em portrait causava sobreposicao dos botoes
a cada `resize`/`orientationchange`. A solucao foi:

1. Bloquear a orientacao via **Screen Orientation API** quando possivel
2. Mostrar hint "Gire o celular" quando o lock nao for aceito
3. Abandonar a rotacao via CSS

## Layout PSP Landscape

```
┌────────────┬─────────────────────┬────────────┐
│            │                     │            │
│  painel    │   tela do jogo      │   painel   │
│  esquerdo  │   (canvas/iframe)   │   direito  │
│            │                     │            │
└────────────┴─────────────────────┴────────────┘
   130-140px         1fr               130-140px
```

- **Grid CSS** de 3 colunas (`gridTemplateColumns: '130px 1fr 140px'`)
- Pain\u00e9is com `flex-direction: column`, `gap`, `overflow: hidden`
- **Nunca usar** `justify-content: space-between` — causa empurra quando
  o conteudo ultrapassa o container em alturas apertadas
- Todo botao com `flex-shrink: 0` para nao encolher

### Conteudo por jogo

| Painel esquerdo | Central | Painel direito |
|---|---|---|
| **SNES:** L, D-pad, Analog, SELECT | iframe EmulatorJS | R, diamante ABXY, START |
| **DK:** D-pad, SELECT | iframe EmulatorJS | FIRE grande, PAUSE |
| **Sonic:** SPIN botao (fixed) | canvas fullscreen atras | JUMP botao (fixed) |

O Sonic nao usa grid — o canvas ocupa a tela inteira e os botoes sao
`position: fixed` na esquerda e direita.

## Screen Orientation API

```js
function tryLockLandscape() {
    if (orientationLocked) return;
    try {
        if (screen.orientation && typeof screen.orientation.lock === 'function') {
            var p = screen.orientation.lock('landscape');
            if (p && typeof p.then === 'function') {
                p.then(function () { orientationLocked = true; })
                 .catch(function () { /* fallback vira hint */ });
            }
        }
    } catch (e) { /* ignora */ }
}

function unlockOrientation() {
    try {
        if (screen.orientation && typeof screen.orientation.unlock === 'function') {
            screen.orientation.unlock();
        }
    } catch (e) { /* ignora */ }
    orientationLocked = false;
}
```

- `screen.orientation` e undefined no iOS Safari antigo — guardado com
  `typeof ... === 'function'`
- O lock so funciona em contexto fullscreen em muitos browsers; quando
  falha, o hint de rotacao cobre a tela

## Hint "Gire o celular"

Overlay `position: absolute; inset: 0` com fundo escuro, icone Material
`screen_rotation` e texto curto. `display: none` por padrao; alterna para
`flex` quando `innerHeight > innerWidth`.

```js
function updateRotateHint() {
    if (!rotateHintEl) return;
    rotateHintEl.style.display =
        (window.innerHeight > window.innerWidth) ? 'flex' : 'none';
}
```

Cor do icone varia por tema do jogo:
- SNES: `#a78bfa` (roxo)
- DK: `#fcd34d` (ambar)
- Sonic: `#F8B800` (laranja Sonic)

## Input nos emuladores (SNES e DK)

Via `EJS_emulator.gameManager.simulateInput(player, btnId, val)` dentro do
iframe. Mapeamento **RetroPad** usado pelos cores via RetroArch:

| btnId | Botao | SNES | Atari 7800 |
|---|---|---|---|
| 0 | B     | B    | Fire 2 |
| 1 | Y     | Y    | —      |
| 2 | SEL   | Select | Select |
| 3 | START | Start  | Pause  |
| 4 | Up    | Up    | Up     |
| 5 | Down  | Down  | Down   |
| 6 | Left  | Left  | Left   |
| 7 | Right | Right | Right  |
| 8 | A     | A    | Fire 1 |
| 9 | X     | X    | —      |
| 10 | L    | L    | —      |
| 11 | R    | R    | —      |

## Contador de pressoes (`_press` / `_release`)

Quando multiplas fontes podem ativar a mesma direcao (ex.: D-pad + analogico
no SNES), usar contador de refs por botao:

```js
var _pressCount = { 4: 0, 5: 0, 6: 0, 7: 0 };

function _press(id) {
    _pressCount[id] += 1;
    if (_pressCount[id] === 1) _sim(id, 1);
}
function _release(id) {
    if (_pressCount[id] <= 0) return;
    _pressCount[id] -= 1;
    if (_pressCount[id] === 0) _sim(id, 0);
}
```

Garante que soltar um controle nao libera uma direcao ainda segurada pelo
outro.

## Analogico virtual (SNES)

Container de 88px com handle de 36px arrastavel. `setPointerCapture` para
seguir o toque fora dos limites. Deadzone de **35% do raio** antes de
traduzir o offset em direcoes do D-pad.

```js
var RADIUS = 40;
var DEADZONE = 0.35;

// No pointermove (com captura ativa):
var t = RADIUS * DEADZONE;
updateDir(4, dy < -t);  // Up
updateDir(5, dy >  t);  // Down
updateDir(6, dx < -t);  // Left
updateDir(7, dx >  t);  // Right
```

`updateDir(id, on)` e edge-triggered: so chama `_press/_release` nas
transicoes on→off ou off→on.

## Cleanup obrigatorio no `fechar()`

Ordem canonica:

1. `removeEventListener('keydown')` — ESC
2. `removeEventListener('resize')` e `'orientationchange'`
3. `unlockOrientation()`
4. Remover overlay do DOM (inclui iframe, botoes, hint)
5. Zerar variaveis (`_iframe = null`, `_pressCount = {...}`)

Ausencia de qualquer passo causa vazamento de memoria ou listeners
fantasmas apos fechar o jogo.

## Eventos Pointer (nao touch)

Todos os botoes usam `pointerdown`/`pointerup`/`pointerleave`/`pointercancel`
em vez de `touchstart`/`touchend`. Isso:
- Unifica mouse + touch + stylus
- `pointerleave` garante release quando o dedo sai do botao sem soltar
- `pointercancel` trata interrupcao do sistema (chamada telefonica, etc.)

Sempre `e.preventDefault()` em pointerdown/pointerup para evitar zoom por
double-tap e seletor de texto. `touch-action: none` no CSS do container
remove comportamentos padrao.

## Checklist ao criar novo jogo com este padrao

- [ ] Overlay em `position: fixed; inset: 0`
- [ ] Grid 3-col ou canvas fullscreen + botoes laterais `position: fixed`
- [ ] `tryLockLandscape()` em `abrir()`, `unlockOrientation()` em `fechar()`
- [ ] Hint de rotacao com icone `screen_rotation` cor do tema
- [ ] Painel com `gap` + `overflow: hidden`, nunca `space-between`
- [ ] Botoes com `flex-shrink: 0`
- [ ] Pointer events (nao touch), `touch-action: none`
- [ ] `_press`/`_release` com contador se houver direcoes com multiplas fontes
- [ ] Cleanup completo em `fechar()` (listeners, orientation, DOM)
- [ ] Cache-bust do script no `index.html` (`?v=N`)
