# Bandeira Beach House — Contexto do Projeto para Claude

## 📝 REGRA DE OURO: MANTER ESTE ARQUIVO ATUALIZADO
- **SEMPRE** atualize este `CLAUDE.md` quando fizer mudanças significativas no sistema:
  - Novos recursos ou abas
  - Novas regras de negócio (permissões, validações)
  - Preferências do usuário descobertas na conversa
  - Bugs recorrentes e como resolvê-los
  - Mudanças de arquitetura (tabelas, campos novos, paths)
- Bruno não precisa pedir — é sua responsabilidade manter o contexto vivo pra próximas sessões
- Formato: adicione em seção existente OU crie seção nova se for tópico novo

## ⚠️ REGRAS CRÍTICAS DE TRABALHO (ler SEMPRE antes de começar)

### 🚀 Deploy: Mudanças SÓ vão pro ar quando estão em `main`
- **Hospedagem real**: GitHub Pages serve a partir da branch **`main`**
- URL de produção: `https://brunohrb.github.io/bandeirabeachhouse/`
- Se commitar em branch de feature (ex: `claude/fix-xxx`) e não fizer merge → **o usuário NÃO vê nada mudando**
- **Fluxo padrão**: fazer as mudanças na branch de dev → merge em `main` → push `main` → pronto
- Não perder tempo perguntando "PR ou merge direto?" — o Bruno prefere merge direto no `main` pra ir logo pro ar
- Comando: `git checkout main && git merge <branch-dev> --no-ff -m "..." && git push origin main`

### 🧊 Cache do Service Worker é AGRESSIVO
- Qualquer mudança em `index.html`/`movi.html`/`service-worker.js` exige:
  1. Bump do `CACHE_NAME` em `service-worker.js` (v6 → v7...)
  2. Usuário precisa: Ctrl+Shift+R ou botão "🔄 Limpar cache e recarregar" em Configurações
- O app já tem auto-update a cada 30s e recarrega sozinho quando detecta SW novo
- Se o usuário diz "não apareceu nada" mesmo depois do push, é 99% cache — oriente o hard refresh

### 🔒 RLS do Supabase precisa estar permissivo
O app autentica pelo próprio login (tabela `usuarios`). As tabelas precisam liberar anon/authenticated:
```sql
-- Rodar no SQL Editor do Supabase (1 vez só)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "usuarios_all_anon" ON usuarios;
CREATE POLICY "usuarios_all_anon" ON usuarios FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reservas_all_anon" ON reservas;
CREATE POLICY "reservas_all_anon" ON reservas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER TABLE unidades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "unidades_select_anon" ON unidades;
CREATE POLICY "unidades_select_anon" ON unidades FOR SELECT TO anon, authenticated USING (true);
```

### 🗃️ `id_reserva` NÃO tem UNIQUE constraint no banco
- **NÃO usar** `db.from('reservas').upsert(..., { onConflict: 'id_reserva' })`
- **Erro típico**: `there is no unique or exclusion constraint matching the ON CONFLICT specification`
- **Padrão correto**: `DELETE` pelos `id_reserva` que vai inserir → `INSERT` em lote
```javascript
const idsNovos = registros.map(r => r.id_reserva);
await db.from('reservas').delete().eq('unidade_id', uid).in('id_reserva', idsNovos);
await db.from('reservas').insert(registros);
```

### 📁 Onde ficam arquivos críticos
- **Arquivos servidos pelo Pages**: raiz do repo (`index.html`, `movi.html`, `service-worker.js`, `manifest.webmanifest`)
- **Paths no manifest/SW**: SEMPRE relativos (`./index.html`, scope `./`) porque GitHub Pages serve em subpath `/bandeirabeachhouse/`
- **iOS Safari**: start_url absoluto (`/index.html`) dá 404 — usar `./index.html`

