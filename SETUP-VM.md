# Rodando o Claude Code na VM (mesmo contexto)

> A "memória" do Claude entre sessões é o arquivo `CLAUDE.md`, que já está versionado
> neste repositório. Basta clonar o repo na VM e abrir o Claude dentro da pasta —
> ele carrega o contexto sozinho. Histórico de conversa não migra; contexto de projeto sim.

## 1. Pré-requisitos na VM

```bash
node -v    # precisa ser >= 18 (o projeto usa 22 nas Actions)
git --version
```

Se faltar Node (Ubuntu/Debian):

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git
```

## 2. Clonar o projeto

```bash
git clone https://github.com/brunohrb/bandeirabeachhouse.git
cd bandeirabeachhouse
npm install          # @supabase/supabase-js + xlsx (só p/ os scripts)
```

## 3. Abrir o Claude Code na pasta

```bash
cd ~/bandeirabeachhouse
claude
```

Ao iniciar dentro da pasta, o `CLAUDE.md` da raiz é lido automaticamente — regras de
deploy, cuidados com Movi 505, formatos da API do Smoobu, tudo já vem junto.

Confirme com `/context` (deve listar o CLAUDE.md carregado).

## 4. Autenticação

Na primeira execução o `claude` abre um fluxo de login. Numa VM sem navegador,
escolha a opção de colar o código manualmente: ele imprime uma URL, você abre no
navegador do seu computador, faz login e cola o código de volta no terminal.

## 5. Git na VM

O `git push` via HTTPS vai pedir credencial. Use um Personal Access Token
(GitHub → Settings → Developer settings → Tokens) em vez da senha:

```bash
git config --global user.name  "Bruno"
git config --global user.email "brunohrb@gmail.com"
git config --global credential.helper store   # guarda o token no 1o push
```

Lembre da regra de ouro do projeto: **o que não está em `main` não está no ar.**

```bash
git checkout main && git merge <branch> --no-ff -m "..." && git push origin main
```

## 6. MCP (opcional)

As integrações Supabase/GitHub que existem na sessão web não vêm no clone.
Para reativá-las na VM:

```bash
claude mcp add --transport http github https://api.githubcopilot.com/mcp/
claude mcp list
```

Nunca commite tokens: use `claude mcp add` (grava fora do repo) ou variáveis de ambiente.
