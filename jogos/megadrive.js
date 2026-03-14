// =====================================================================
// megadrive.js — Emulador Mega Drive via EmulatorJS (CDN)
// =====================================================================
// Usa genesis_plus_gx (RetroArch/WASM) carregado dinamicamente.
// ROMs ficam em /roms/megadrive/  (ex: Sonic The Hedgehog 2 (World) (Rev A).md)
// Limpeza total de window.EJS_* ao fechar — nunca dois emuladores abertos.
// Botao sair: canto inferior esquerdo, acima do controle virtual, history.back()
// para passar pelo dialogo de confirmacao "Sair?" do hub.
// =====================================================================

(function () {
    'use strict';

    var ROM_DEFAULT  = 'roms/megadrive/Sonic The Hedgehog 2 (World) (Rev A).md';
    var EJS_CDN      = 'https://cdn.emulatorjs.org/stable/data/';

    var _overlay     = null;
    var _ejsEl       = null;
    var _onKey       = null;

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

    function _criarOverlay(romUrl) {
        _cleanEJS();

        // --- Overlay raiz: fullscreen, EmulatorJS gerencia o layout interno ---
        _overlay = document.createElement('div');
        _overlay.id = 'megadrive-overlay';
        Object.assign(_overlay.style, {
            position: 'fixed', inset: '0',
            background: '#000', zIndex: '9000',
            WebkitTapHighlightColor: 'transparent',
        });

        // --- Container do jogo: tela inteira para EmulatorJS gerir canvas + gamepad ---
        var gameDiv = document.createElement('div');
        gameDiv.id = 'ejs-game';
        Object.assign(gameDiv.style, {
            width: '100%', height: '100%',
        });
        _overlay.appendChild(gameDiv);

        // --- Botao sair: canto inferior esquerdo, acima do controle virtual ---
        // Chama history.back() para passar pelo dialogo "Sair?" do hub,
        // igual ao comportamento do botao fisico de voltar em todos os outros jogos.
        var exitBtn = document.createElement('button');
        exitBtn.setAttribute('aria-label', 'Sair do jogo');
        exitBtn.innerHTML =
            '<span class="material-icons" style="font-size:18px;pointer-events:none;">arrow_back</span>' +
            '<span style="font-family:Inter,sans-serif;font-size:0.7rem;pointer-events:none;margin-left:4px;">Sair</span>';
        Object.assign(exitBtn.style, {
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            zIndex: '9200',
            display: 'flex',
            alignItems: 'center',
            padding: '8px 14px',
            background: 'rgba(0,0,0,0.60)',
            border: '1px solid rgba(255,255,255,0.20)',
            color: 'rgba(255,255,255,0.75)',
            borderRadius: '20px',
            cursor: 'pointer',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            minWidth: '64px',
            minHeight: '36px',
        });
        exitBtn.addEventListener('click', function () {
            history.back(); // dispara popstate → dialogo "Sair?" do hub
        });
        _overlay.appendChild(exitBtn);

        document.body.appendChild(_overlay);

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
            leftHanded:    false,
            buttonSize:    1.0,
            buttonOpacity: 0.85,
        };

        // Toolbar: so restart e mute; esconder todo o resto
        window.EJS_Buttons = {
            playPause:    false,
            restart:      true,
            mute:         true,
            settings:     false,
            fullscreen:   false,
            saveState:    false,
            loadState:    false,
            screenRecord: false,
            gamepad:      false,
            cheat:        false,
            volume:       false,
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

        // ESC: passa pelo mesmo dialogo "Sair?"
        _onKey = function (e) {
            if (e.key === 'Escape' && e.target === document.body) {
                history.back();
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
            if (_onKey)   { document.removeEventListener('keydown', _onKey); _onKey = null; }
            if (_overlay) { _overlay.remove(); _overlay = null; }
            _cleanEJS();
        },
    };

})();
