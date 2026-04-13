# Portrait Layout Responsivo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar o hint "Gire o celular" e o orientation.lock frágil substituindo-os por um layout CSS responsivo que funciona em portrait E landscape sem depender de auto-rotate do OS.

**Architecture:** Cada arquivo de jogo recebe uma função `_applyLayout(isPortrait)` que, ao ser chamada no init e no resize/orientationchange, ajusta posições CSS — sem mover o iframe (evita reload do emulador) e sem chamar nenhuma API de orientação. Para snes.js e donkeykong.js: iframe ocupa `position:absolute; inset:0` em landscape (fullscreen atrás dos painéis laterais) e `height: calc(100% - 200px)` em portrait (com painel de controles fixo na base). Para sonic.js: canvas mantém fullscreen, botões são reposicionados para corners inferiores em portrait.

**Tech Stack:** Vanilla JS, CSS via JS (Object.assign style), DOM API, requestAnimationFrame (já existente).

---

## Mapeamento de Arquivos

| Arquivo | Mudança |
|---|---|
| `jogos/snes.js` | Remover `_tryLockLandscape`, `_exitFullscreen`, `_unlockOrientation`, `_updateRotateHint`, hint DOM. Adicionar `_buildLandscapeControls()`, `_buildPortraitControls()`, `_applyLayout()`. Refatorar `_launchEmulator()`. Adicionar `_landscapeControls`, `_portraitControls` como vars de módulo. |
| `jogos/donkeykong.js` | Mesma estrutura do snes.js mas com controles mais simples (D-pad + SELECT + FIRE + PAUSE, sem analog/diamond). |
| `jogos/sonic.js` | Remover `tryLockLandscape`, `exitFullscreen`, `unlockOrientation`, `updateRotateHint`, `createRotateHint`. Modificar `createSDBtn`/`createJumpBtn` para aceitar posição dinâmica. Adicionar `_applyLayout()`. |
| `index.html` | Cache-bust: snes?v=6, donkeykong?v=4, sonic?v=4. |

---

## Task 1: snes.js — Remover código de orientação

**Files:**
- Modify: `jogos/snes.js`

- [ ] **Step 1: Remover variáveis de módulo de orientação**

Em `jogos/snes.js`, remover estas linhas (aproximadamente linhas 24-25):
```javascript
// REMOVER:
var _rotateHint    = null;
var _orientationLocked = false;
```

- [ ] **Step 2: Remover funções de orientação/fullscreen**

Remover integralmente as funções `_tryLockLandscape` (linhas ~224-253), `_exitFullscreen` (linhas ~255-263), `_unlockOrientation` (linhas ~265-273), `_updateRotateHint` (linhas ~275-279).

- [ ] **Step 3: Remover hint DOM e chamadas de orientação de `_launchEmulator`**

Em `_launchEmulator`, remover:
- Bloco de criação do `_rotateHint` (linhas ~717-741)
- As 4 linhas ao final da função:
  ```javascript
  // REMOVER:
  _tryLockLandscape();
  _updateRotateHint();
  _resizeHandler = function () { _updateRotateHint(); };
  window.addEventListener('orientationchange', _resizeHandler);
  ```
  (O listener de `resize` será mantido mas apontará para `_applyLayout` — ver Task 2.)

- [ ] **Step 4: Limpar `fechar()` de referências de orientação**

Em `fechar()`, remover:
```javascript
// REMOVER:
_unlockOrientation();
// ...
_rotateHint = null;
```
Manter o bloco `_resizeHandler` (que será reutilizado em Task 2).

- [ ] **Step 5: Validar sintaxe**

```bash
node -c jogos/snes.js
```
Expected: sem output (sem erros).

---

## Task 2: snes.js — Adicionar layout responsivo portrait + landscape

**Files:**
- Modify: `jogos/snes.js`

- [ ] **Step 1: Adicionar variáveis de módulo para os dois painéis de controle**

Após a linha `var _pressCount = { 4: 0, 5: 0, 6: 0, 7: 0 };`, adicionar:
```javascript
var _landscapeControls = null;
var _portraitControls  = null;
```

- [ ] **Step 2: Modificar `_makeShoulderBtn` para aceitar largura opcional**

Substituir a linha `width: '100%',` dentro de `_makeShoulderBtn` pela lógica com parâmetro:

