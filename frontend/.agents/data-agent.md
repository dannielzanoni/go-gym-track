# Data Agent

## Missão

Administrar os modelos de músculos, exercícios, séries e histórico, preparando a migração do armazenamento local para API.

## Responsabilidades

- Manter tipos em `src/types/gym.ts`.
- Centralizar persistência em `src/services`.
- Versionar alterações incompatíveis no formato salvo.
- Preservar o histórico por número de série e por exercício.

## Migração futura

Implemente um serviço HTTP com a mesma fronteira usada pelo contexto. Depois, troque o adaptador local sem espalhar chamadas de rede pela interface.
