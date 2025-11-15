
# 🚓 Duty Log System with In-Game Config (ox_lib + QBCore)

Este recurso permite controlar a entrada e saída de serviço dos jogadores com logs automáticos no Discord, além de fornecer uma interface administrativa via `ox_lib` para configurar cada organização diretamente in-game.

---

## 🧰 Funcionalidades

- Registro de entrada e saída de serviço
- Logs automáticos enviados para webhooks (entrada/saída e histórico)
- Interface completa via `ox_lib` para criar, editar e remover organizações
- Salva todas as configurações em `logs/org_config.json`
- Backup e limpeza de logs em `logs/duty_logs.json`
- Compatível com QBCore (também detecta eventos do QBox e MRI_QDuty)
- Permissões administrativas integradas via `QBCore.Functions.HasPermission`

---

## 🕹️ Comandos Disponíveis

| Comando | Descrição |
|--------|-----------|
| `/logconfig` | Abre o menu de administração para configurar organizações (admin only) |
| `/logtools` | Abre o menu de ferramentas (limpeza e backup dos logs) |
| `/relatorioorg [dias]` | *(planejado)* Envia para o Discord o histórico de todas organizações dos últimos X dias |
| `/relatoriojob [job] [dias]` | *(planejado)* Envia para o Discord o histórico do job especificado nos últimos X dias |

> ⚠️ Os dois últimos comandos não estão implementados no código atual, mas o sistema já suporta webhooks e estrutura para envio.

---

## 🛠️ Estrutura de Arquivos

- `logs/org_config.json` – Armazena as configurações de cada organização (webhooks, cor, título, ícone etc.)
- `logs/duty_logs.json` – Armazena o histórico de entrada/saída com timestamps e jogadores
- `client/config_ui.lua` – Interface com `ox_lib` para gerenciar organizações
- `server/config_store.lua` – Lógica de salvamento/carregamento de `org_config.json`
- `server/backup_logs.lua` – Utilitários para limpar e fazer backup dos logs
- `server/main.lua` – Lida com eventos de entrada/saída de serviço

---

## 👮 Permissões de Staff

O sistema considera como "admin":
- Players com permissão `admin` via `QBCore.Functions.HasPermission`
- ACE Permissions: `group.admin` ou `command`

---

## 💬 Webhooks

Cada organização pode ter:
- `Webhook`: para logs de entrada/saída
- `ReportWebhook`: para logs históricos (como relatórios manuais)

---

## 🔧 Requisitos

- ox_lib
- QBCore
- Pasta `logs/` com permissão de escrita

---

## ✨ Créditos

Autor: Gordela | New Age Studios | MRI QBOX

---