```javascript
// Assinatura antiga:
function _makeShoulderBtn(text, btnId) {

// Assinatura nova:
function _makeShoulderBtn(text, btnId, width) {
    var btn = document.createElement('button');
    btn.textContent = text;
    Object.assign(btn.style, {
        width: width || '100%',   // ← aceita largura explícita
        height: '32px',
        // ... resto igual ...
    });
```

- [ ] **Step 3: Adicionar `_buildLandscapeControls()`**

Inserir após `_makeDiamond()`, antes de `_launchEmulator()`:

```javascript
// Painéis laterais para landscape (sobrepostos sobre o iframe fullscreen)
function _buildLandscapeControls() {
    var lc = document.createElement('div');
    Object.assign(lc.style, {
        position: 'absolute',
        top: '0', left: '0', right: '0', bottom: '0',
        display: 'none',                        // _applyLayout ativa
        gridTemplateColumns: '130px 1fr 130px',
        alignItems: 'center',
        pointerEvents: 'none',                  // centro passa toque pro iframe
        zIndex: '10',
    });

    var leftPanel = document.createElement('div');
    Object.assign(leftPanel.style, {
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '8px', height: '100%', padding: '10px 8px',
        background: 'rgba(17,17,17,0.92)',
        pointerEvents: 'all', overflow: 'hidden',
    });
    leftPanel.appendChild(_makeShoulderBtn('L', 10));
    leftPanel.appendChild(_makeDpad());
    leftPanel.appendChild(_makeAnalog());
    leftPanel.appendChild(_makeSmallBtn('SELECT', 2));

    var centerSpacer = document.createElement('div'); // transparente, pass-through

    var rightPanel = document.createElement('div');
    Object.assign(rightPanel.style, {
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '10px', height: '100%', padding: '10px 8px',
        background: 'rgba(17,17,17,0.92)',
        pointerEvents: 'all', overflow: 'hidden',
    });
    rightPanel.appendChild(_makeShoulderBtn('R', 11));
    rightPanel.appendChild(_makeDiamond());
    rightPanel.appendChild(_makeSmallBtn('START', 3));

    lc.appendChild(leftPanel);
    lc.appendChild(centerSpacer);
    lc.appendChild(rightPanel);
    return lc;
}
```

- [ ] **Step 4: Adicionar `_buildPortraitControls()`**

```javascript
// Painel inferior para portrait (controles numa faixa na base)
function _buildPortraitControls() {
    var pc = document.createElement('div');
    Object.assign(pc.style, {
        position: 'absolute',
        left: '0', right: '0', bottom: '0',
        height: '200px',
        background: 'rgba(15,23,42,0.97)',
        display: 'none',                        // _applyLayout ativa
        flexDirection: 'column',
        padding: '8px 16px',
        gap: '8px',
        overflow: 'hidden',
        zIndex: '10',
    });

    // Linha 1: ombros + SELECT/START
    var row1 = document.createElement('div');
    Object.assign(row1.style, {
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: '0',
        gap: '8px',
    });
    row1.appendChild(_makeShoulderBtn('L', 10, '80px'));
    row1.appendChild(_makeSmallBtn('SELECT', 2));
    row1.appendChild(_makeSmallBtn('START', 3));
    row1.appendChild(_makeShoulderBtn('R', 11, '80px'));

    // Linha 2: D-pad + Analog + Diamond
    var row2 = document.createElement('div');
    Object.assign(row2.style, {
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-around',
        flex: '1',
    });
    row2.appendChild(_makeDpad());
    row2.appendChild(_makeAnalog());
    row2.appendChild(_makeDiamond());

    pc.appendChild(row1);
    pc.appendChild(row2);
    return pc;
}
```

- [ ] **Step 5: Adicionar `_applyLayout()`**

```javascript
function _applyLayout() {
    if (!_iframe || !_landscapeControls || !_portraitControls) return;
    var portrait = window.innerHeight > window.innerWidth;

    // Iframe: fullscreen em landscape, topo sem controles em portrait
    if (portrait) {
        Object.assign(_iframe.style, {
            position: 'absolute',
            top: '0', left: '0', right: '0', bottom: 'auto',
            width: '100%', height: 'calc(100% - 200px)',
        });
    } else {
        Object.assign(_iframe.style, {
            position: 'absolute',
            top: '0', left: '0', right: '0', bottom: '0',
            width: '100%', height: '100%',
        });
    }

    _landscapeControls.style.display = portrait ? 'none' : 'grid';
    _portraitControls.style.display  = portrait ? 'flex' : 'none';
}
```

