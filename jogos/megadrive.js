// =====================================================================
// megadrive.js — Emulador Mega Drive via EmulatorJS (CDN)
// =====================================================================
// Usa genesis_plus_gx (RetroArch/WASM) carregado dinamicamente.
// ROMs ficam em /roms/megadrive/  (ex: Sonic The Hedgehog 2 (World) (Rev A).md)
// Limpeza total de window.EJS_* ao fechar — nunca dois emuladores abertos.
// Layout: header com botao voltar + game div em aspect-ratio correto (320:224)
// =====================================================================

(function () {
    'use strict';

    var ROM_DEFAULT  = 'roms/megadrive/Sonic The Hedgehog 2 (World) (Rev A).md';
    var EJS_CDN      = 'https://cdn.emulatorjs.org/stable/data/';
    var MD_W         = 320;  // resolucao nativa Mega Drive
    var MD_H         = 224;

    var _overlay     = null;
    var _gameDiv     = null;
    var _ejsEl       = null;
    var _onKey       = null;
    var _onResize    = null;

    // --- Limpa TODOS os globals EJS_ para evitar conflito de instancias ---
    function _cleanEJS() {
        try {
            Object.keys(window)
                .filter(function (k) { return /^EJS_?/.test(k); })
                .forEach(function (k) { try { delete window[k]; } catch (e) {} });
        } catch (e) {}
        if (_ejsEl) { _ejsEl.remove(); _ejsEl = null; }
        var old = document.getElementById('ejs-script-loader');
        if (old) old.remove();
    }

    // --- Calcula dimensoes mantendo aspecto 320:224 dentro da area disponivel ---
    function _calcGameSize() {
        // Largura maxima: viewport inteiro (mobile first, portrait)
        // Altura disponivel: viewport menos header (56px) menos margem (8px)
        var maxW = window.innerWidth;
        var maxH = window.innerHeight - 64;  // 56px header + 8px folga

        // Ajustar pela razao de aspecto do Mega Drive
        var w = maxW;
        var h = Math.round(w * MD_H / MD_W);
        if (h > maxH) {
            h = maxH;
            w = Math.round(h * MD_W / MD_H);
        }

        return { w: w, h: h };
    }

    function _criarOverlay(romUrl) {
        _cleanEJS();

        // --- Overlay raiz ---
        _overlay = document.createElement('div');
        _overlay.id = 'megadrive-overlay';
        Object.assign(_overlay.style, {
            position: 'fixed', inset: '0',
            background: '#000', zIndex: '9000',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center',
            WebkitTapHighlightColor: 'transparent',
        });

        // --- Header: botao voltar (56x56px — minimo touch do projeto) ---
        var header = document.createElement('div');
        Object.assign(header.style, {
            width: '100%', height: '56px', flexShrink: '0',
            display: 'flex', alignItems: 'center',
            padding: '0 12px', boxSizing: 'border-box',
            background: '#000',
        });

        var backBtn = document.createElement('button');
        backBtn.setAttribute('aria-label', 'Voltar');
        backBtn.innerHTML = '<span class="material-icons" style="font-size:26px;pointer-events:none;">arrow_back</span>';
        Object.assign(backBtn.style, {
            width: '56px', height: '56px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.18)',
            color: '#fff', borderRadius: '50%',
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            flexShrink: '0', touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
        });
        backBtn.addEventListener('click', function () {
            window.MegadriveGame.fechar();
            if (window.fecharJoguinhos) window.fecharJoguinhos();
        });

        header.appendChild(backBtn);
        _overlay.appendChild(header);

        // --- Container do jogo (aspect-ratio correto) ---
        var size = _calcGameSize();
        _gameDiv = document.createElement('div');
        _gameDiv.id = 'ejs-game';
        Object.assign(_gameDiv.style, {
            width: size.w + 'px',
            height: size.h + 'px',
            flexShrink: '0',
            background: '#000',
        });

        _overlay.appendChild(_gameDiv);
        document.body.appendChild(_overlay);

        // --- Resize: reajusta canvas ao girar o aparelho ---
        _onResize = function () {
            if (!_gameDiv) return;
            var s = _calcGameSize();
            _gameDiv.style.width  = s.w + 'px';
            _gameDiv.style.height = s.h + 'px';
        };
        window.addEventListener('resize', _onResize);

        // --- Configurar EmulatorJS ---
        window.EJS_player        = '#ejs-game';
        window.EJS_core          = 'genesis_plus_gx';
        window.EJS_gameUrl       = romUrl;
        window.EJS_pathtodata    = EJS_CDN;
        window.EJS_color         = '#0ea5e9';
        window.EJS_startOnLoaded = true;
        window.EJS_language      = 'pt-BR';

        // Gamepad virtual para touch (modo vertical)
        window.EJS_VirtualGamepadSettings = {
            leftHanded:     false,
            buttonSize:     1.0,
            buttonOpacity:  0.85,
        };

        // Botoes da toolbar: esconder tudo que nao faz sentido para criancas
        window.EJS_Buttons = {
            playPause:    false,
            restart:      true,   // util se travar
            mute:         true,   // controle de volume
            settings:     false,
            fullscreen:   false,  // ja estamos em overlay fullscreen
            saveState:    false,
            loadState:    false,
            screenRecord: false,
            gamepad:      false,
            cheat:        false,
            volume:       false,  // usa mute ao inves do slider
            zoom:         false,
            diskDrive:    false,
            netplay:      false,
            saveSavFiles: false,
            loadSavFiles: false,
            quickSave:    false,
            quickLoad:    false,
            screenshot:   false,
            cacheManager: false,
        };

        // Carregar loader dinamicamente
        _ejsEl = document.createElement('script');
        _ejsEl.id  = 'ejs-script-loader';
        _ejsEl.src = EJS_CDN + 'loader.js';
        document.body.appendChild(_ejsEl);

        // ESC para sair (apenas se o foco nao estiver dentro do canvas do jogo)
        _onKey = function (e) {
            if (e.key === 'Escape' && e.target === document.body) {
                window.MegadriveGame.fechar();
                if (window.fecharJoguinhos) window.fecharJoguinhos();
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
            if (_onKey)    { document.removeEventListener('keydown', _onKey); _onKey = null; }
            if (_onResize) { window.removeEventListener('resize', _onResize); _onResize = null; }
            if (_overlay)  { _overlay.remove(); _overlay = null; }
            _gameDiv = null;
            _cleanEJS();
        },
    };

})();