### 👥 Tipos de usuário
- **admin** (`tipo='admin'`): vê todas as abas e todas as unidades (`unidades_permitidas=null`)
- **viewer** (`tipo='viewer'`): só NÃO vê Configurações e Upload de Dados (as outras 7 abas aparecem)
- Modal Novo/Editar Usuário tem checkbox 👑 Administrador que alterna o tipo

### 🤝 Preferências do usuário (Bruno)
- Escreve em português
- Prefere ação direta — se precisa de autorização pra algo (ex: mexer em `main`), avisa brevemente e faz
- Odeia cache travando — sempre orientar hard refresh quando mudança não aparecer
- Abas do menu (em ordem): Financeiro → Analítica → Despesas → Reservas Futuras → Consolidado → Calendário → Upload → Configurações → Sair

## O que é este projeto
Sistema de gestão de uma pousada/aparthotel (Bandeira Stay) com múltiplas unidades.
PWA (Progressive Web App) em vanilla JS + Supabase como backend.
Arquivo principal: `index.html` (~9700+ linhas, tudo em um arquivo).

## Stack técnica
- **Frontend**: Vanilla JS, HTML, CSS — SPA sem frameworks
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **OTA/PMS**: Smoobu (sistema de gestão de reservas)
- **Hosting**: **GitHub Pages** (branch `main`) em `brunohrb.github.io/bandeirabeachhouse/`
- **Sync automático**: GitHub Actions (roda de hora em hora via `scripts/smoobu-sync.js`)

## Arquivos principais
```
index.html                                 # App inteiro (HTML + CSS + JS)
movi.html                                  # Página standalone do Ricardo (Movi 505)
supabase/functions/smoobu-proxy/index.ts   # Edge Function proxy pra API do Smoobu
supabase/functions/admin-users/index.ts    # Edge Function criar usuários via service_role
scripts/smoobu-sync.js                     # Sync automático via GitHub Actions
scripts/daily-backup.js                    # Backup Excel diário via GitHub Actions
service-worker.js                          # Service Worker (PWA + push notifications)
manifest.webmanifest                       # PWA manifest
CLAUDE.md                                  # Este arquivo
```

## Supabase
- **URL**: ver `index.html` — constante `SUPABASE_URL`
- **Anon key**: ver `index.html` — constante `SUPABASE_ANON_KEY` *(não colocar aqui — vai para o GitHub)*
- **Edge Function URL**: `{SUPABASE_URL}/functions/v1/smoobu-proxy`
- **Deploy Edge Function**: Supabase Dashboard → Edge Functions → smoobu-proxy → Edit → colar index.ts → Deploy
- **SMOOBU_API_KEY**: armazenada como secret no Supabase (nunca exposta no código)

## Tabelas Supabase principais
- `reservas` — todas as reservas (unidade_id, id_reserva, hospede, chegada, partida, receita, canal, status)
- `unidades` — lista de unidades (id, nome)
- `despesas` — despesas operacionais
- `configuracao` — configs gerais

## Unidades do sistema
| Unidade | Smoobu? | Origem dados |
|---------|---------|--------------|
| Apto 103-F | ✅ Sim | Smoobu sync |
| Apto 201-H | ✅ Sim | Smoobu sync |
| Apto 102-C | ✅ Sim | Smoobu sync |
| Casa 2.7 | ✅ Sim | Smoobu sync |
| Casa 2.5 | ✅ Sim | Smoobu sync |
| Apto 104-G | ✅ Sim | Smoobu sync |
| Movi 505 | ❌ Não | Upload manual (CSV) |

**IMPORTANTE**: Movi 505 NÃO está no Smoobu. Dados vêm de upload manual.
O sync do Smoobu deve SEMPRE pular unidades com "Movi" no nome.
Reservas Movi: `id_reserva` = `MOVI_YYYYMM_DD-DD_valor` (datas codificadas no ID).