- [ ] **Step 6: Refatorar `_launchEmulator()` para usar o novo layout**

Substituir o bloco `_overlay` + PSP grid + hint pelo seguinte:

```javascript
function _launchEmulator(romUrl) {
    var absRom = new URL(romUrl, window.location.href).href;

    _overlay = document.createElement('div');
    _overlay.id = 'snes-overlay';
    Object.assign(_overlay.style, {
        position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
        background: '#111', zIndex: '9000',
        overflow: 'hidden',
        WebkitTapHighlightColor: 'transparent',
    });

    // Iframe fullscreen (posição ajustada por _applyLayout)
    _iframe = document.createElement('iframe');
    Object.assign(_iframe.style, { border: 'none', display: 'block' });
    _iframe.setAttribute('allowfullscreen', '');
    _iframe.setAttribute('allow', 'autoplay; gamepad *');

    var ejsButtons = JSON.stringify({
        playPause: false, restart: false, mute: false, settings: false,
        fullscreen: false, saveState: false, loadState: false,
        screenRecord: false, gamepad: false, cheat: false,
        volume: false, netplay: false,
        saveSavFiles: false, loadSavFiles: false, quickSave: false,
        quickLoad: false, screenshot: false, cacheManager: false,
        exitEmulation: false,
    });

    _iframe.srcdoc = [
        '<!DOCTYPE html><html><head>',
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width,initial-scale=1">',
        '<style>',
        '*{margin:0;padding:0;box-sizing:border-box}',
        'body{background:#000;width:100%;height:100vh;overflow:hidden;display:flex;align-items:center;justify-content:center}',
        '#ejs-game{width:100%;height:100vh}',
        '.ejs_menu_bar,.ejs-menu,.ejs_virtualGamepad_parent{display:none!important}',
        'canvas{display:block!important;margin:0 auto!important}',
        '</style></head><body>',
        '<div id="ejs-game"></div>',
        '<script>',
        'window.EJS_player="#ejs-game";',
        'window.EJS_core="snes9x";',
        'window.EJS_gameUrl=' + JSON.stringify(absRom) + ';',
        'window.EJS_pathtodata=' + JSON.stringify(EJS_CDN) + ';',
        'window.EJS_color="#7c3aed";',
        'window.EJS_startOnLoaded=true;',
        'window.EJS_VirtualGamepadSettings=[];',
        'window.EJS_Buttons=' + ejsButtons + ';',
        'window.EJS_onGameStart=function(){var c=document.querySelector("canvas");if(c){c.setAttribute("tabindex","0");c.focus();}};',
        '<\/script>',
        '<script src="' + EJS_CDN + 'loader.js"><\/script>',
        '</body></html>',
    ].join('');

    // Botão fechar (sempre visível, z-index acima dos painéis)
    var exitBtn = document.createElement('button');
    var exitIcon = document.createElement('span');
    exitIcon.className = 'material-icons';
    exitIcon.textContent = 'close';
    exitIcon.style.fontSize = '16px';
    exitIcon.style.pointerEvents = 'none';
    exitBtn.appendChild(exitIcon);
    Object.assign(exitBtn.style, {
        position: 'absolute', top: '8px', right: '8px', zIndex: '30',
        width: '36px', height: '36px', borderRadius: '50%',
        background: 'rgba(0,0,0,0.65)',
        border: '1px solid rgba(255,255,255,0.3)',
        color: '#f1f5f9', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
    });
    exitBtn.addEventListener('click', function () {
        window.fecharJoguinhos ? window.fecharJoguinhos() : window.SNESGame.fechar();
    });

    // Painéis de controle (portrait e landscape)
    _landscapeControls = _buildLandscapeControls();
    _portraitControls  = _buildPortraitControls();

    _overlay.appendChild(_iframe);
    _overlay.appendChild(exitBtn);
    _overlay.appendChild(_landscapeControls);
    _overlay.appendChild(_portraitControls);
    document.body.appendChild(_overlay);

    // Layout inicial + listener de resize
    _applyLayout();
    _resizeHandler = function () { _applyLayout(); };
    window.addEventListener('resize', _resizeHandler);
    window.addEventListener('orientationchange', _resizeHandler);

    _onKey = function (e) {
        if (e.key === 'Escape') {
            window.fecharJoguinhos ? window.fecharJoguinhos() : window.SNESGame.fechar();
        }
    };
    document.addEventListener('keydown', _onKey);
}
```

