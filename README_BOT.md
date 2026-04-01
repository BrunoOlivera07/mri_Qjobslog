# 🤖 Bot de Bate-Ponto Discord

Este diretório contém o código-fonte finalizado do Bot de Discord, refeito a partir do antigo script `mri_Qjobslog`. Todo o ecossistema de relatórios agora é nativo no NodeJS.

## 🚀 Como Iniciar

**1. Configure o `.env`**
Abra o arquivo `.env.example`, preencha com o seu Token do Discord, Client ID e dados do seu banco de dados (MySQL/XAMPP/HeidiSQL). Depois, renomeie o arquivo de `.env.example` para `.env`.

**2. Registre os Comandos no Discord**
Antes de ligar o bot pela primeira vez (ou caso você altere algum comando no futuro), você deve registrar os "Slash Commands" executando:
```bash
node deploy-commands.js
```

**3. Inicie o Bot**
Para ligar o bot e mantê-lo online, rode:
```bash
node index.js
```

*(Dica: Para servidores em produção longa, recomendamos rodar usando o pacote `pm2` através do comando `pm2 start index.js --name "BotPonto"`).*

## 📌 Comandos Disponíveis no Discord

| Comando | Descrição | Permissão |
|---------|-----------|-----------|
| `/registrar [id] [nome]` | Vincula sua conta do Discord ao seu Passaporte in-game. Obrigatório antes de usar o painel. | Todos |
| `/setup_painel [org]` | Gera os 3 botões (🟢 Entrar, 🟡 Pausar, 🔴 Sair) no canal que o comando for digitado. | Administrador |
| `/config_org [org] [webhook] [titulo]` | Define um link de Webhook para disparar um log público (Embed) sempre que o ponto for mexido. | Administrador |
| `/relatorio_org [org] [dias]` | Envia no chat uma planilha de Excel (XLSX) com todos os pontos batidos da org específica. | Gerenciar Mensagens |
| `/relatorio_player [passaporte] [dias]` | Envia no chat a tabela exclusiva de um único membro, filtrada pelo Passaporte. | Gerenciar Mensagens |
| `/logtools limpar [dias]` | Limpeza técnica do Banco de Dados. | Administrador |

## 🛠 Tabelas no Banco
O próprio bot (`database/connection.js`) criará automaticamente a tabela de usuários (`mri_users`) e atualizará a tabela de logs antiga (`mri_duty_logs`) com as novas colunas de pausa se elas ainda não existirem! Tudo é automático.