## Edge Function — Ações disponíveis (smoobu-proxy)
| Ação | Método Smoobu | Descrição |
|------|--------------|-----------|
| `getReservations` | GET /api/reservations | Busca reservas por período |
| `getApartments` | GET /api/apartments | Lista apartamentos |
| `getChannels` | GET /api/channels | Lista canais/portais |
| `createBlock` | POST /api/reservations | Cria bloqueio (channelId: 70) |
| `createReservation` | POST /api/reservations | Cria reserva manual |
| `deleteReservation` | DELETE /api/reservations/{id} | Apaga reserva |
| `updateReservation` | PUT /api/reservations/{id} | Atualiza reserva |
| `getRates` | GET /api/rates | Busca tarifas (usa `apartments[]`) |
| `updateRates` | POST /api/rates | Atualiza tarifas |
| `getThreads` | GET /api/threads | Lista threads de mensagens |
| `getMessages` | GET /api/reservations/{id}/messages | Mensagens de uma reserva |
| `sendMessage` | POST /api/reservations/{id}/messages/send-message-to-guest | Envia mensagem |

## API Smoobu — Formatos importantes
```typescript
// updateRates — FORMATO CORRETO (não mudar)
{
  apartments: [Number(apartmentId)],  // array de números, não strings
  operations: [{
    dates: ["YYYY-MM-DD"] ou ["YYYY-MM-DD:YYYY-MM-DD"],
    daily_price: Number(preco),        // opcional — omitir se não quer alterar
    min_length_of_stay: Number(minStay), // opcional — omitir se não quer alterar
  }]
}

// getRates — parâmetro correto
params.append("apartments[]", String(apartmentId))  // com [] no nome

// createBlock — parâmetros
{ apartmentId, arrivalDate: "YYYY-MM-DD", departureDate: "YYYY-MM-DD" }
// departureDate = último dia + 1 (padrão Smoobu)

// Threads response
{ page_number, page_size, total_threads, threads: [
  { booking: { id, guest_name }, apartment: { id, name }, latest_message: { text_content, created_at } }
]}

// Messages response
{ page_count, total_items, messages: [
  { id, subject, message, messageHtml, type }  // type: 1=inbox, 2=outbox
]}
```

## Calendário de Reservas (index.html)
- **Localização JS**: linha ~5400 em diante, dentro de `(function() { ... })()`
- **Estado**: `calAno`, `calMes`, `calReservas`, `calUnidades`, `calSyncing`
- **Ordem das unidades**: `["103", "201", "102", "2.7", "2.5", "104", "Movi"]`
- **Auto-sync**: abre calendário → sync imediato + a cada 3 minutos

### Tabs do calendário
| Tab | ID container | Função ao abrir |
|-----|-------------|-----------------|
| 📅 Reservas | `calReservasContainer` | `renderCalendario()` |
| 💰 Preços | `calPrecosContainer` | `carregarPrecos()` |
| 💬 Mensagens | `calMsgsContainer` | `carregarThreads()` |

## Bloqueios automáticos de limpeza
Casa 2.5 e Casa 2.7 têm bloqueio automático de limpeza no Smoobu:
- 1 dia ANTES do check-in
- 1 dia DEPOIS do check-out
Esses bloqueios são **renderizados visualmente** no calendário (barra cinza "Limpeza")
mas NÃO são salvos no banco. Função: `renderBarrasReserva()`.

## Reservas — Identificação
- Reservas do Smoobu: `id_reserva` = ID numérico do Smoobu (ex: "12345678")
- Reservas manuais: `id_reserva` = prefixo "manual-" + UUID
- Reservas Movi: `id_reserva` = `MOVI_YYYYMM_DD-DD_valor` (datas extraídas com regex)
- O sync do Smoobu deleta apenas onde `id_reserva NOT LIKE 'manual-%'` E unidade NÃO é Movi

## Cores dos canais no calendário
| Canal | Classe CSS | Cor |
|-------|-----------|-----|
| Booking.com | `.booking` | #1976D2 (azul) |
| Airbnb | `.airbnb` | #FF5A5F (rosa) |
| Direto | `.direto` | #4CAF50 (verde) |
| Expedia | `.expedia` | #FBC02D (amarelo) |
| Bloqueio | `.bloqueio` | #9E9E9E (cinza) |
| Outros | `.outros` | #9E9E9E (cinza) |