- [ ] **Step 7: Atualizar `fechar()` para limpar novas variáveis**

```javascript
fechar: function () {
    if (_onKey)         { document.removeEventListener('keydown', _onKey); _onKey = null; }
    if (_resizeHandler) {
        window.removeEventListener('resize', _resizeHandler);
        window.removeEventListener('orientationchange', _resizeHandler);
        _resizeHandler = null;
    }
    if (_overlay) { _overlay.remove(); _overlay = null; }
    _landscapeControls = null;
    _portraitControls  = null;
    _iframe = null;
    _pressCount = { 4: 0, 5: 0, 6: 0, 7: 0 };
},
```

- [ ] **Step 8: Validar sintaxe**

```bash
node -c jogos/snes.js
```
Expected: sem output.

---

## Task 3: donkeykong.js — Portrait + landscape responsivo

**Files:**
- Modify: `jogos/donkeykong.js`

- [ ] **Step 1: Adicionar variáveis de módulo**

Após `var _pressCount = { 4: 0, 5: 0, 6: 0, 7: 0 };`, adicionar:
```javascript
var _landscapeControls = null;
var _portraitControls  = null;
```

- [ ] **Step 2: Remover variáveis de orientação**

Remover:
```javascript
// REMOVER:
var _rotateHint    = null;
var _orientationLocked = false;
```

- [ ] **Step 3: Remover funções de orientação**

Remover completamente: `_tryLockLandscape()`, `_exitFullscreen()`, `_unlockOrientation()`, `_updateRotateHint()`.

- [ ] **Step 4: Adicionar `_makeShoulderBtn` para DK**

DK não tem `_makeShoulderBtn`. Adicionar antes de `_criarOverlay()`:

```javascript
function _makeShoulderBtn(text, btnId, width) {
    var btn = document.createElement('button');
    btn.textContent = text;
    Object.assign(btn.style, {
        width: width || '100%',
        height: '32px',
        borderRadius: '6px',
        border: '2px solid rgba(255,200,100,0.2)',
        background: 'rgba(50,40,20,0.9)',
        color: '#fcd34d',
        fontSize: '13px',
        fontFamily: "'Russo One', sans-serif",
        cursor: 'pointer',
        touchAction: 'none',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        flexShrink: '0',
    });
    btn.addEventListener('pointerdown',   function (e) { e.preventDefault(); _sim(btnId, 1); btn.style.background = 'rgba(120,90,30,0.9)'; });
    btn.addEventListener('pointerup',     function (e) { e.preventDefault(); _sim(btnId, 0); btn.style.background = 'rgba(50,40,20,0.9)'; });
    btn.addEventListener('pointerleave',  function ()  { _sim(btnId, 0); btn.style.background = 'rgba(50,40,20,0.9)'; });
    btn.addEventListener('pointercancel', function ()  { _sim(btnId, 0); btn.style.background = 'rgba(50,40,20,0.9)'; });
    return btn;
}
```

- [ ] **Step 5: Adicionar `_buildLandscapeControls()` para DK**

```javascript
function _buildLandscapeControls() {
    var lc = document.createElement('div');
    Object.assign(lc.style, {
        position: 'absolute',
        top: '0', left: '0', right: '0', bottom: '0',
        display: 'none',
        gridTemplateColumns: '130px 1fr 140px',
        alignItems: 'center',
        pointerEvents: 'none',
        zIndex: '10',
    });

    var leftPanel = document.createElement('div');
    Object.assign(leftPanel.style, {
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '10px', height: '100%', padding: '10px 8px',
        background: 'rgba(17,17,17,0.92)',
        pointerEvents: 'all', overflow: 'hidden',
    });
    leftPanel.appendChild(_makeDpad());
    leftPanel.appendChild(_makeSmallBtn('SELECT', 2));

    var centerSpacer = document.createElement('div');

    var rightPanel = document.createElement('div');
    Object.assign(rightPanel.style, {
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: '14px', height: '100%', padding: '10px 8px',
        background: 'rgba(17,17,17,0.92)',
        pointerEvents: 'all', overflow: 'hidden',
    });
    rightPanel.appendChild(_makeFireBtn());
    rightPanel.appendChild(_makeSmallBtn('PAUSE', 3));

    lc.appendChild(leftPanel);
    lc.appendChild(centerSpacer);
    lc.appendChild(rightPanel);
    return lc;
}
```

