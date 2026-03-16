// =====================================================================
// atari.js — Emulador Multi-Atari
// =====================================================================
// Suporta Atari 2600, 5200 e 7800:
//   2600 → Javatari.js (self-hosted) — ROMs em assets/roms/atari/2600/*.a26
//   5200 → EmulatorJS core "atari800" — ROMs em assets/roms/atari/5200/*.bin
//   7800 → EmulatorJS core "prosystem" — ROMs em assets/roms/atari/7800/*.a78
//
// Fluxo: Hub → Seletor de Console → Seletor de ROMs → Jogo
//
// Para adicionar ROMs:
//   1. Coloque o arquivo na pasta correta (ex: assets/roms/atari/2600/pong.a26)
//   2. Adicione uma entrada no array de ROMs do console correspondente abaixo
// =====================================================================

(function () {
    'use strict';

    var EJS_CDN = 'https://cdn.emulatorjs.org/stable/data/';

    // ---- Configuracao por console ----
    // ROMs em assets/roms/atari/<console>/  — nomes exatos dos arquivos
    var CONSOLES = [
        {
            id:   '2600',
            nome: 'Atari 2600',
            core: 'javatari',
            icon: 'videogame_asset',
            cor:  '#e94560',
            roms: [
                { id: 'breakout',  nome: 'Breakout',   rom: 'assets/roms/atari/2600/Breakout (USA).a26',                                          icon: 'sports_baseball',       cor: '#34d399' },
                { id: 'indy500',   nome: 'Indy 500',   rom: 'assets/roms/atari/2600/Indy 500 (USA).a26',                                          icon: 'directions_car',        cor: '#f59e0b' },
                { id: 'kaboom',    nome: 'Kaboom!',     rom: 'assets/roms/atari/2600/Kaboom! (USA).a26',                                           icon: 'local_fire_department', cor: '#f87171' },
                { id: 'pitfall',   nome: 'Pitfall!',   rom: 'assets/roms/atari/2600/Pitfall! - Pitfall Harry\'s Jungle Adventure (USA).a26',      icon: 'forest',                cor: '#4ade80' },
                { id: 'riverraid', nome: 'River Raid', rom: 'assets/roms/atari/2600/River Raid II (USA).a26',                                     icon: 'water',                 cor: '#38bdf8' }
            ]
        },
        {
            id:   '5200',
            nome: 'Atari 5200',
            core: 'a5200',
            icon: 'sports_esports',
            cor:  '#f59e0b',
            roms: [
                { id: 'defender',  nome: 'Defender',   rom: 'assets/roms/atari/5200/Defender.bin',        icon: 'shield',                cor: '#818cf8' },
                { id: 'frogger',   nome: 'Frogger',    rom: 'assets/roms/atari/5200/Frogger I.bin',       icon: 'cruelty_free',          cor: '#4ade80' },
                { id: 'popeye',    nome: 'Popeye',     rom: 'assets/roms/atari/5200/Popeye.bin',          icon: 'fitness_center',        cor: '#38bdf8' }
            ]
        },
        {
            id:   '7800',
            nome: 'Atari 7800',
            core: 'prosystem',
            icon: 'gamepad',
            cor:  '#34d399',
            roms: [
                { id: 'asteroids', nome: 'Asteroids',   rom: 'assets/roms/atari/7800/Asteroids.A78',                          icon: 'auto_awesome',   cor: '#818cf8' },
                { id: 'donkeykong',nome: 'Donkey Kong', rom: 'assets/roms/atari/7800/Donkey Kong (1988) (Atari).a78',         icon: 'emoji_nature',   cor: '#f59e0b' },
                { id: 'f18',       nome: 'F-18 Hornet', rom: 'assets/roms/atari/7800/F-18 Hornet (1988) (Absolute) [b2].a78', icon: 'flight',         cor: '#38bdf8' }
            ]
        }
    ];

    // ---- Estado ----
    var _overlay       = null;
    var _onKey         = null;
    var _consoleSel    = null; // console selecionado

    // ============================================================
    // TELA 1 — Seletor de Console (2600 / 5200 / 7800)
    // ============================================================
    function _criarSeletorConsole() {
        _overlay = document.createElement('div');
        _overlay.id = 'atari-overlay';
        Object.assign(_overlay.style, {
            position:        'fixed',
            inset:           '0',
            zIndex:          '9000',
            background:      '#0f172a',
            display:         'flex',
            flexDirection:   'column',
            alignItems:      'center',
            justifyContent:  'flex-start',
            overflowY:       'auto',
            padding:         '72px 24px 40px',
            WebkitTapHighlightColor: 'transparent',
        });
        document.body.appendChild(_overlay);

        _renderizarSeletorConsole();

        _onKey = function (e) {
            if (e.key === 'Escape' && e.target === document.body) history.back();
        };
        document.addEventListener('keydown', _onKey);
    }

    function _renderizarSeletorConsole() {
        _overlay.innerHTML = '';

        // Cabeçalho
        var header = document.createElement('div');
        header.style.cssText = 'text-align:center;margin-bottom:32px;width:100%;';
        header.innerHTML =
            '<div style="font-family:\'Russo One\',sans-serif;font-size:30px;' +
            'color:#e94560;letter-spacing:2px;text-shadow:0 0 20px rgba(233,69,96,.4);">ATARI</div>' +
            '<div style="font-family:Inter,sans-serif;font-size:14px;color:#94a3b8;margin-top:8px;">' +
            'Escolha o console</div>';
        _overlay.appendChild(header);

        // Cards de console (1 coluna, grandes)
        var lista = document.createElement('div');
        lista.style.cssText =
            'display:flex;flex-direction:column;gap:14px;width:100%;max-width:360px;';

        CONSOLES.forEach(function (console_) {
            var card = document.createElement('button');
            Object.assign(card.style, {
                background:    'rgba(255,255,255,0.04)',
                border:        '2px solid ' + console_.cor + '55',
                borderRadius:  '18px',
                padding:       '20px 24px',
                cursor:        'pointer',
                display:       'flex',
                alignItems:    'center',
                gap:           '18px',
                transition:    'background 0.2s,border-color 0.2s,transform 0.1s',
                touchAction:   'manipulation',
                WebkitTapHighlightColor: 'transparent',
                width:         '100%',
                overflow:      'hidden',
                minWidth:      '0',
                boxSizing:     'border-box',
            });
            card.innerHTML =
                '<span class="material-icons" style="font-size:40px;color:' + console_.cor + ';' +
                'text-shadow:0 0 14px ' + console_.cor + '88;">' + console_.icon + '</span>' +
                '<div style="text-align:left;">' +
                  '<div style="font-family:\'Russo One\',sans-serif;font-size:18px;color:#f1f5f9;">' +
                  console_.nome + '</div>' +
                  '<div style="font-family:Inter,sans-serif;font-size:12px;color:#64748b;margin-top:2px;">' +
                  console_.roms.length + ' jogos configurados</div>' +
                '</div>' +
                '<span class="material-icons" style="margin-left:auto;color:#475569;font-size:22px;">chevron_right</span>';

            card.addEventListener('mouseenter', function () {
                card.style.background  = console_.cor + '18';
                card.style.borderColor = console_.cor + 'aa';
                card.style.transform   = 'scale(1.02)';
            });
            card.addEventListener('mouseleave', function () {
                card.style.background  = 'rgba(255,255,255,0.04)';
                card.style.borderColor = console_.cor + '55';
                card.style.transform   = 'scale(1)';
            });
            card.addEventListener('click', function () { _renderizarSeletorROMs(console_); });
            card.addEventListener('touchend', function (e) {
                e.preventDefault();
                _renderizarSeletorROMs(console_);
            });

            lista.appendChild(card);
        });

        _overlay.appendChild(lista);

        // Botão voltar (sai do Atari)
        _overlay.appendChild(_criarBotaoVoltar(function () { history.back(); }));
    }

    // ============================================================
    // TELA 2 — Seletor de ROMs
    // ============================================================
    function _renderizarSeletorROMs(console_) {
        _consoleSel = console_;
        _overlay.innerHTML = '';
        Object.assign(_overlay.style, {
            padding:        '72px 24px 40px',
            justifyContent: 'flex-start',
            overflowY:      'auto',
        });

        // Cabeçalho
        var header = document.createElement('div');
        header.style.cssText = 'text-align:center;margin-bottom:28px;width:100%;';
        header.innerHTML =
            '<div style="font-family:\'Russo One\',sans-serif;font-size:24px;color:' +
            console_.cor + ';letter-spacing:1px;">' + console_.nome + '</div>' +
            '<div style="font-family:Inter,sans-serif;font-size:13px;color:#94a3b8;margin-top:6px;">' +
            'Escolha um jogo</div>';
        _overlay.appendChild(header);

        // Grid 2 colunas
        var grid = document.createElement('div');
        grid.style.cssText =
            'display:grid;grid-template-columns:repeat(2,1fr);gap:14px;' +
            'width:100%;max-width:420px;';

        console_.roms.forEach(function (jogo) {
            var card = document.createElement('button');
            Object.assign(card.style, {
                background:    'rgba(255,255,255,0.04)',
                border:        '2px solid ' + jogo.cor + '55',
                borderRadius:  '16px',
                padding:       '24px 10px',
                cursor:        'pointer',
                display:       'flex',
                flexDirection: 'column',
                alignItems:    'center',
                gap:           '10px',
                minHeight:     '112px',
                transition:    'background 0.2s,border-color 0.2s,transform 0.1s',
                touchAction:   'manipulation',
                WebkitTapHighlightColor: 'transparent',
            });
            card.innerHTML =
                '<span class="material-icons" style="font-size:40px;color:' + jogo.cor + ';' +
                'text-shadow:0 0 14px ' + jogo.cor + '88;">' + jogo.icon + '</span>' +
                '<span style="font-family:\'Russo One\',sans-serif;font-size:12px;' +
                'color:#f1f5f9;text-align:center;line-height:1.3;">' + jogo.nome + '</span>';

            card.addEventListener('mouseenter', function () {
                card.style.background  = jogo.cor + '18';
                card.style.borderColor = jogo.cor + 'aa';
                card.style.transform   = 'scale(1.04)';
            });
            card.addEventListener('mouseleave', function () {
                card.style.background  = 'rgba(255,255,255,0.04)';
                card.style.borderColor = jogo.cor + '55';
                card.style.transform   = 'scale(1)';
            });
            card.addEventListener('click', function () { _abrirJogo(jogo, console_.core); });
            card.addEventListener('touchend', function (e) {
                e.preventDefault();
                _abrirJogo(jogo, console_.core);
            });

            grid.appendChild(card);
        });

        _overlay.appendChild(grid);

        // Botão voltar ao seletor de consoles
        _overlay.appendChild(_criarBotaoVoltar(function () { _renderizarSeletorConsole(); }));
    }

    // ============================================================
    // TELA 3 — Emulador
    // ============================================================
    function _abrirJogo(jogo, core) {
        _overlay.innerHTML = '';
        Object.assign(_overlay.style, {
            padding:        '0',
            justifyContent: 'center',
            overflowY:      'hidden',
        });

        // Codifica cada segmento do path para suportar espaços e caracteres especiais nos nomes dos arquivos
        var absRom = new URL(
            jogo.rom.split('/').map(encodeURIComponent).join('/'),
            window.location.href
        ).href;

        if (core === 'javatari') {
            _abrirJogoJavatari(jogo, absRom);
        } else {
            _abrirJogoEJS(jogo, core, absRom);
        }
    }

    // ---- Atari 2600: Javatari.js (self-hosted) ----
    // ROMs são same-origin → XHR direto funciona sem restrições COEP.
    // data: URLs são opaque origin e ficam bloqueadas pelo COEP: require-corp.
    function _abrirJogoJavatari(jogo, absRom) {
        _iniciarIframeJavatari(absRom);
    }

    function _iniciarIframeJavatari(cartridgeUrl) {
        var javatariSrc = new URL('/assets/libs/javatari/javatari.js', window.location.href).href;

        var iframe = document.createElement('iframe');
        Object.assign(iframe.style, {
            position: 'absolute', inset: '0',
            width: '100%', height: '100%',
            border: 'none',
        });
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('allow', 'autoplay; gamepad *');

        iframe.srcdoc = [
            '<!DOCTYPE html><html><head>',
            '<meta charset="utf-8">',
            '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">',
            '<style>',
            '*{margin:0;padding:0;box-sizing:border-box}',
            'body{background:#000;width:100%;height:100vh;overflow:hidden}',
            '#javatari-screen{width:100%!important;height:100vh!important}',
            '</style></head><body>',
            '<script>',
            'Javatari={',
            '  CARTRIDGE_URL:' + JSON.stringify(cartridgeUrl) + ',',
            '  AUTO_START:true,',
            '  SCREEN_FULLSCREEN_MODE:0,',
            '  ALLOW_URL_PARAMETERS:false,',
            '  CARTRIDGE_SHOW_RECENT:false,',
            '  CARTRIDGE_CHANGE_DISABLED:true',
            '};',
            '<\/script>',
            '<div id="javatari-screen"></div>',
            '<script src="' + javatariSrc + '"><\/script>',
            '</body></html>',
        ].join('');

        _overlay.appendChild(iframe);
        _overlay.appendChild(_criarBotaoVoltar(function () {
            _renderizarSeletorROMs(_consoleSel);
        }));
    }

    // ---- Atari 5200 / 7800: EmulatorJS ----
    function _abrirJogoEJS(jogo, core, absRom) {
        // Botões EJS: apenas Restart
        var ejsButtons = JSON.stringify({
            playPause: false, restart: true,  mute: false, settings: false,
            fullscreen: false, saveState: false, loadState: false,
            screenRecord: false, gamepad: false, cheat: false,
            volume: false, netplay: false,
            saveSavFiles: false, loadSavFiles: false, quickSave: false,
            quickLoad: false, screenshot: false, cacheManager: false,
            exitEmulation: false,
        });

        // Gamepad: D-pad + Fire (Atari 5200/7800 usam joystick simples)
        var ejsGamepad = JSON.stringify([
            { type: 'dpad',   location: 'left',  inputValues: [4, 5, 6, 7] },
            { type: 'button', text: 'Fire', id: 'fire', location: 'right', input_value: 8 }
        ]);

        var iframe = document.createElement('iframe');
        Object.assign(iframe.style, {
            position: 'absolute', inset: '0',
            width: '100%', height: '100%',
            border: 'none',
        });
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('allow', 'autoplay; gamepad *');

        iframe.srcdoc = [
            '<!DOCTYPE html><html><head>',
            '<meta charset="utf-8">',
            '<meta name="viewport" content="width=device-width,initial-scale=1">',
            '<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">',
            '<style>',
            '*{margin:0;padding:0;box-sizing:border-box}',
            'body{background:#000;width:100%;height:100vh;overflow:hidden}',
            '#ejs-game{width:100%;height:100%;background:#000}',
            '.ejs_menu_bar,.ejs-menu{display:none!important}',
            'canvas{max-width:100%!important;display:block!important;margin:0 auto!important}',
            '.ejs_virtualGamepad_parent{top:55vh!important;bottom:56px!important;' +
            'height:auto!important;overflow:visible!important;background:#000!important;}',
            '.ejs_virtualGamepad_right,.ejs_virtualGamepad_left,.ejs_virtualGamepad_bottom{overflow:visible!important;}',
            '.ejs_virtualGamepad_button{border-radius:50%!important;' +
            'width:80px!important;height:80px!important;' +
            'border:2px solid rgba(255,255,255,.22)!important;' +
            'color:#fff!important;font-size:18px!important;font-weight:bold!important;' +
            'font-family:"Russo One",sans-serif!important;' +
            'display:flex!important;align-items:center!important;justify-content:center!important;' +
            'background:linear-gradient(145deg,#e94560,#b91c1c)!important;' +
            'box-shadow:0 0 26px rgba(233,69,96,.6),inset 0 -3px 6px rgba(0,0,0,.35)!important;}',
            '.ejs_dpad_bar{background:rgba(90,90,100,.75)!important;border-radius:6px!important;}',
            '.ejs_virtualGamepad_button_down{opacity:.65!important;transform:scale(.9)!important;}',
            '</style></head><body>',
            '<div id="ejs-game"></div>',
            '<script>',
            'window.EJS_player        = "#ejs-game";',
            'window.EJS_core          = ' + JSON.stringify(core) + ';',
            'window.EJS_gameUrl       = ' + JSON.stringify(absRom) + ';',
            'window.EJS_pathtodata    = ' + JSON.stringify(EJS_CDN) + ';',
            'window.EJS_color         = "#e94560";',
            'window.EJS_startOnLoaded = true;',
            'window.EJS_Buttons       = ' + ejsButtons + ';',
            'window.EJS_VirtualGamepadSettings = ' + ejsGamepad + ';',
            'window.EJS_onGameStart = function () {',
            '  var c = document.querySelector("canvas");',
            '  if (c) { c.setAttribute("tabindex","0"); c.focus(); }',
            '  setTimeout(function () {',
            '    var canvas = document.querySelector("canvas");',
            '    var gp     = document.querySelector(".ejs_virtualGamepad_parent");',
            '    if (canvas && gp) {',
            '      var rect = canvas.getBoundingClientRect();',
            '      var pct  = Math.ceil(((rect.bottom + 2) / window.innerHeight) * 100);',
            '      pct = Math.max(25, Math.min(60, pct));',
            '      gp.style.setProperty("top", pct + "vh", "important");',
            '    }',
            '  }, 700);',
            '};',
            '<\/script>',
            '<script src="' + EJS_CDN + 'loader.js"><\/script>',
            '</body></html>',
        ].join('');

        _overlay.appendChild(iframe);
        _overlay.appendChild(_criarBotaoVoltar(function () {
            _renderizarSeletorROMs(_consoleSel);
        }));
    }

    // ============================================================
    // Helper: botão voltar padrão
    // ============================================================
    function _criarBotaoVoltar(onClick) {
        var btn = document.createElement('button');
        btn.setAttribute('aria-label', 'Voltar');
        btn.innerHTML =
            '<span class="material-icons" style="font-size:18px;pointer-events:none;">arrow_back</span>' +
            '<span style="pointer-events:none;margin-left:5px;">Voltar</span>';
        Object.assign(btn.style, {
            position:   'fixed',
            top:        '16px',
            left:       '12px',
            zIndex:     '9200',
            display:    'flex',
            alignItems: 'center',
            padding:    '6px 14px',
            background: 'rgba(15,23,42,0.85)',
            border:     '1px solid rgba(255,255,255,0.28)',
            color:      '#f1f5f9',
            borderRadius: '20px',
            cursor:     'pointer',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent',
            minWidth:   '56px',
            minHeight:  '44px',
            fontSize:   '0.75rem',
            fontFamily: 'Inter,sans-serif',
            whiteSpace: 'nowrap',
        });
        btn.addEventListener('click', onClick);
        return btn;
    }

    // ============================================================
    // API pública
    // ============================================================
    var AtariGame = {
        abrir: function () {
            if (_overlay) return;
            _criarSeletorConsole();
        },

        fechar: function () {
            if (_onKey) {
                document.removeEventListener('keydown', _onKey);
                _onKey = null;
            }
            if (_overlay) {
                _overlay.remove();
                _overlay = null;
            }
            _consoleSel = null;
        }
    };

    window.AtariGame = AtariGame;

})();
