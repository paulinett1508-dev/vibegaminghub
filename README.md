# Joguinhos do Jose

Mini-games para criancas, extraidos do [Super Cartola Manager](https://github.com/paulinett1508-dev/SuperCartolaManagerv5). Deploy via Vercel.

## Jogos Disponiveis

### Penaltis
Jogo arcade 8-bit de cobranca de penaltis em canvas.

- **Modos:** Cobrador (striker) e Goleiro (keeper)
- **Dificuldades:** Facil, Medio, Dificil, Muito Dificil
- **Controles:** Mouse/touch (clique nas zonas do gol) + Teclado (Q/W/E + A/S/D = grid 3x3)
- **Canvas:** 360x240px

### Escorpiao
Canvas interativo fullscreen onde um escorpiao segue o mouse.

- **Estrutura:** 16 segmentos (1 cabeca + 8 corpo com patas + 6 cauda com ferrao)
- **Controles:** Mouse/touch para guiar, ESC para sair
- **Efeitos:** Patas animadas, ferrao com glow, olhos com reflexo, garras articuladas

### Reptil
Lagarto procedural com inverse kinematics — pernas que caminham de verdade.

- **Fisica:** IK esqueletica com hierarquia pai-filho de segmentos
- **Pernas:** Auto-stepping procedural (2-5 pares, aleatorio a cada sessao)
- **Cauda:** Comprimento variavel proporcional ao corpo
- **Visual:** Neon verde wireframe com glow sobre fundo escuro
- **Controles:** Mouse/touch para guiar, ESC para sair
- **Inspirado em:** [Reptile Interactive Cursor](https://github.com/Lokesh-reddy18/Reptile-Cursor) (MIT)

### Pac-Man
Pac-Man simplificado para criancas em canvas fullscreen.

- **Mapa:** Grid 19x21 com paredes, pellets e power pellets
- **Fantasmas:** 4 fantasmas com IA basica (chase/scatter/scared)
- **Fases:** 3 fases progressivas, 3 vidas
- **Controles:** Mouse/touch para direcionar, ESC para sair

## Como Usar

### Demo rapida
Abra `index.html` no navegador (ou acesse via Vercel).

### Integracao em projeto
```html
<!-- Dependencias: Google Fonts + Material Icons -->
<link href="https://fonts.googleapis.com/css2?family=Russo+One&family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">

<!-- Scripts dos jogos -->
<script src="jogos/penaltis.js"></script>
<script src="jogos/escorpiao.js"></script>
<script src="jogos/reptil.js"></script>
<script src="jogos/pacman.js"></script>
<script src="jogos/joguinhos-modal.js"></script>
```

### API

```javascript
// Abrir modal de selecao de jogos
window.abrirJoguinhos();

// Penaltis direto (passar ID ou elemento DOM do container)
window.PenaltisGame.abrir('meu-container');
window.PenaltisGame.fechar();

// Escorpiao direto (fullscreen)
window.EscorpiaoGame.abrir();
window.EscorpiaoGame.fechar();

// Reptil direto (fullscreen)
window.ReptilGame.abrir();
window.ReptilGame.fechar();

// Pac-Man direto (fullscreen)
window.PacmanGame.abrir();
window.PacmanGame.fechar();
```

## Estrutura

```
index.html              # Pagina principal
vercel.json             # Config Vercel (headers/cache)
jogos/
  penaltis.js           # Jogo de Penaltis standalone
  escorpiao.js          # Jogo Escorpiao standalone
  reptil.js             # Jogo Reptil standalone (IK procedural)
  pacman.js             # Jogo Pac-Man standalone
  joguinhos-modal.js    # Modal de selecao de jogos
assets/
  sons/                 # Futuros arquivos de audio
docs/
  ORIGEM.md             # Referencia de onde cada codigo veio
```

## Origem

Codigo extraido de `SuperCartolaManagerv5` onde os joguinhos apareciam em dois contextos:
1. **Tela de manutencao** — Penaltis disponivel para todos os usuarios quando o sistema estava em manutencao
2. **Chip "Joguinhos" na home** — Penaltis + Escorpiao disponiveis para usuarios Premium (Cartola PRO)

Detalhes completos em [`docs/ORIGEM.md`](docs/ORIGEM.md).

## Tech Stack

- Vanilla JS (zero dependencias)
- Canvas 2D API
- Web Audio API (sons programaticos)
- Material Icons (via CDN)
- Google Fonts: Russo One, Inter, JetBrains Mono
- Deploy: Vercel (site estatico)