- [ ] **Step 6: Adicionar `_buildPortraitControls()` para DK**

```javascript
function _buildPortraitControls() {
    var pc = document.createElement('div');
    Object.assign(pc.style, {
        position: 'absolute',
        left: '0', right: '0', bottom: '0',
        height: '200px',
        background: 'rgba(15,23,42,0.97)',
        display: 'none',
        flexDirection: 'column',
        padding: '8px 16px',
        gap: '8px',
        overflow: 'hidden',
        zIndex: '10',
    });

    // Linha 1: SELECT e PAUSE
    var row1 = document.createElement('div');
    Object.assign(row1.style, {
        display: 'flex', alignItems: 'center',
        justifyContent: 'center',
        gap: '24px', flexShrink: '0',
    });
    row1.appendChild(_makeSmallBtn('SELECT', 2));
    row1.appendChild(_makeSmallBtn('PAUSE', 3));

    // Linha 2: D-pad + FIRE
    var row2 = document.createElement('div');
    Object.assign(row2.style, {
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-around',
        flex: '1',
    });
    row2.appendChild(_makeDpad());
    row2.appendChild(_makeFireBtn());

    pc.appendChild(row1);
    pc.appendChild(row2);
    return pc;
}
```

- [ ] **Step 7: Adicionar `_applyLayout()` para DK**

```javascript
function _applyLayout() {
    if (!_iframe || !_landscapeControls || !_portraitControls) return;
    var portrait = window.innerHeight > window.innerWidth;

    if (portrait) {
        Object.assign(_iframe.style, {
            position: 'absolute',
            top: '0', left: '0', right: '0', bottom: 'auto',
            width: '100%', height: 'calc(100% - 200px)',
        });
    } else {
        Object.assign(_iframe.style, {
            position: 'absolute',
            top: '0', left: '0', right: '0', bottom: '0',
            width: '100%', height: '100%',
        });
    }

    _landscapeControls.style.display = portrait ? 'none' : 'grid';
    _portraitControls.style.display  = portrait ? 'flex' : 'none';
}
```

- [ ] **Step 8: Refatorar `_criarOverlay()`**

Substituir o conteúdo de `_criarOverlay()` pelo novo padrão:

