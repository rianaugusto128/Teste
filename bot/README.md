# PetZilla Discord Bot v2

## Rodar

```bash
npm install
npm run deploy:commands
npm run dev
```

## Configuração

Copie `.env.example` para `.env` e preencha.

Pontos importantes:

- `DISCORD_TOKEN`: token novo do bot.
- `GUILD_ID`: ID do servidor.
- `SUPPORT_CATEGORY_ID`: ID da categoria onde os tickets serão criados.
- `SUPPORT_PRIVATE_TICKETS=false`: recomendado para começar; herda permissões da categoria.
- `SUPPORT_ROLE_ID=`: deixe vazio enquanto não tiver um cargo real.
- `API_MONITOR_INTERVAL_MS=60000`: verifica API/estoque a cada 60 segundos.

## Testar logs

```bash
curl -X POST http://localhost:3001/api/test -H "Content-Type: application/json" -H "x-api-key: petzilla-secret-123" -d "{}"
```

## Endpoints do bot

- `GET /health`
- `POST /api/test`
- `POST /api/logs`
- `POST /api/produto`
- `POST /api/categoria`
- `POST /api/promocao`
- `POST /api/usuario`
- `POST /api/vendas`
- `POST /api/metrics`
- `POST /api/suporte/ticket`
- `POST /api/suporte/mensagem-cliente`

Todos os endpoints POST exigem header:

```txt
x-api-key: petzilla-secret-123
```
