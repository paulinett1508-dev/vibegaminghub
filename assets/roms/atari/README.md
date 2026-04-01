# ROMs Atari

Coloque os arquivos de ROM nas subpastas correspondentes ao console.

---

## Atari 5200 — `5200/*.a52`

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

Core EmulatorJS: `prosystem`

| Arquivo esperado        | Jogo            |
|-------------------------|-----------------|
| `pacman.a78`            | Pac-Man         |
| `centipede.a78`         | Centipede       |
| `digdug.a78`            | Dig Dug         |
| `foodfight.a78`         | Food Fight      |
| `poleposition.a78`      | Pole Position   |
| `asteroids.a78`         | Asteroids       |

---

## Como adicionar novos jogos

1. Coloque o arquivo `.a26` / `.a52` / `.a78` na pasta correta
2. Adicione uma entrada no array `roms` do console correspondente em `jogos/atari.js`

## Licenca

ROMs comerciais sao propriedade dos detentores originais (Atari, Inc. / Atari SA).
Nao inclua ROMs comerciais neste repositorio sem autorizacao explicita.