## Aba de Preços (layout estilo Smoobu)
- `precosCache`: `{ smoobuApartmentId: { 'YYYY-MM-DD': { price, minStay, available } } }`
- `available = 0` → data ocupada; `available = 1` → data livre
- Layout: por unidade, 3 linhas — header de datas / 🌙 min noites / 📷 preço/noite
- Datas no formato `DD/MM`; fins de semana com fundo cinza; hoje em azul
- Barra colorida acima da data quando ocupada (cor do canal)
- **Edição inline**: clicar na célula → input editável; Tab avança para próxima célula
- **Pending queue**: `pendingPrecoChanges = { 'aptId_date': { aptId, date, price, minStay } }`
  - `price: null` = não alterar o preço; `minStay: null` = não alterar o minStay
  - Célula laranja = alteração pendente não sincronizada
- **Barra de pendentes**: `#precoPendingBar` — botão "Sincronizar" envia tudo ao Smoobu
- **Bloqueio**: arrastar para selecionar dias → botão "🔒 Bloquear" na bulk bar
- Scroll automático para hoje ao abrir
- Não inclui Movi 505 (sem tarifas no Smoobu)

### Classes CSS da grade de preços
```
.preco-apt-block   — bloco de uma unidade (card com sombra)
.preco-row         — linha flex (row-header / row-min / row-price)
.preco-stub        — coluna esquerda fixa (sticky, width: 145px)
.preco-date-col    — coluna de uma data (.weekend para fim de semana)
.preco-occ-bar     — barra colorida de ocupação (4px altura)
.preco-date-label  — label "DD/MM" (.today / .weekend)
.preco-box         — célula editável (.today / .weekend / .pending / .no-val)
.preco-pending-bar — barra flutuante de alterações pendentes
```

### Funções JS de preços
```javascript
carregarPrecos()              // Carrega rates do Smoobu + renderiza
renderGradePrecos(apts, dias, ocupacaoCanal)  // Renderiza o grid
editarBoxInline(box, aptId, aptName, date, field)  // field='price' ou 'min'
adicionarPendingPreco(aptId, date, field, val)     // Adiciona ao queue
sincronizarPrecosPendentes()  // Envia tudo ao Smoobu
descartarPrecosPendentes()    // Descarta alterações
bloquearDatasSelecao()        // Bloqueia datas selecionadas via drag
```

## Aba de Mensagens
- Carrega threads do Smoobu (Booking.com, Airbnb, etc.)
- Estrutura thread: `{ booking: { id, guest_name }, apartment: { name }, latest_message: { text_content } }`
- Envia via: `POST /api/reservations/{id}/messages/send-message-to-guest`
- Body: `{ messageBody: string, subject?: string }`

## Sistema de Notificações
- **Nova reserva**: Supabase Realtime — `INSERT` na tabela `reservas` → toast + notificação browser
- **Nova mensagem**: polling a cada 2 min — compara `latest_message.created_at` com última verificação
- **Toast in-app**: `mostrarToastNotif(texto, duracaoMs)` — canto superior direito
- **Resposta rápida**: `abrirRespostaRapida(dados)` — bottom sheet mobile-friendly
- **Service Worker** (`service-worker.js`): push handler + notificationclick → `MSG_CLICK`
- Permissão de notificação solicitada ao abrir o app

## WhatsApp Integration (Evolution API)
- **Servidor**: Oracle Cloud Always Free (IP: 147.15.39.4)
- **Container**: Docker + Evolution API v1.8.1 na porta 8080
- **API Key**: `bandeira-secret-key`
- **Instância**: `bandeira`
- **SSH**: `ssh -i "ssh-key-2026-04-13 (1).key" opc@147.15.39.4`
- **Edge Function**: `whatsappProxy` faz proxy entre frontend e Evolution API
- **Arquivo de chave SSH**: `ssh-key-2026-04-13 (1).key` na raiz do projeto