```javascript
function _criarOverlay() {
    var absRom = new URL(
        ROM.split('/').map(encodeURIComponent).join('/'),
        window.location.href
    ).href;

    _overlay = document.createElement('div');
    _overlay.id = 'donkeykong-overlay';
    Object.assign(_overlay.style, {
        position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
        background: '#111', zIndex: '9000',
        overflow: 'hidden',
        WebkitTapHighlightColor: 'transparent',
    });

    _iframe = document.createElement('iframe');
    Object.assign(_iframe.style, { border: 'none', display: 'block' });
    _iframe.setAttribute('allowfullscreen', '');
    _iframe.setAttribute('allow', 'autoplay; gamepad *');

    var ejsButtons = JSON.stringify({
        playPause: false, restart: false, mute: false, settings: false,
        fullscreen: false, saveState: false, loadState: false,
        screenRecord: false, gamepad: false, cheat: false,
        volume: false, netplay: false,
        saveSavFiles: false, loadSavFiles: false, quickSave: false,
        quickLoad: false, screenshot: false, cacheManager: false,
        exitEmulation: false,
    });

    _iframe.srcdoc = [
        '<!DOCTYPE html><html><head>',
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width,initial-scale=1">',
        '<style>',
        '*{margin:0;padding:0;box-sizing:border-box}',
        'body{background:#000;width:100%;height:100vh;overflow:hidden;display:flex;align-items:center;justify-content:center}',
        '#ejs-game{width:100%;height:100vh}',
        '.ejs_menu_bar,.ejs-menu,.ejs_virtualGamepad_parent{display:none!important}',
        'canvas{display:block!important;margin:0 auto!important}',
        '</style></head><body>',
        '<div id="ejs-game"></div>',
        '<script>',
        'window.EJS_player="#ejs-game";',
        'window.EJS_core="prosystem";',
        'window.EJS_gameUrl=' + JSON.stringify(absRom) + ';',
        'window.EJS_pathtodata=' + JSON.stringify(EJS_CDN) + ';',
        'window.EJS_color="#f59e0b";',
        'window.EJS_startOnLoaded=true;',
        'window.EJS_VirtualGamepadSettings=[];',
        'window.EJS_Buttons=' + ejsButtons + ';',
        'window.EJS_onGameStart=function(){var c=document.querySelector("canvas");if(c){c.setAttribute("tabindex","0");c.focus();}};',
        '<\/script>',
        '<script src="' + EJS_CDN + 'loader.js"><\/script>',
        '</body></html>',
    ].join('');

    var exitBtn = document.createElement('button');
    var exitIcon = document.createElement('span');
    exitIcon.className = 'material-icons';
    exitIcon.textContent = 'close';
    exitIcon.style.fontSize = '16px';
    exitIcon.style.pointerEvents = 'none';
    exitBtn.appendChild(exitIcon);
    Object.assign(exitBtn.style, {
        position: 'absolute', top: '8px', right: '8px', zIndex: '30',
        width: '36px', height: '36px', borderRadius: '50%',
        background: 'rgba(0,0,0,0.65)',
        border: '1px solid rgba(255,255,255,0.3)',
        color: '#f1f5f9', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
    });
    exitBtn.addEventListener('click', function () {
        window.fecharJoguinhos ? window.fecharJoguinhos() : window.DonkeyKongGame.fechar();
    });

    _landscapeControls = _buildLandscapeControls();
    _portraitControls  = _buildPortraitControls();

    _overlay.appendChild(_iframe);
    _overlay.appendChild(exitBtn);
    _overlay.appendChild(_landscapeControls);
    _overlay.appendChild(_portraitControls);
    document.body.appendChild(_overlay);

    _applyLayout();
    _resizeHandler = function () { _applyLayout(); };
    window.addEventListener('resize', _resizeHandler);
    window.addEventListener('orientationchange', _resizeHandler);

    _onKey = function (e) {
        if (e.key === 'Escape') {
            window.fecharJoguinhos ? window.fecharJoguinhos() : window.DonkeyKongGame.fechar();
        }
    };
    document.addEventListener('keydown', _onKey);
}
```

- [ ] **Step 9: Atualizar `fechar()` para DK**

```javascript
fechar: function () {
    if (_onKey) { document.removeEventListener('keydown', _onKey); _onKey = null; }
    if (_resizeHandler) {
        window.removeEventListener('resize', _resizeHandler);
        window.removeEventListener('orientationchange', _resizeHandler);
        _resizeHandler = null;
    }
    if (_overlay) { _overlay.remove(); _overlay = null; }
    _landscapeControls = null;
    _portraitControls  = null;
    _iframe = null;
    _pressCount = { 4: 0, 5: 0, 6: 0, 7: 0 };
},
```

- [ ] **Step 10: Validar sintaxe**

```bash
node -c jogos/donkeykong.js
```
Expected: sem output.

---

## Task 4: sonic.js — Remover orientação + reposicionar botões em portrait

**Files:**
- Modify: `jogos/sonic.js`

- [ ] **Step 1: Remover variáveis de orientação**

Remover (aprox. linhas 397-399):
```javascript
// REMOVER:
var rotateHintEl = null;
var orientationLocked = false;
```

- [ ] **Step 2: Remover funções de orientação**

Remover completamente: `tryLockLandscape()`, `exitFullscreen()`, `unlockOrientation()`, `updateRotateHint()` (aprox. linhas 404-454).

- [ ] **Step 3: Remover `createRotateHint()` e suas chamadas**

Remover a função `createRotateHint()` (aprox. linhas 1038-1043).

Remover chamadas em `abrir()`:
```javascript
// REMOVER:
createRotateHint();
tryLockLandscape();
updateRotateHint();
```

- [ ] **Step 4: Remover limpeza de `rotateHintEl` em `removeInput()`**

Em `removeInput()`, remover:
```javascript
// REMOVER:
if(rotateHintEl){rotateHintEl.remove();rotateHintEl=null;}
```

