# GymTrack Frontend

Interface responsiva para registrar treinos, séries, repetições e cargas.
Construída com React, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts e
TanStack Query. A fonte de verdade é a API Go em `/api/v1`.

## Executar localmente

```bash
npm install
npm run dev
```

O proxy de desenvolvimento encaminha `/api` para `http://localhost:8080`. Use
`VITE_API_URL` conforme o exemplo em `.env.example` quando precisar de outra URL.

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
- Cadastro, login, renovação de sessão e logout.
- Persistência no PostgreSQL por meio da API, com retomada de treino após reload.

## Organização

- `src/components/ui`: componentes instalados pelo shadcn/ui.
- `src/components/workout`: experiência de execução do treino.
- `src/context`: composição do estado de servidor usado pelas telas.
- `src/features/auth`: sessão do usuário e rotas protegidas.
- `src/features/gym`: contratos e operações da ficha de treino.
- `src/features/workout`: operações da sessão de treino.
- `src/services/http`: cliente HTTP, refresh single-flight e erros tipados.
- `src/pages`: páginas de treino e configuração.
- `src/types`: contratos de dados.
- `.agents`: responsabilidades para agentes de desenvolvimento.

O access token permanece apenas em memória e o refresh token fica em cookie
`HttpOnly`; não há persistência da aplicação em Web Storage.
