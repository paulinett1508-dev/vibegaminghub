// =====================================================================
// megadrive.js — Emulador Mega Drive via EmulatorJS (CDN)
// =====================================================================
// Layout unico (sempre horizontal):
//   painel esquerdo (D-pad) + iframe central + painel direito (A/B/C/START)
// Em portrait, o overlay inteiro e rotacionado 90° via CSS para forcar
// a visualizacao horizontal (sem depender de screen.orientation.lock,
// que nao funciona em iOS Safari).
// =====================================================================

(function () {
    'use strict';

    var ROM_DEFAULT = 'roms/megadrive/Sonic The Hedgehog 2 (World) (Rev A).md';
    var EJS_CDN     = 'https://cdn.emulatorjs.org/stable/data/';

    // RetroPad indices para genesis_plus_gx
    var BTN = { B:0, A:1, START:3, UP:4, DOWN:5, LEFT:6, RIGHT:7, C:8 };

    var PANEL_L = 120, PANEL_R = 140;

    var _overlay = null;
    var _iframe  = null;
    var _lcPanel = null;
    var _rcPanel = null;
    var _rh      = null;
    var _onKey   = null;

    function _simulateInput(btnId, val) {
        try {
            var emu = _iframe && _iframe.contentWindow && _iframe.contentWindow.EJS_emulator;
            if (emu && emu.gameManager) emu.gameManager.simulateInput(1, btnId, val);
        } catch (e) {}
    }

    // ── Botao redondo estilo Mega Drive ──────────────────────────────
    function _makeBtn(label, size, bg, shadow, bId) {
        var btn = document.createElement('button');
        btn.style.cssText = [
            'width:'+size+'px', 'height:'+size+'px',
            'border-radius:50%', 'background:'+bg,
            'border:3px solid rgba(255,255,255,0.18)',
            'color:#fff', 'font-family:"Russo One",sans-serif',
            'font-size:'+Math.round(size*0.28)+'px', 'font-weight:700',
            'cursor:pointer', 'display:flex', 'align-items:center', 'justify-content:center',
            '-webkit-tap-highlight-color:transparent',
            'user-select:none', 'touch-action:none',
            'box-shadow:'+shadow, 'flex-shrink:0', 'letter-spacing:1px',
        ].join(';');
        var sp = document.createElement('span');
        sp.textContent = label; sp.style.pointerEvents = 'none';
        btn.appendChild(sp);
        var dn = function(e){e.preventDefault();_simulateInput(bId,1);btn.style.opacity='0.72';btn.style.transform='scale(0.90)';};
        var up = function(e){e.preventDefault();_simulateInput(bId,0);btn.style.opacity='';btn.style.transform='';};
        btn.addEventListener('pointerdown',dn);
        btn.addEventListener('pointerup',up);
        btn.addEventListener('pointerleave',up);
        btn.addEventListener('pointercancel',up);
        return btn;
    }

    function _makeStartPill() {
        var btn = document.createElement('button');
        btn.style.cssText = [
            'background:#1a2535', 'border:2px solid #3a4555',
            'color:#7a8a9a', 'border-radius:4px', 'padding:7px 14px',
            'font-family:"Russo One",sans-serif', 'font-size:10px',
            'letter-spacing:2px', 'cursor:pointer', 'flex-shrink:0',
            '-webkit-tap-highlight-color:transparent',
            'user-select:none', 'touch-action:none',
        ].join(';');
        var sp = document.createElement('span');
        sp.textContent = 'START'; sp.style.pointerEvents = 'none';
        btn.appendChild(sp);
        var dn = function(e){e.preventDefault();_simulateInput(BTN.START,1);btn.style.opacity='0.72';};
        var up = function(e){e.preventDefault();_simulateInput(BTN.START,0);btn.style.opacity='';};
        btn.addEventListener('pointerdown',dn);
        btn.addEventListener('pointerup',up);
        btn.addEventListener('pointerleave',up);
        btn.addEventListener('pointercancel',up);
        return btn;
    }

    function _makeDpad(bs) {
        var sz = bs * 3;
        var half = Math.round(bs / 2);
        var wrap = document.createElement('div');
        wrap.style.cssText = 'position:relative;width:'+sz+'px;height:'+sz+'px;flex-shrink:0;';
        var dirs = [
            {ch:'▲', dir:BTN.UP,    top:'0',                  left:'calc(50% - '+half+'px)'},
            {ch:'▼', dir:BTN.DOWN,  bottom:'0',               left:'calc(50% - '+half+'px)'},
            {ch:'◀', dir:BTN.LEFT,  top:'calc(50% - '+half+'px)', left:'0'},
            {ch:'▶', dir:BTN.RIGHT, top:'calc(50% - '+half+'px)', right:'0'},
        ];
        dirs.forEach(function(d) {
            var b = document.createElement('button');
            var pos = 'position:absolute;';
            if (d.top    !== undefined) pos += 'top:'+d.top+';';
            if (d.bottom !== undefined) pos += 'bottom:'+d.bottom+';';
            if (d.left   !== undefined) pos += 'left:'+d.left+';';
            if (d.right  !== undefined) pos += 'right:'+d.right+';';
            b.style.cssText = pos + [
                'width:'+bs+'px', 'height:'+bs+'px',
                'border-radius:4px', 'background:rgba(80,95,120,0.75)',
                'border:2px solid rgba(255,255,255,0.15)',
                'color:#ddd', 'font-size:'+Math.round(bs*0.48)+'px',
                'display:flex', 'align-items:center', 'justify-content:center',
                '-webkit-tap-highlight-color:transparent',
                'user-select:none', 'touch-action:none', 'cursor:pointer',
            ].join(';');
            var sp = document.createElement('span');
            sp.textContent = d.ch; sp.style.pointerEvents = 'none';
            b.appendChild(sp);
            var dn = function(e){e.preventDefault();_simulateInput(d.dir,1);b.style.opacity='0.65';};
            var up = function(e){e.preventDefault();_simulateInput(d.dir,0);b.style.opacity='';};
            b.addEventListener('pointerdown',dn);
            b.addEventListener('pointerup',up);
            b.addEventListener('pointerleave',up);
            b.addEventListener('pointercancel',up);
            wrap.appendChild(b);
        });
        var center = document.createElement('div');
        center.style.cssText = 'position:absolute;top:calc(50% - '+half+'px);left:calc(50% - '+half+'px);width:'+bs+'px;height:'+bs+'px;background:rgba(55,68,90,0.5);border-radius:3px;pointer-events:none;';
        wrap.appendChild(center);
        return wrap;
    }

    function _mdLabel(text) {
        var d = document.createElement('div');
        d.textContent = text;
        d.style.cssText = 'font-size:8px;letter-spacing:1px;color:#445566;font-family:"Russo One",sans-serif;text-align:center;';
        return d;
    }

    // ── Paineis de controle ───────────────────────────────────────────
    function _buildLandscapeControls() {
        var bg = 'rgba(10,16,28,0.97)';

        // Painel esquerdo: D-pad
        _lcPanel = document.createElement('div');
        _lcPanel.style.cssText = [
            'position:absolute', 'top:0', 'bottom:0', 'left:0',
            'width:'+PANEL_L+'px', 'background:'+bg,
            'border-right:2px solid #222',
            'display:flex', 'flex-direction:column',
            'align-items:center', 'justify-content:center',
            'gap:8px', 'z-index:10',
        ].join(';');
        _lcPanel.appendChild(_makeDpad(44));
        _overlay.appendChild(_lcPanel);

        // Painel direito: START (topo) + A/B/C cluster (baixo)
        _rcPanel = document.createElement('div');
        _rcPanel.style.cssText = [
            'position:absolute', 'top:0', 'bottom:0', 'right:0',
            'width:'+PANEL_R+'px', 'background:'+bg,
            'border-left:2px solid #222',
            'display:flex', 'flex-direction:column',
            'align-items:center', 'justify-content:space-between',
            'padding:20px 10px', 'z-index:10',
        ].join(';');
        _rcPanel.appendChild(_makeStartPill());

        var cluster = document.createElement('div');
        cluster.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;';
        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:flex-end;gap:6px;';
        row.appendChild(_makeBtn('A', 52,
            'linear-gradient(135deg,#D83020,#901010)',
            '0 4px 12px rgba(216,48,32,0.5)', BTN.A));
        row.appendChild(_makeBtn('B', 62,
            'linear-gradient(135deg,#1864D8,#0A3D90)',
            '0 4px 14px rgba(24,100,216,0.55)', BTN.B));
        cluster.appendChild(row);
        cluster.appendChild(_makeBtn('C', 74,
            'linear-gradient(135deg,#2880F0,#1050C0)',
            '0 4px 18px rgba(40,128,240,0.65)', BTN.C));
        cluster.appendChild(_mdLabel('PULAR'));
        _rcPanel.appendChild(cluster);
        _overlay.appendChild(_rcPanel);
    }

    // ── Layout sempre horizontal ──────────────────────────────────────
    // Iframe sempre entre os paineis laterais. Se o aparelho estiver em
    // portrait, o overlay inteiro e rotacionado 90° via CSS.
    function _applyLayout() {
        if (!_overlay || !_iframe) return;

        // Iframe ocupa o espaco entre os dois paineis (sempre).
        _iframe.style.cssText =
            'position:absolute;top:0;bottom:0;' +
            'left:'+PANEL_L+'px;right:'+PANEL_R+'px;' +
            'border:none;display:block;';
        if (_lcPanel) _lcPanel.style.display = 'flex';
        if (_rcPanel) _rcPanel.style.display = 'flex';

        // Forca visualizacao horizontal: rotaciona overlay quando portrait.
        var portrait = window.innerHeight > window.innerWidth;
        if (portrait) {
            _overlay.style.cssText = [
                'position:fixed',
                'top:50%', 'left:50%',
                'width:100vh', 'height:100vw',
                'margin-top:-50vw', 'margin-left:-50vh',
                'transform:rotate(90deg)', 'transform-origin:center center',
                'background:#0f172a', 'z-index:9000', 'overflow:hidden',
                '-webkit-tap-highlight-color:transparent',
            ].join(';');
        } else {
            _overlay.style.cssText = [
                'position:fixed', 'inset:0',
                'background:#0f172a', 'z-index:9000', 'overflow:hidden',
                '-webkit-tap-highlight-color:transparent',
            ].join(';');
        }
    }

    function _criarOverlay(romUrl) {
        var absRom = new URL(romUrl, window.location.href).href;

        // --- Overlay raiz ---
        _overlay = document.createElement('div');
        _overlay.id = 'megadrive-overlay';
        _overlay.style.cssText = 'position:fixed;inset:0;background:#0f172a;z-index:9000;overflow:hidden;-webkit-tap-highlight-color:transparent;';

        // --- iframe: EJS sem gamepad nativo ---
        _iframe = document.createElement('iframe');
        _iframe.setAttribute('allowfullscreen', '');
        _iframe.setAttribute('allow', 'autoplay; gamepad *');
        _iframe.style.border = 'none';

        var ejsButtons = JSON.stringify({
            playPause:false, restart:false, mute:false, settings:false,
            fullscreen:false, saveState:false, loadState:false,
            screenRecord:false, gamepad:false, cheat:false,
            volume:false, netplay:false, saveSavFiles:false,
            loadSavFiles:false, quickSave:false, quickLoad:false,
            screenshot:false, cacheManager:false, exitEmulation:false,
        });

        _iframe.srcdoc = [
            '<!DOCTYPE html><html><head>',
            '<meta charset="utf-8">',
            '<meta name="viewport" content="width=device-width,initial-scale=1">',
            '<style>',
            '*{margin:0;padding:0;box-sizing:border-box}',
            'body{background:#000;width:100%;height:100vh;overflow:hidden;display:flex;align-items:center;justify-content:center}',
            '#ejs-game{width:100%;height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden}',
            '.ejs_menu_bar,.ejs-menu,.ejs_virtualGamepad_parent{display:none!important}',
            'canvas{display:block!important;max-width:100%!important;max-height:100%!important;margin:0 auto!important;image-rendering:pixelated}',
            '</style></head><body>',
            '<div id="ejs-game"></div>',
            '<script>',
            'window.EJS_player="#ejs-game";',
            'window.EJS_core="genesis_plus_gx";',
            'window.EJS_gameUrl='+JSON.stringify(absRom)+';',
            'window.EJS_pathtodata='+JSON.stringify(EJS_CDN)+';',
            'window.EJS_color="#0ea5e9";',
            'window.EJS_startOnLoaded=true;',
            'window.EJS_Buttons='+ejsButtons+';',
            'window.EJS_VirtualGamepadSettings=[];',
            '<\/script>',
            '<script src="'+EJS_CDN+'loader.js"><\/script>',
            '</body></html>',
        ].join('');

        _overlay.appendChild(_iframe);

        // --- Botao sair ---
        var exitBtn = document.createElement('button');
        exitBtn.setAttribute('aria-label', 'Sair');
        exitBtn.style.cssText = [
            'position:absolute', 'top:8px', 'left:8px', 'z-index:20',
            'background:rgba(15,23,42,0.80)', 'border:1px solid rgba(255,255,255,0.30)',
            'color:#fff', 'border-radius:20px',
            'display:flex', 'align-items:center', 'padding:6px 12px',
            'cursor:pointer', 'touch-action:manipulation',
            '-webkit-tap-highlight-color:transparent',
            'min-width:56px', 'min-height:44px',
            'font-size:0.75rem', 'font-family:Inter,sans-serif',
            'white-space:nowrap',
        ].join(';');
        var bkIcon = document.createElement('span');
        bkIcon.className = 'material-icons';
        bkIcon.style.cssText = 'font-size:18px;pointer-events:none;';
        bkIcon.textContent = 'arrow_back';
        var bkText = document.createElement('span');
        bkText.textContent = 'Sair';
        bkText.style.cssText = 'pointer-events:none;margin-left:5px;';
        exitBtn.appendChild(bkIcon);
        exitBtn.appendChild(bkText);
        exitBtn.addEventListener('click', function () {
            if (window.fecharJoguinhos) window.fecharJoguinhos();
            else window.MegadriveGame.fechar();
        });
        _overlay.appendChild(exitBtn);

        // --- Constroi paineis e adiciona ao body ---
        _buildLandscapeControls();
        document.body.appendChild(_overlay);

        // --- Layout inicial + resize ---
        _applyLayout();
        _rh = function () { _applyLayout(); };
        window.addEventListener('resize', _rh);
        window.addEventListener('orientationchange', _rh);

        // --- ESC para sair ---
        _onKey = function (e) {
            if (e.key === 'Escape') {
                if (window.fecharJoguinhos) window.fecharJoguinhos();
                else window.MegadriveGame.fechar();
            }
        };
        document.addEventListener('keydown', _onKey);
    }

    window.MegadriveGame = {
        abrir: function (romUrl) {
            if (_overlay) return;
            _criarOverlay(romUrl || ROM_DEFAULT);
        },

        fechar: function () {
            if (_rh) { window.removeEventListener('resize', _rh); window.removeEventListener('orientationchange', _rh); _rh = null; }
            if (_onKey) { document.removeEventListener('keydown', _onKey); _onKey = null; }
            _lcPanel = _rcPanel = _iframe = null;
            if (_overlay) { _overlay.remove(); _overlay = null; }
        },
    };

})();
