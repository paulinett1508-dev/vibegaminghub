// =====================================================================
// snes.js — Emulador SNES via EmulatorJS (CDN)
// =====================================================================
// Core: snes9x (RetroArch/WASM) carregado via CDN EmulatorJS.
// ROMs: listadas em /roms/snes/index.json
//
// Fluxo: abrir() → picker de ROMs → selecionar → iframe com EmulatorJS
//
// Gamepad: D-pad + B/A/Y/X (diamante) + Start + Select + L + R + Analogico
//
// Layout responsivo: portrait → iframe no topo + painel controles na base
//                   landscape → iframe fullscreen + paineis laterais sobrepostos
// =====================================================================

(function () {
    'use strict';

    var EJS_CDN  = 'https://cdn.emulatorjs.org/stable/data/';
    var ROM_BASE = 'roms/snes/';

    var _overlay           = null;
    var _onKey             = null;
    var _iframe            = null;
    var _resizeHandler     = null;
    var _landscapeControls = null;
    var _portraitControls  = null;

    // Contador de refs por direcao — D-pad e analogico podem
    // pressionar a mesma direcao; so soltamos quando todos liberarem
    var _pressCount = { 4: 0, 5: 0, 6: 0, 7: 0 };

    // ---- ROM Picker ----

    function _criarPicker() {
        _overlay = document.createElement('div');
        _overlay.id = 'snes-overlay';
        Object.assign(_overlay.style, {
            position: 'fixed', inset: '0',
            background: '#0f172a', zIndex: '9000',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center',
            overflowY: 'auto',
            WebkitTapHighlightColor: 'transparent',
        });

        // Header
        var header = document.createElement('div');
        Object.assign(header.style, {
            width: '100%', maxWidth: '600px',
            padding: '24px 16px 8px',
            display: 'flex', alignItems: 'center', gap: '12px',
        });

        var backBtn = document.createElement('button');
        backBtn.setAttribute('aria-label', 'Voltar');
        var backIcon = document.createElement('span');
        backIcon.className = 'material-icons';
        backIcon.textContent = 'arrow_back';
        backIcon.style.cssText = 'font-size:24px;pointer-events:none;';
        backBtn.appendChild(backIcon);
        Object.assign(backBtn.style, {
            background: 'none', border: 'none', color: '#f1f5f9',
            cursor: 'pointer', padding: '8px',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            minWidth: '44px', minHeight: '44px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        });
        backBtn.addEventListener('click', function () { history.back(); });

        var title = document.createElement('h2');
        title.textContent = 'Super Nintendo';
        Object.assign(title.style, {
            fontFamily: "'Russo One', sans-serif",
            fontSize: '1.4rem', color: '#f1f5f9', margin: '0',
        });

        header.appendChild(backBtn);
        header.appendChild(title);
        _overlay.appendChild(header);

        // Grid container
        var grid = document.createElement('div');
        grid.id = 'snes-grid';
        Object.assign(grid.style, {
            width: '100%', maxWidth: '600px',
            padding: '8px 16px 32px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '14px',
        });
        _overlay.appendChild(grid);

        // Loading indicator
        var loading = document.createElement('div');
        loading.textContent = 'Carregando...';
        Object.assign(loading.style, {
            color: '#94a3b8', fontFamily: "'Inter', sans-serif",
            fontSize: '0.9rem', padding: '32px', textAlign: 'center',
        });
        grid.appendChild(loading);

        document.body.appendChild(_overlay);

        // Fetch ROM list — no-cache garante que novas ROMs aparecam
        // mesmo se o browser tiver uma listagem antiga em cache
        fetch(ROM_BASE + 'index.json?t=' + Date.now(), { cache: 'no-cache' })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                grid.innerHTML = '';
                if (!data.jogos || data.jogos.length === 0) {
                    var empty = document.createElement('div');
                    empty.textContent = 'Nenhuma ROM encontrada';
                    Object.assign(empty.style, {
                        color: '#64748b', fontFamily: "'Inter', sans-serif",
                        fontSize: '0.9rem', padding: '32px', textAlign: 'center',
                        gridColumn: '1 / -1',
                    });
                    grid.appendChild(empty);
                    return;
                }

                data.jogos.forEach(function (jogo) {
                    var card = document.createElement('button');
                    Object.assign(card.style, {
                        background: 'linear-gradient(145deg, #312e81, #4c1d95)',
                        border: '1px solid rgba(139,92,246,0.3)',
                        borderRadius: '16px',
                        padding: '20px 12px',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: '10px',
                        cursor: 'pointer',
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                        minHeight: '100px',
                    });

                    var icon = document.createElement('span');
                    icon.className = 'material-icons';
                    icon.textContent = jogo.icone || 'sports_esports';
                    Object.assign(icon.style, {
                        fontSize: '36px', color: '#c4b5fd', pointerEvents: 'none',
                    });

                    var nome = document.createElement('span');
                    nome.textContent = jogo.nome;
                    Object.assign(nome.style, {
                        fontFamily: "'Russo One', sans-serif",
                        fontSize: '0.8rem', color: '#e2e8f0',
                        textAlign: 'center', lineHeight: '1.2',
                        pointerEvents: 'none',
                    });

                    card.appendChild(icon);
                    card.appendChild(nome);

                    card.addEventListener('pointerdown', function () {
                        card.style.transform = 'scale(0.95)';
                    });
                    card.addEventListener('pointerup', function () {
                        card.style.transform = '';
                    });
                    card.addEventListener('pointerleave', function () {
                        card.style.transform = '';
                    });

                    card.addEventListener('click', function () {
                        var romUrl = ROM_BASE + jogo.arquivo;
                        _destroyPicker();
                        _launchEmulator(romUrl);
                    });

                    grid.appendChild(card);
                });
            })
            .catch(function () {
                grid.innerHTML = '';
                var err = document.createElement('div');
                err.textContent = 'Erro ao carregar ROMs';
                Object.assign(err.style, {
                    color: '#ef4444', fontFamily: "'Inter', sans-serif",
                    fontSize: '0.9rem', padding: '32px', textAlign: 'center',
                    gridColumn: '1 / -1',
                });
                grid.appendChild(err);
            });

        // ESC to go back
        _onKey = function (e) {
            if (e.key === 'Escape') history.back();
        };
        document.addEventListener('keydown', _onKey);
    }

    function _destroyPicker() {
        if (_onKey)   { document.removeEventListener('keydown', _onKey); _onKey = null; }
        if (_overlay) { _overlay.remove(); _overlay = null; }
    }

    // ---- Emulador ----

    // Envia input para o emulador dentro do iframe (mesmo dominio via srcdoc)
    // Mapeamento RetroArch snes9x: B=0 Y=1 Sel=2 Sta=3 Up=4 Dn=5 Lt=6 Rt=7 A=8 X=9 L=10 R=11
    function _sim(btnId, val) {
        if (!_iframe) return;
        var iw = _iframe.contentWindow;
        if (iw && iw.EJS_emulator && iw.EJS_emulator.gameManager) {
            iw.EJS_emulator.gameManager.simulateInput(0, btnId, val);
        }
    }

    // Press/release com contador: multiplas fontes (D-pad + analogico)
    // podem ativar a mesma direcao sem conflito
    function _press(id) {
        if (!(id in _pressCount)) { _sim(id, 1); return; }
        _pressCount[id] += 1;
        if (_pressCount[id] === 1) _sim(id, 1);
    }
    function _release(id) {
        if (!(id in _pressCount)) { _sim(id, 0); return; }
        if (_pressCount[id] <= 0) return;
        _pressCount[id] -= 1;
        if (_pressCount[id] === 0) _sim(id, 0);
    }

    // ---- Widgets de controle ----

    // Cria botao circular colorido (usado nos botoes YXAB)
    function _makeBtn(text, color, size, onDown, onUp) {
        var btn = document.createElement('button');
        btn.textContent = text;
        Object.assign(btn.style, {
            width: size + 'px',
            height: size + 'px',
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.25)',
            background: color,
            color: '#fff',
            fontSize: Math.round(size * 0.32) + 'px',
            fontFamily: "'Russo One', sans-serif",
            fontWeight: 'bold',
            cursor: 'pointer',
            touchAction: 'none',
            WebkitTapHighlightColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            flexShrink: '0',
            boxShadow: '0 3px 8px rgba(0,0,0,0.5)',
        });
        btn.addEventListener('pointerdown',   function (e) { e.preventDefault(); onDown(); btn.style.opacity = '0.7'; btn.style.transform = 'scale(0.9)'; });
        btn.addEventListener('pointerup',     function (e) { e.preventDefault(); onUp();   btn.style.opacity = '';    btn.style.transform = ''; });
        btn.addEventListener('pointerleave',  function ()  { onUp();   btn.style.opacity = '';    btn.style.transform = ''; });
        btn.addEventListener('pointercancel', function ()  { onUp();   btn.style.opacity = '';    btn.style.transform = ''; });
        return btn;
    }

    // Botao de ombro (L / R) — retangular; width aceita valor explicito ou '100%'
    function _makeShoulderBtn(text, btnId, width) {
        var btn = document.createElement('button');
        btn.textContent = text;
        Object.assign(btn.style, {
            width: width || '100%',
            height: '32px',
            borderRadius: '6px',
            border: '2px solid rgba(255,255,255,0.2)',
            background: 'rgba(50,50,70,0.9)',
            color: '#ccc',
            fontSize: '13px',
            fontFamily: "'Russo One', sans-serif",
            cursor: 'pointer',
            touchAction: 'none',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            flexShrink: '0',
        });
        btn.addEventListener('pointerdown',   function (e) { e.preventDefault(); _sim(btnId, 1); btn.style.background = 'rgba(100,100,150,0.9)'; });
        btn.addEventListener('pointerup',     function (e) { e.preventDefault(); _sim(btnId, 0); btn.style.background = 'rgba(50,50,70,0.9)'; });
        btn.addEventListener('pointerleave',  function ()  { _sim(btnId, 0); btn.style.background = 'rgba(50,50,70,0.9)'; });
        btn.addEventListener('pointercancel', function ()  { _sim(btnId, 0); btn.style.background = 'rgba(50,50,70,0.9)'; });
        return btn;
    }

    // Botao pequeno em pilula (SELECT / START)
    function _makeSmallBtn(text, btnId) {
        var btn = document.createElement('button');
        btn.textContent = text;
        Object.assign(btn.style, {
            width: '64px',
            height: '22px',
            borderRadius: '11px',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(50,50,70,0.85)',
            color: '#aaa',
            fontSize: '9px',
            fontFamily: "'Russo One', sans-serif",
            letterSpacing: '1px',
            cursor: 'pointer',
            touchAction: 'none',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            flexShrink: '0',
        });
        btn.addEventListener('pointerdown',   function (e) { e.preventDefault(); _sim(btnId, 1); btn.style.background = 'rgba(100,100,150,0.85)'; });
        btn.addEventListener('pointerup',     function (e) { e.preventDefault(); _sim(btnId, 0); btn.style.background = 'rgba(50,50,70,0.85)'; });
        btn.addEventListener('pointerleave',  function ()  { _sim(btnId, 0); btn.style.background = 'rgba(50,50,70,0.85)'; });
        btn.addEventListener('pointercancel', function ()  { _sim(btnId, 0); btn.style.background = 'rgba(50,50,70,0.85)'; });
        return btn;
    }

    // D-pad em grade 3x3 (Up/Down/Left/Right nas posicoes de cruz)
    function _makeDpad() {
        var wrap = document.createElement('div');
        Object.assign(wrap.style, {
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 36px)',
            gridTemplateRows: 'repeat(3, 36px)',
            gap: '2px',
            flexShrink: '0',
        });
        var dirs = [
            { row: 1, col: 2, text: '\u25b2', id: 4 },   // Up
            { row: 2, col: 1, text: '\u25c4', id: 6 },   // Left
            { row: 2, col: 3, text: '\u25ba', id: 7 },   // Right
            { row: 3, col: 2, text: '\u25bc', id: 5 },   // Down
        ];
        dirs.forEach(function (d) {
            var btn = document.createElement('button');
            btn.textContent = d.text;
            Object.assign(btn.style, {
                gridRow: String(d.row),
                gridColumn: String(d.col),
                background: 'rgba(60,60,80,0.9)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '4px',
                color: '#bcd',
                fontSize: '14px',
                cursor: 'pointer',
                touchAction: 'none',
                WebkitTapHighlightColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                userSelect: 'none',
                WebkitUserSelect: 'none',
            });
            var id = d.id;
            var pressed = false;
            var down = function (e) {
                if (e) e.preventDefault();
                if (pressed) return;
                pressed = true;
                _press(id);
                btn.style.background = 'rgba(100,100,140,0.9)';
            };
            var up = function (e) {
                if (e) e.preventDefault();
                if (!pressed) return;
                pressed = false;
                _release(id);
                btn.style.background = 'rgba(60,60,80,0.9)';
            };
            btn.addEventListener('pointerdown',   down);
            btn.addEventListener('pointerup',     up);
            btn.addEventListener('pointerleave',  up);
            btn.addEventListener('pointercancel', up);
            wrap.appendChild(btn);
        });
        // Centro inativo do d-pad
        var center = document.createElement('div');
        Object.assign(center.style, { gridRow: '2', gridColumn: '2', background: 'rgba(40,40,60,0.9)', borderRadius: '4px' });
        wrap.appendChild(center);
        return wrap;
    }

    // Analogico virtual arrastavel — alternativa ao D-pad.
    // Mapeia deslocamento do handle para direcoes SNES via deadzone.
    function _makeAnalog() {
        var RADIUS = 40;        // deslocamento maximo do handle (px)
        var DEADZONE = 0.35;    // 35% do raio

        var base = document.createElement('div');
        Object.assign(base.style, {
            position: 'relative',
            width: '88px',
            height: '88px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, rgba(80,80,110,0.9), rgba(30,30,50,0.95))',
            border: '2px solid rgba(255,255,255,0.18)',
            boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.6)',
            touchAction: 'none',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            flexShrink: '0',
            cursor: 'pointer',
        });

        var handle = document.createElement('div');
        Object.assign(handle.style, {
            position: 'absolute',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'linear-gradient(145deg, #a78bfa, #7c3aed)',
            border: '2px solid rgba(255,255,255,0.3)',
            boxShadow: '0 3px 8px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
        });
        base.appendChild(handle);

        // Estado de cada direcao (edge-triggered)
        var active = { 4: false, 5: false, 6: false, 7: false };

        function updateDir(id, on) {
            if (active[id] === on) return;
            active[id] = on;
            if (on) _press(id); else _release(id);
        }

        function releaseAll() {
            updateDir(4, false);
            updateDir(5, false);
            updateDir(6, false);
            updateDir(7, false);
        }

        function moveHandle(dx, dy) {
            handle.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
        }

        function onMove(e) {
            var rect = base.getBoundingClientRect();
            var cx = rect.left + rect.width / 2;
            var cy = rect.top + rect.height / 2;
            var dx = e.clientX - cx;
            var dy = e.clientY - cy;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > RADIUS) {
                dx = dx * RADIUS / dist;
                dy = dy * RADIUS / dist;
            }
            moveHandle(dx, dy);

            var t = RADIUS * DEADZONE;
            updateDir(4, dy < -t);  // Up
            updateDir(5, dy >  t);  // Down
            updateDir(6, dx < -t);  // Left
            updateDir(7, dx >  t);  // Right
        }

        function reset() {
            moveHandle(0, 0);
            releaseAll();
        }

        base.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            try { base.setPointerCapture(e.pointerId); } catch (err) {}
            onMove(e);
        });
        base.addEventListener('pointermove', function (e) {
            if (e.buttons === 0 && e.pointerType === 'mouse') return;
            // so processa quando tem captura (ou toque)
            if (base.hasPointerCapture && !base.hasPointerCapture(e.pointerId)) return;
            e.preventDefault();
            onMove(e);
        });
        base.addEventListener('pointerup', function (e) {
            e.preventDefault();
            try { base.releasePointerCapture(e.pointerId); } catch (err) {}
            reset();
        });
        base.addEventListener('pointercancel', function () { reset(); });
        base.addEventListener('pointerleave',  function (e) {
            // Se nao temos captura, significa que saiu — solta
            if (base.hasPointerCapture && !base.hasPointerCapture(e.pointerId)) reset();
        });

        return base;
    }

    // Diamante YXAB em posicionamento absoluto dentro de container 110x110
    function _makeDiamond() {
        var wrap = document.createElement('div');
        Object.assign(wrap.style, { position: 'relative', width: '110px', height: '110px' });
        // Posicionamento via calc() — sem transform — para nao conflitar
        // com o scale(0.9) que _makeBtn aplica no pointerdown
        var defs = [
            { text: 'X', id: 9, color: 'linear-gradient(145deg,#eab308,#a16207)', pos: { top: '0',              left: 'calc(50% - 21px)' } },
            { text: 'Y', id: 1, color: 'linear-gradient(145deg,#10b981,#047857)', pos: { top: 'calc(50% - 21px)', left: '0'               } },
            { text: 'A', id: 8, color: 'linear-gradient(145deg,#ef4444,#b91c1c)', pos: { top: 'calc(50% - 21px)', right: '0'              } },
            { text: 'B', id: 0, color: 'linear-gradient(145deg,#3b82f6,#1d4ed8)', pos: { bottom: '0',            left: 'calc(50% - 21px)' } },
        ];
        defs.forEach(function (def) {
            var btn = _makeBtn(def.text, def.color, 42,
                function () { _sim(def.id, 1); },
                function () { _sim(def.id, 0); }
            );
            btn.style.position = 'absolute';
            Object.assign(btn.style, def.pos);
            wrap.appendChild(btn);
        });
        return wrap;
    }

    // ---- Layout responsivo ----

    // Paineis laterais para landscape (sobrepostos sobre iframe fullscreen)
    function _buildLandscapeControls() {
        var lc = document.createElement('div');
        Object.assign(lc.style, {
            position: 'absolute',
            top: '0', left: '0', right: '0', bottom: '0',
            display: 'none',            // _applyLayout ativa
            gridTemplateColumns: '130px 1fr 130px',
            alignItems: 'center',
            pointerEvents: 'none',      // centro passa toque pro iframe
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

    // Painel inferior para portrait (controles numa faixa na base da tela)
    function _buildPortraitControls() {
        var pc = document.createElement('div');
        Object.assign(pc.style, {
            position: 'absolute',
            left: '0', right: '0', bottom: '0',
            height: '200px',
            background: 'rgba(15,23,42,0.97)',
            display: 'none',            // _applyLayout ativa
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
            flexShrink: '0', gap: '8px',
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

    // Ajusta iframe e visibilidade dos paineis conforme orientacao
    function _applyLayout() {
        if (!_iframe || !_landscapeControls || !_portraitControls) return;
        var portrait = window.innerHeight > window.innerWidth;

        if (portrait) {
            // Iframe ocupa topo; painel de controles (200px) fica na base
            Object.assign(_iframe.style, {
                position: 'absolute',
                top: '0', left: '0', right: '0', bottom: 'auto',
                width: '100%', height: 'calc(100% - 200px)',
            });
        } else {
            // Iframe fullscreen; paineis laterais sobrepostos
            Object.assign(_iframe.style, {
                position: 'absolute',
                top: '0', left: '0', right: '0', bottom: '0',
                width: '100%', height: '100%',
            });
        }

        _landscapeControls.style.display = portrait ? 'none' : 'grid';
        _portraitControls.style.display  = portrait ? 'flex' : 'none';
    }

    // ---- Lancamento do emulador ----

    function _launchEmulator(romUrl) {
        var absRom = new URL(romUrl, window.location.href).href;

        _overlay = document.createElement('div');
        _overlay.id = 'snes-overlay';
        Object.assign(_overlay.style, {
            position: 'fixed',
            top: '0', left: '0', right: '0', bottom: '0',
            background: '#111', zIndex: '9000',
            overflow: 'hidden',
            WebkitTapHighlightColor: 'transparent',
        });

        // Iframe fullscreen — posicao ajustada dinamicamente por _applyLayout
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

        // Botao fechar — z-index acima dos paineis de controle
        var exitBtn = document.createElement('button');
        var exitIcon = document.createElement('span');
        exitIcon.className = 'material-icons';
        exitIcon.textContent = 'close';
        exitIcon.style.fontSize = '16px';
        exitIcon.style.pointerEvents = 'none';
        exitBtn.appendChild(exitIcon);
        Object.assign(exitBtn.style, {
            position: 'absolute',
            top: '8px', right: '8px', zIndex: '30',
            width: '36px', height: '36px',
            borderRadius: '50%',
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

        // Paineis de controle portrait e landscape
        _landscapeControls = _buildLandscapeControls();
        _portraitControls  = _buildPortraitControls();

        _overlay.appendChild(_iframe);
        _overlay.appendChild(exitBtn);
        _overlay.appendChild(_landscapeControls);
        _overlay.appendChild(_portraitControls);
        document.body.appendChild(_overlay);

        // Layout inicial + listener para mudancas de orientacao/tamanho
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

    // ---- API publica ----

    window.SNESGame = {
        abrir: function () {
            if (_overlay) return;
            _criarPicker();
        },

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
    };

})();