### Aba WhatsApp no Calendário
| Funcionalidade | Descrição |
|---|---|
| Conexão QR Code | Escaneia QR pra conectar WhatsApp |
| Chat em tempo real | Lista de conversas + envio de mensagens |
| Botão nos Contatos | "📱 Enviar WhatsApp" e "📝 WhatsApp com template" |
| Templates | Boas-vindas, Pré check-in, Check-in, Check-out, Agradecimento, Personalizado |
| Auto nova reserva | Envia boas-vindas automática ao receber reserva nova (Supabase Realtime) |
| Auto check-in | Envia lembrete 1 dia antes do check-in |
| Auto check-out | Envia lembrete no dia do check-out |

### Templates — Variáveis
| Variável | Substituição |
|---|---|
| `{nome}` | Primeiro nome do hóspede |
| `{nomeCompleto}` | Nome completo |
| `{unidade}` | Nome da unidade (ex: Casa 2.5) |
| `{checkin}` | Data check-in DD/MM/YYYY |
| `{checkout}` | Data check-out DD/MM/YYYY |
| `{valor}` | Valor total da reserva |

### Config WhatsApp (localStorage)
- `waConfig`: `{ url, apiKey, instanceName }`
- `waAutoNovaReserva`: true/false — auto boas-vindas
- `waAutoCheckin`: true/false — auto pre-checkin
- `waAutoCheckout`: true/false — auto checkout
- `waAutoEnviados_YYYY-MM-DD`: registro diário de msgs já enviadas

### Evolution API — Endpoints usados (v1.8.1)
| Endpoint | Método | Uso |
|---|---|---|
| `/instance/create` | POST | Criar instância |
| `/instance/connect/{name}` | GET | QR Code para conexão |
| `/instance/connectionState/{name}` | GET | Status da conexão |
| `/instance/delete/{name}` | DELETE | Remover instância |
| `/chat/findChats/{name}` | GET | Listar conversas |
| `/chat/findMessages/{name}` | POST | Buscar mensagens |
| `/message/sendText/{name}` | POST | Enviar mensagem |
| `/instance/fetchInstances` | GET | Listar instâncias |

## Cuidados importantes
1. **NUNCA** deixar o sync do Smoobu apagar reservas da Movi 505
2. **NUNCA** tentar conectar Movi 505 ao Smoobu
3. **SEMPRE** usar `Number()` nos IDs ao chamar updateRates
4. **NÃO** usar `db.functions.invoke()` para chamar Edge Functions — usar `fetch()` direto via `chamarEdgeFunction()`
5. O arquivo `index.html` é muito grande (~7100 linhas) — sempre usar Grep antes de editar para encontrar a linha exata
6. A Edge Function precisa de **redeploy manual** no Supabase Dashboard após mudanças
7. `pendingPrecoChanges`: campo `field='min'` é mapeado para propriedade `'minStay'` em `adicionarPendingPreco`
8. `price: null` / `minStay: null` no pending = não enviar esse campo ao Smoobu (não sobrescrever)

## Histórico de problemas resolvidos
- `getRates 422`: parâmetro era `apartments=ID`, corrigido para `apartments[]=ID`
- `updateRates 422`: IDs precisam ser `Number()` e formato é `operations[].dates`
- Bloqueio nome errado: era forçado "Bloqueio", corrigido para usar nome digitado
- `syncSmoobuRealtime` usava `db.functions.invoke()` com bugs, corrigido para `fetch()` direto
- Threads mostravam "Hospede": campos errados, correto é `booking.guest_name` e `booking.id`
- Movi 505 sumia do calendário: datas não estavam em `chegada`/`partida`, extraídas do ID via regex
- Pending price sync não funcionava: `field='min'` não batia com propriedade `'minStay'`; `price:0` era falsy no edge function — corrigido com `null` e verificação `!= null`
