// =====================================================================
// megadrive.js — Emulador Mega Drive via EmulatorJS (CDN)
// =====================================================================
// Usa genesis_plus_gx (RetroArch/WASM) carregado dinamicamente.
// ROMs ficam em /roms/megadrive/  (ex: Sonic The Hedgehog 2 (World) (Rev A).md)
// Limpeza total de window.EJS_* ao fechar — nunca dois emuladores abertos.
// =====================================================================

(function () {
    'use strict';

    var ROM_DEFAULT = 'roms/megadrive/Sonic The Hedgehog 2 (World) (Rev A).md';
    var EJS_CDN     = 'https://cdn.emulatorjs.org/stable/data/';

    var _overlay  = null;
    var _ejsEl    = null;  // <script> do loader
    var _onKey    = null;

    // --- Limpa TODOS os globals EJS_ para evitar conflito de instâncias ---
    function _cleanEJS() {
        try {
            Object.keys(window)
                .filter(function (k) { return /^EJS_?/.test(k); })
                .forEach(function (k) { try { delete window[k]; } catch (e) {} });
        } catch (e) {}
        if (_ejsEl) { _ejsEl.remove(); _ejsEl = null; }
        // loader cria #emulator-container ou injeta diretamente; limpar residuos
        var old = document.getElementById('ejs-script-loader');
        if (old) old.remove();
    }

    function _criarOverlay(romUrl) {
        _cleanEJS(); // estado limpo antes de abrir

        _overlay = document.createElement('div');
        _overlay.id = 'megadrive-overlay';
        Object.assign(_overlay.style, {
            position: 'fixed', inset: '0',
            background: '#000', zIndex: '9000',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
        });

        // Botao voltar (padrao do projeto)
        var backBtn = document.createElement('button');
        backBtn.setAttribute('aria-label', 'Voltar');
        backBtn.innerHTML = '<span class="material-icons" style="font-size:22px;">arrow_back</span>';
        Object.assign(backBtn.style, {
            position: 'absolute', top: '16px', left: '16px', zIndex: '9100',
            background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.22)',
            color: '#fff', borderRadius: '50%', width: '44px', height: '44px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
        });
        backBtn.addEventListener('click', function () {
            if (window.fecharJoguinhos) window.fecharJoguinhos();
            else window.MegadriveGame.fechar();
        });

        // Container do emulador
        var gameDiv = document.createElement('div');
        gameDiv.id = 'ejs-game';
        gameDiv.style.cssText = 'width:min(640px,98vw);height:min(480px,55vh);';

        _overlay.appendChild(backBtn);
        _overlay.appendChild(gameDiv);
        document.body.appendChild(_overlay);

        // Configurar EmulatorJS
        window.EJS_player        = '#ejs-game';
        window.EJS_core          = 'genesis_plus_gx';
        window.EJS_gameUrl       = romUrl;
        window.EJS_pathtodata    = EJS_CDN;
        window.EJS_color         = '#1d4ed8';
        window.EJS_startOnLoaded = true;
        window.EJS_language      = 'pt-BR';

        // Gamepad virtual para touch (modo vertical)
        window.EJS_VirtualGamepadSettings = {
            // Layout para Mega Drive 6-button
            leftHanded: false,
            buttonSize: 1.0,
            buttonOpacity: 0.85,
        };

        // Botoes do menu EmulatorJS
        window.EJS_Buttons = {
            playPause: true,
            restart: false,
            mute: true,
            settings: false,
            fullscreen: true,
            saveState: false,
            loadState: false,
            screenRecord: false,
            gamepad: false,
            cheat: false,
            volume: false,
            saveSavFiles: false,
            loadSavFiles: false,
            quickSave: false,
            quickLoad: false,
            screenshot: false,
            cacheManager: false,
        };

        // Carregar loader dinamicamente
        _ejsEl = document.createElement('script');
        _ejsEl.id  = 'ejs-script-loader';
        _ejsEl.src = EJS_CDN + 'loader.js';
        document.body.appendChild(_ejsEl);

        // ESC para sair
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
            if (_overlay) return; // nunca dois emuladores ao mesmo tempo
            _criarOverlay(romUrl || ROM_DEFAULT);
        },

        fechar: function () {
            if (_onKey) { document.removeEventListener('keydown', _onKey); _onKey = null; }
            if (_overlay) { _overlay.remove(); _overlay = null; }
            _cleanEJS();
        },
    };

})();
