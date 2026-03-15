// =====================================================================
// atari.js — Emulador Atari 2600 via EmulatorJS (CDN)
// =====================================================================
// Usa o core 'stella' (RetroArch/WASM) carregado dinamicamente.
// ROMs ficam em assets/roms/atari/ (ex: pong.bin, breakout.bin)
//
// Arquitetura: seletor de jogo → iframe srcdoc fullscreen
//   1. abrir()        → mostra grid de jogos disponíveis
//   2. _abrirJogo()   → cria iframe com EmulatorJS + ROM escolhida
//   3. fechar()       → remove overlay (chamado via history.back() / joguinhos-modal)
//
// Controles Atari 2600 (joystick + 1 botão):
//   - D-pad: esquerda, direita, cima, baixo
//   - Fire:  botão único (vermelho)
//
// Para adicionar uma ROM: colocar o arquivo .bin em assets/roms/atari/
// e adicionar uma entrada em ROMS_ATARI com o caminho correto.
// =====================================================================

(function () {
    'use strict';

    var EJS_CDN = 'https://cdn.emulatorjs.org/stable/data/';

    // ---- Configuracao dos jogos ----
    // Adicione aqui os jogos que tiver em assets/roms/atari/
    var ROMS_ATARI = [
        {
            id:   'pong',
            nome: 'Pong',
            rom:  'assets/roms/atari/pong.bin',
            icon: 'sports_tennis',
            cor:  '#38bdf8'
        },
        {
            id:   'breakout',
            nome: 'Breakout',
            rom:  'assets/roms/atari/breakout.bin',
            icon: 'sports_baseball',
            cor:  '#34d399'
        },
        {
            id:   'invaders',
            nome: 'Invasores',
            rom:  'assets/roms/atari/spaceinvaders.bin',
            icon: 'rocket_launch',
            cor:  '#818cf8'
        },
        {
            id:   'pacman',
            nome: 'Pac-Man',
            rom:  'assets/roms/atari/pacman.bin',
            icon: 'circle',
            cor:  '#fbbf24'
        },
        {
            id:   'pitfall',
            nome: 'Pitfall',
            rom:  'assets/roms/atari/pitfall.bin',
            icon: 'forest',
            cor:  '#4ade80'
        },
        {
            id:   'kaboom',
            nome: 'Kaboom',
            rom:  'assets/roms/atari/kaboom.bin',
            icon: 'local_fire_department',
            cor:  '#f87171'
        }
    ];

    // ---- Estado ----
    var _overlay = null;
    var _onKey   = null;

    // ---- Seletor de jogos ----
    function _criarSeletor() {
        _overlay = document.createElement('div');
        _overlay.id = 'atari-overlay';
        Object.assign(_overlay.style, {
            position:   'fixed',
            inset:      '0',
            zIndex:     '9000',
            background: '#0f172a',
            display:    'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            overflowY:  'auto',
            padding:    '72px 24px 40px',
            WebkitTapHighlightColor: 'transparent',
        });
        document.body.appendChild(_overlay);

        // Cabeçalho
        var header = document.createElement('div');
        header.style.cssText = 'text-align:center;margin-bottom:32px;width:100%;';
        header.innerHTML =
            '<div style="font-family:\'Russo One\',sans-serif;font-size:30px;' +
            'color:#e94560;letter-spacing:2px;text-shadow:0 0 20px rgba(233,69,96,.4);">' +
            'ATARI 2600</div>' +
            '<div style="font-family:Inter,sans-serif;font-size:14px;color:#94a3b8;margin-top:8px;">' +
            'Escolha um jogo</div>';
        _overlay.appendChild(header);

        // Grid 2 colunas
        var grid = document.createElement('div');
        grid.style.cssText =
            'display:grid;grid-template-columns:repeat(2,1fr);gap:16px;' +
            'width:100%;max-width:420px;';

        ROMS_ATARI.forEach(function (jogo) {
            var card = document.createElement('button');
            Object.assign(card.style, {
                background:    'rgba(255,255,255,0.04)',
                border:        '2px solid ' + jogo.cor + '55',
                borderRadius:  '18px',
                padding:       '28px 12px',
                cursor:        'pointer',
                display:       'flex',
                flexDirection: 'column',
                alignItems:    'center',
                gap:           '12px',
                minHeight:     '120px',
                transition:    'background 0.2s,border-color 0.2s,transform 0.1s',
                touchAction:   'manipulation',
                WebkitTapHighlightColor: 'transparent',
            });
            card.innerHTML =
                '<span class="material-icons" style="font-size:44px;color:' + jogo.cor + ';' +
                'text-shadow:0 0 16px ' + jogo.cor + '88;">' + jogo.icon + '</span>' +
                '<span style="font-family:\'Russo One\',sans-serif;font-size:13px;' +
                'color:#f1f5f9;text-align:center;line-height:1.2;">' + jogo.nome + '</span>';

            card.addEventListener('mouseenter', function () {
                card.style.background     = jogo.cor + '20';
                card.style.borderColor    = jogo.cor + 'aa';
                card.style.transform      = 'scale(1.03)';
            });
            card.addEventListener('mouseleave', function () {
                card.style.background     = 'rgba(255,255,255,0.04)';
                card.style.borderColor    = jogo.cor + '55';
                card.style.transform      = 'scale(1)';
            });
            card.addEventListener('click', function () { _abrirJogo(jogo); });
            card.addEventListener('touchend', function (e) {
                e.preventDefault();
                _abrirJogo(jogo);
            });

            grid.appendChild(card);
        });

        _overlay.appendChild(grid);

        // Botão voltar (topo esquerdo)
        var backBtn = _criarBotaoVoltar(function () { history.back(); });
        _overlay.appendChild(backBtn);

        // ESC sai
        _onKey = function (e) {
            if (e.key === 'Escape' && e.target === document.body) history.back();
        };
        document.addEventListener('keydown', _onKey);
    }

    // ---- Emulador ----
    function _abrirJogo(jogo) {
        // Limpa seletor (reusa overlay)
        _overlay.innerHTML = '';
        Object.assign(_overlay.style, {
            padding:        '0',
            justifyContent: 'center',
            overflowY:      'hidden',
        });

        var absRom = new URL(jogo.rom, window.location.href).href;

        // Botões EJS: só Restart visível
        var ejsButtons = JSON.stringify({
            playPause: false, restart: true, mute: false, settings: false,
            fullscreen: false, saveState: false, loadState: false,
            screenRecord: false, gamepad: false, cheat: false,
            volume: false, netplay: false,
            saveSavFiles: false, loadSavFiles: false, quickSave: false,
            quickLoad: false, screenshot: false, cacheManager: false,
            exitEmulation: false,
        });

        // Gamepad Atari 2600: D-pad + Fire
        var ejsGamepad = JSON.stringify([
            { type: 'dpad',   location: 'left',  inputValues: [4, 5, 6, 7] },
            { type: 'button', text: 'Fire', id: 'fire', location: 'right', input_value: 8 }
        ]);

        // iframe fullscreen com EmulatorJS (stella = Atari 2600)
        var iframe = document.createElement('iframe');
        Object.assign(iframe.style, {
            position: 'absolute',
            inset:    '0',
            width:    '100%',
            height:   '100%',
            border:   'none',
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
            // Esconde toolbar do EJS
            '.ejs_menu_bar,.ejs-menu{display:none!important}',
            // Canvas centralizado
            'canvas{max-width:100%!important;display:block!important;margin:0 auto!important}',
            // Gamepad container
            '.ejs_virtualGamepad_parent{',
            '  top:55vh!important;bottom:56px!important;',
            '  height:auto!important;overflow:visible!important;',
            '  background:#000!important;',
            '}',
            '.ejs_virtualGamepad_right,.ejs_virtualGamepad_left,.ejs_virtualGamepad_bottom{',
            '  overflow:visible!important;',
            '}',
            // Botão Fire
            '.ejs_virtualGamepad_button{',
            '  border-radius:50%!important;',
            '  width:80px!important;height:80px!important;',
            '  border:2px solid rgba(255,255,255,.22)!important;',
            '  color:#fff!important;',
            '  font-size:18px!important;font-weight:bold!important;',
            '  font-family:"Russo One",sans-serif!important;',
            '  display:flex!important;align-items:center!important;justify-content:center!important;',
            '  background:linear-gradient(145deg,#e94560,#b91c1c)!important;',
            '  box-shadow:0 0 26px rgba(233,69,96,.6),inset 0 -3px 6px rgba(0,0,0,.35)!important;',
            '}',
            '.ejs_dpad_bar{',
            '  background:rgba(90,90,100,.75)!important;border-radius:6px!important;',
            '}',
            '.ejs_virtualGamepad_button_down{',
            '  opacity:.65!important;transform:scale(.9)!important;',
            '}',
            '</style></head><body>',
            '<div id="ejs-game"></div>',
            '<script>',
            'window.EJS_player        = "#ejs-game";',
            'window.EJS_core          = "stella";',
            'window.EJS_gameUrl       = ' + JSON.stringify(absRom) + ';',
            'window.EJS_pathtodata    = ' + JSON.stringify(EJS_CDN) + ';',
            'window.EJS_color         = "#e94560";',
            'window.EJS_startOnLoaded = true;',
            'window.EJS_Buttons       = ' + ejsButtons + ';',
            'window.EJS_VirtualGamepadSettings = ' + ejsGamepad + ';',
            // Foca canvas ao iniciar + reposiciona gamepad
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

        // Botão Sair (top-left)
        var exitBtn = _criarBotaoVoltar(function () { history.back(); });
        _overlay.appendChild(exitBtn);
    }

    // ---- Helpers ----
    function _criarBotaoVoltar(onClick) {
        var btn = document.createElement('button');
        btn.setAttribute('aria-label', 'Sair do jogo');
        btn.innerHTML =
            '<span class="material-icons" style="font-size:18px;pointer-events:none;">arrow_back</span>' +
            '<span style="pointer-events:none;margin-left:5px;">Sair</span>';
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

    // ---- API pública ----
    var AtariGame = {
        abrir: function () {
            if (_overlay) return;
            _criarSeletor();
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
        }
    };

    window.AtariGame = AtariGame;

})();