- [ ] **Step 5: Remover chamada a `unlockOrientation()` em `fechar()`**

```javascript
// REMOVER de fechar():
unlockOrientation();
```

- [ ] **Step 6: Adicionar função `_applyLayout` para Sonic**

Inserir após `updateRotateHint` (que foi removida — inserir no mesmo local, antes de `initState`):

```javascript
function applyLayout() {
    var portrait = window.innerHeight > window.innerWidth;
    if (sdBtnEl) {
        if (portrait) {
            sdBtnEl.style.top = 'auto';
            sdBtnEl.style.bottom = '40px';
            sdBtnEl.style.transform = '';
        } else {
            sdBtnEl.style.top = '50%';
            sdBtnEl.style.bottom = 'auto';
            sdBtnEl.style.transform = 'translateY(-50%)';
        }
    }
    if (jumpBtnEl) {
        if (portrait) {
            jumpBtnEl.style.top = 'auto';
            jumpBtnEl.style.bottom = '30px';
            jumpBtnEl.style.transform = '';
        } else {
            jumpBtnEl.style.top = '50%';
            jumpBtnEl.style.bottom = 'auto';
            jumpBtnEl.style.transform = 'translateY(-50%)';
        }
    }
}
```

- [ ] **Step 7: Substituir `_rh` resize listener para chamar `applyLayout`**

Em `abrir()`, após `createJumpBtn()`, adicionar:
```javascript
applyLayout();
_rh = function () { applyLayout(); };
window.addEventListener('resize', _rh);
window.addEventListener('orientationchange', _rh);
```

(Verificar se `_rh` já é definido em outro lugar e remover duplicatas.)

- [ ] **Step 8: Validar sintaxe**

```bash
node -c jogos/sonic.js
```
Expected: sem output.

---

## Task 5: index.html — Cache-bust

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Bump versões dos scripts**

Localizar (aprox. linhas 459-462):
```html
<script src="jogos/sonic.js?v=3"></script>
<script src="jogos/donkeykong.js?v=3"></script>
<script src="jogos/snes.js?v=5"></script>
```

Substituir por:
```html
<script src="jogos/sonic.js?v=4"></script>
<script src="jogos/donkeykong.js?v=4"></script>
<script src="jogos/snes.js?v=6"></script>
```

---

## Task 6: Commit e push

- [ ] **Step 1: Validar sintaxe de todos os arquivos**

```bash
node -c jogos/snes.js && node -c jogos/donkeykong.js && node -c jogos/sonic.js
```
Expected: sem output.

- [ ] **Step 2: Commit**

```bash
git add jogos/snes.js jogos/donkeykong.js jogos/sonic.js index.html
git commit -m "feat(controles): layout responsivo portrait+landscape sem orientation.lock

Remove hint 'Gire o celular' e orientation.lock frágil. Em portrait:
SNES/DK — iframe fullscreen, painel de controles fixo na base (200px).
Sonic — canvas fullscreen, botões SPIN/JUMP reposicionados para corners inferiores.
Em landscape: mantém layout PSP com painéis laterais sobrepostos."
```

- [ ] **Step 3: Push**

```bash
git push origin main
```
Expected: Vercel rebuild automático.

---

## Self-Review

**Spec coverage:**
- [x] Remover orientation.lock + requestFullscreen dos 3 arquivos → Tasks 1, 3, 4
- [x] Remover hint "Gire o celular" dos 3 arquivos → Tasks 1, 3, 4
- [x] Portrait: jogo em cima, controles embaixo (SNES/DK) → Tasks 2, 3
- [x] Landscape: layout PSP atual mantido → Tasks 2, 3
- [x] Sonic: botões reposicionados em portrait → Task 4
- [x] Manter cleanup em `fechar()` → Tasks 2, 3
- [x] Cache-bust → Task 5

**Placeholder scan:** Nenhum TBD, TODO ou placeholder encontrado.

**Type consistency:**
- `_landscapeControls` / `_portraitControls` usados de forma consistente em Task 2 e 3.
- `_makeShoulderBtn(text, btnId, width)` — novo parâmetro `width` adicionado em Task 2 Step 2 e usado em Steps 3-4.
- `applyLayout()` (sem underscore) em sonic.js — consistente com o estilo do arquivo (que usa `tryLockLandscape` sem underscore).
