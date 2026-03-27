// Jogo Arco e Flecha
// O jogo roda em iframe isolado (jogos/arco-game.html).
// Este módulo só gerencia o overlay e o botão fechar.

(function () {
    'use strict';

    var overlay = null;
    var _onKey  = null;

    function abrir() {
        if (overlay) return;

        overlay = document.createElement('div');
        overlay.id = 'arco-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;background:#222;overflow:hidden;';

        // iframe com o jogo (domínio isolado: sem conflitos de IDs ou GSAP)
        var iframe = document.createElement('iframe');
        iframe.src = 'jogos/arco-game.html';
        iframe.setAttribute('allow', 'autoplay');
        iframe.setAttribute('allowtransparency', 'false');
        iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:none;display:block;';
        overlay.appendChild(iframe);

        // Botão fechar (fora do iframe — sem interferência de eventos do jogo)
        var btnFechar = document.createElement('button');
        btnFechar.innerHTML = '<span class="material-icons" style="font-size:20px;line-height:1;">close</span>';
        btnFechar.setAttribute('aria-label', 'Fechar');
        btnFechar.style.cssText = [
            'position:absolute', 'top:16px', 'right:16px',
            'width:64px', 'height:64px',
            'background:rgba(255,255,255,0.2)',
            'border:none', 'border-radius:50%',
            'color:#fff', 'cursor:pointer', 'z-index:10',
            'display:flex', 'align-items:center', 'justify-content:center'
        ].join(';');
        btnFechar.onclick = function () {
            window.fecharJoguinhos ? window.fecharJoguinhos() : fechar();
        };
        overlay.appendChild(btnFechar);

        document.body.appendChild(overlay);

        _onKey = function (e) {
            if (e.key === 'Escape') {
                window.fecharJoguinhos ? window.fecharJoguinhos() : fechar();
            }
        };
        document.addEventListener('keydown', _onKey);
    }

    function fechar() {
        if (_onKey) { document.removeEventListener('keydown', _onKey); _onKey = null; }
        if (overlay) {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            overlay = null;
        }
    }

    window.ArcoGame = { abrir: abrir, fechar: fechar };
})();
