# ROMs Atari

Coloque os arquivos de ROM nas subpastas correspondentes.

---

## Atari 5200 — `5200/*.bin`

Core EmulatorJS: `atari800`

| Arquivo esperado        | Jogo            |
|-------------------------|-----------------|
| `pacman.a52`            | Pac-Man         |
| `berzerk.a52`           | Berzerk         |
| `galaxian.a52`          | Galaxian        |
| `spaceinvaders.a52`     | Space Invaders  |
| `missilecommand.a52`    | Missile Command |
| `ballblazer.a52`        | Ballblazer      |

---

## Atari 7800 — `7800/*.a78`

Donkey Kong agora e jogo standalone no hub (`jogos/donkeykong.js`).

---

## Como adicionar novos jogos

1. Coloque o arquivo `.bin` na pasta `5200/`
2. Adicione uma entrada no array `roms` em `jogos/atari.js`

## Licenca

ROMs comerciais sao propriedade dos detentores originais (Atari, Inc. / Atari SA).
Nao inclua ROMs comerciais neste repositorio sem autorizacao explicita.
