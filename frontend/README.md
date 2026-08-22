# GymTrack

Aplicação responsiva para registrar treinos, séries, repetições e cargas. Construída com React, TypeScript, Vite, Tailwind CSS, shadcn/ui e Recharts.

## Executar localmente

```bash
npm install
npm run dev
```

Para gerar a versão de produção:

```bash
npm run build
```

## Fluxos disponíveis

- Alternância entre fichas de músculos na tela inicial.
- Edição de exercício, repetições e carga em modal.
- Checkbox por série e progresso por exercício.
- Gráfico linear do histórico específico de cada série.
- Finalização liberada ao concluir 10 ou mais séries do músculo selecionado.
- Cadastro, edição, exclusão e reordenação de músculos, exercícios e séries.
- Persistência local e dados demonstrativos iniciais.

## Organização

- `src/components/ui`: componentes instalados pelo shadcn/ui.
- `src/components/workout`: experiência de execução do treino.
- `src/context`: estado e regras do domínio.
- `src/services`: adaptadores de persistência.
- `src/pages`: páginas de treino e configuração.
- `src/types`: contratos de dados.
- `.agents`: responsabilidades para agentes de desenvolvimento.

O acesso ao `localStorage` está isolado em `src/services/gym-storage.ts`, facilitando a substituição futura por um cliente HTTP.
