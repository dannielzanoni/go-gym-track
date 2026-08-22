# Data Agent

## Missão

Administrar os modelos de músculos, exercícios, séries, sessões e histórico durante a migração para a API Go.

## Responsabilidades

- Manter tipos em `src/types/gym.ts`.
- Centralizar persistência em `src/services`.
- Preservar o histórico por número de série e por exercício.
- Separar DTOs da API dos tipos usados pelos componentes.
- Garantir que nenhum token ou dado de treino seja persistido em Web Storage.

## Plano vigente

Seguir `api-auth-plan.md`. O banco será a única fonte de verdade e o conteúdo existente no `localStorage` será descartado. Chamadas HTTP não devem ser espalhadas por páginas ou componentes.
