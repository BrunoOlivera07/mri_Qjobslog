# 🛠️ Tutorial de Instalação e Configuração: Bot de Ponto Discord

Neste guia passo a passo, você aprenderá como transformar este código em um Bot funcional rodando dentro do seu servidor do Discord. Não se preocupe se você nunca configurou um bot antes, basta seguir cada etapa com atenção!

---

## Passo 1: Criando o App no Portal do Discord

1. Acesse o **Discord Developer Portal**: [https://discord.com/developers/applications](https://discord.com/developers/applications)
2. Faça login com a sua conta do Discord (aquela que você usa normalmente).
3. No canto superior direito, clique no botão azul **"New Application"**.
4. Dê um nome para o seu bot (Ex: *Ponto Policia*, *Prefeitura Log*, etc) e concorde com os termos. Clique em **"Create"**.
5. No menu lateral esquerdo, vá em **"Bot"**.

> **⚠️ IMPORTANTE: Privileges Intents**  
> Role a página "Bot" para baixo até encontrar a seção **Privileged Gateway Intents**.
> Você precisa **ATIVAR** as 3 opções abaixo:
> - `Presence Intent`
> - `Server Members Intent`
> - `Message Content Intent`
> 
> Depois de ativar os 3 botõezinhos azuis, clique em **"Save Changes"**.

---

## Passo 2: Obtendo o Token e o Client ID

Ainda no Developer Portal:

1. **Obtendo o Token:**
   - Na mesma aba **"Bot"**, role para cima.
   - Perto do ícone do seu bot, clique em **"Reset Token"** e depois em **"Yes, do it!"** (se pedir um código de 2FA do seu app autenticador, informe).
   - Um código gigante irá aparecer. Clique em **"Copy"**. 
   - **Guarde isso com a sua vida**, não poste em público (se vazar, alguém pode assumir o bot). Coloque em um bloco de notas por enquanto.

2. **Obtendo o Client ID (ID do App):**
   - No menu lateral esquerdo, vá agora em **"OAuth2"** -> **"General"**.
   - O primeiro campo que aparecerá será o `Client ID`. 
   - Clique em **"Copy"** e guarde também no bloco de notas.

---

## Passo 3: Adicionando o Bot no seu Servidor

1. Ainda no menu lateral, em **"OAuth2"**, clique em **"URL Generator"**.
2. Na caixa **"Scopes"**, marque as opções:
   - `bot`
   - `applications.commands`
3. Ao marcar "bot", uma nova caixa aparecerá logo abaixo chamada **"Bot Permissions"**. Nela, marque as opções (ou simplesmente marque **Administrator** para facilitar, se confiar no seu próprio bot).
4. No final da página, o Discord vai gerar uma URL.
5. Copie essa URL (`Copy`), abra uma nova aba no seu navegador e cole a URL.
6. A tela padrão de convite do Discord vai abrir. Escolha o seu Servidor e clique em **"Autorizar"**. Pronto, o bot está no seu servidor (offline, por enquanto).

---

## Passo 4: Configurando o Projeto no seu Computador / VPS

1. Abra a pasta do projeto (`mri_Qjobslog`) no VSCode ou navegue até ela.
2. Localize o arquivo chamado `.env.example` e **renomeie ele para `.env`** (apenas `.env`).
3. Abra este arquivo `.env` e preencha com as informações do Passo 2 e do seu Banco de Dados:

```env
# Configurações do Discord
DISCORD_TOKEN=cole_seu_token_aqui
CLIENT_ID=cole_seu_client_id_aqui
GUILD_ID=opcional_id_do_servidor_para_slash_commands

# Configurações do Banco de Dados (MySQL)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=SuaSenhaSeTiver
DB_NAME=O_Nome_Da_Sua_Database_Geral (ex: qbcoreframework)
```

> **Dica sobre o `GUILD_ID`**: 
> Se você preencher o `GUILD_ID` com o ID do seu servidor do Discord, os comandos de `/` (slash commands) aparecem instantaneamente para testes. Se você não colocar nada (deixar vazio), eles serão globais, mas pode levar até 1 hora para o Discord atualizar os comandos. (Para pegar o ID de um Servidor, clique com botão direito no ícone dele no Discord e vá em "Copiar ID do Servidor", você precisa do "Modo Desenvolvedor" do seu próprio Discord ativado nas Configs de Usuário).

---

## Passo 5: Instalando e Ligando

Para esta etapa, você precisa ter o **[Node.js](https://nodejs.org/)** instalado no seu computador ou VPS.

1. Abra o Terminal e vá até a pasta do Bot (se você está usando o VSCode, basta abrir o terminal integrado).
2. Não se esqueça de rodar o comando para instalar as bibliotecas caso tenha subido para uma VPS nova (o comando é `npm install`).
3. Envie os comandos do bot para o Discord rodando o script abaixo (Basta rodar 1 vez):
   ```bash
   node deploy-commands.js
   ```
   > Você deve ver uma mensagem verde dizendo: `Sucesso: X comandos registrados globalmente (ou no servidor).`

4. Finalmente, ligue o bot:
   ```bash
   node index.js
   ```
   > Se a mensagem `[Bot] Conectado como NomeDoSeuBot#1234` e `[Banco de Dados] Conexão estabelecida` aparecer, meus parabéns, o seu bot está online e 100% funcional!

---

## Passo 6: Como usar na prática no Discord

1. O administrador deve usar o comando `/setup_painel organizacao: police` no canal que os membros irão bater o ponto (#bate-ponto).
2. O bot criará o Embed verde com os 3 botões (Entrar, Pausar/Retomar, Sair).
3. Qualquer membro que quiser usar, deve PRIMEIRO ir em algum canal de texto e digitar: `/registrar passaporte: 1 nome: Bruno` 
   (*Sem fazer este passo, o banco de dados vai barrar e ele não clica nos botões*).
4. Prontinho, o jogador já pode testar o botão!
5. Para testar o relatório em excel, você (admin) use `/relatorio_org organizacao: police dias: 7`. A mágica acontecerá.

---

## Como manter ligado 24/7 (Bônus para VPS)
Se você fechar o terminal, o `node index.js` vai parar. Para mante-lo na nuvem:
1. Instale o PM2 globalmente: `npm install -g pm2`
2. Inicie com PM2: `pm2 start index.js --name "BotPonto"`
3. Salve para iniciar junto com o Windows/Linux: `pm2 save` e `pm2 startup`.
