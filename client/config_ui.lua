local QBCore = exports[Config.Core or 'qb-core']:GetCoreObject()

local function notifyOk(msg)
    lib.notify({ title = 'Duty Logs', description = msg, type = 'success', position = 'top' })
end

local function notifyWarn(msg)
    lib.notify({ title = 'Duty Logs', description = msg, type = 'warning', position = 'top' })
end

local function notifyErr(msg)
    lib.notify({ title = 'Duty Logs', description = msg, type = 'error', position = 'top' })
end

-- Function to convert hexadecimal (#rrggbb) to decimal number.
local function hexToDecimal(hex)
    hex = hex:gsub("#", "")
    return tonumber(hex, 16)
end

-- Create Org Dialog
local function showCreateOrgDialog()
    local input = lib.inputDialog('Novo Bate Ponto Log', {
        { type = 'input',   label = 'Emprego ',                   placeholder = 'police', required = true, description = 'Cargo que irá receber o sistema de ponto' },
        { type = 'input',   label = 'Titulo do Bot',              placeholder = 'Logs Polícia', required = true, description = 'Título que aparecerá no log do Discord' },
        { type = 'color', label = 'Cor embed do Log', default = '#ffffff', description = 'Escolha uma cor para o embed (RGB)' },
        { type = 'input',   label = 'Icone tamanho 200x200',      placeholder = 'https://...', description = 'URL do ícone que aparecerá no log do Discord' },
        { type = 'input',   label = 'Grade do cargo',             placeholder = '3', required = true, description = 'Grade mínima para usar o comando de historico de ponto (0 para todos)' },
        { type = 'input',   label = 'Webhook entrada/saida',      placeholder = 'https://discord.com/api/webhooks/...', required = true, description = 'Webhook para onde os logs de entrada e saída serão enviados' },
        { type = 'input',   label = 'Webhook Historico ponto',    placeholder = 'https://discord.com/api/webhooks/...', required = true, description = 'Webhook para onde os logs de histórico de ponto serão enviados' },
    })
    if not input then return openRootMenu() end

    local key = (input[1] or ''):lower()
    if key == '' then
        notifyErr('Job inválido.')
        return openRootMenu()
    end

    local payload = {
        LogTitle       = (input[2] and input[2] ~= '') and input[2] or ('Logs ' .. key),
        Color = hexToDecimal(input[3]) or 3447003,
        IconURL        = input[4] or '',
        MinReportGrade = tonumber(input[5]) or 0,
        Webhook        = input[6] or '',
        ReportWebhook  = input[7] or '',
    }

    local save = lib.callback.await('dutylogcfg:saveOrg', false, key, payload)
    if save and save.ok then
        notifyOk('Organização criada!')
    else
        notifyErr('Falha ao salvar organização.')
    end
    openRootMenu()
end

--Edit org dialog
local function showEditOrgDialog(orgName, orgData)
    local input = lib.inputDialog('Editar Organização: ' .. orgName, {
        { type = 'input',   label = 'Título do Log', default = orgData.LogTitle or '',description = 'Título que aparecerá no log do Discord'},
        { type = 'color',   label = 'Cor do Embed', default = string.format("#%06x", tonumber(orgData.Color) or 3447003), description = 'Escolha uma cor para o embed (RGB)' },
        { type = 'input',   label = 'Icon URL', default = orgData.IconURL or '', description = 'URL do ícone que aparecerá no log do Discord'  },
        { type = 'input',   label = 'Webhook Principal', default = orgData.Webhook or '', description = 'Webhook para logs de entrada/saída' },
        { type = 'input',   label = 'Webhook de Relatório (opcional)', default = orgData.ReportWebhook or '', description = 'Webhook para logs de histórico' },
        { type = 'number',  label = 'Grade mínima p/ Relatório', default = tonumber(orgData.MinReportGrade or 0), description = 'Grade mínima para usar o comando de histórico de ponto (0 para todos)' }
    })

    if not input then return openRootMenu() end

    local payload = {
        LogTitle = input[1],
        Color = tonumber(input[2]:gsub("#", ""), 16),
        IconURL = input[3],
        Webhook = input[4],
        ReportWebhook = input[5],
        MinReportGrade = tonumber(input[6]),
    }

    local result = lib.callback.await('dutylogcfg:saveOrg', false, orgName, payload)
    if result and result.ok then
        notifyOk('Organização atualizada com sucesso!')
    else
        notifyErr('Erro ao atualizar organização.')
    end
    openRootMenu()
end


-- Org Card
local function openOrgCard(job, v)
    lib.registerContext({
        id = 'dutylogcfg_org_' .. job,
        menu = 'dutylogcfg_root',
        title = ('Editar: %s'):format(job),
        options = {
            {
                title = 'Editar',
                icon = 'pen',
                onSelect = function()
                    showEditOrgDialog(job, v)
                end
            },
            {
                title = 'Remover',
                icon = 'trash',
                onSelect = function()
                    if lib.alertDialog({
                        header = 'Confirmar remoção',
                        content = ('Remover "%s"?'):format(job),
                        centered = true,
                        cancel = true
                    }) ~= 'confirm' then
                        return openRootMenu()
                    end

                    local del = lib.callback.await('dutylogcfg:deleteOrg', false, job)
                    if del and del.ok then
                        notifyOk('Organização removida!')
                    else
                        notifyErr('Falha ao remover organização.')
                    end
                    openRootMenu()
                end
            },
        }
    })
    lib.showContext('dutylogcfg_org_' .. job)
end

-- Submenu: Time and Attendance Tools (ADMIN) – includes clearing and backing up duty_logs.json
local function openToolsMenu()

    local isStaff = lib.callback.await('dutylogcfg:isStaff', false)
    if not isStaff then
        return notifyErr('Você não tem permissão.')
    end

    lib.registerContext({
        id = 'dutylogcfg_tools',
        menu = 'dutylogcfg_root',
        title = 'Ferramentas do Ponto',
        options = {
            {
                title = 'Limpar histórico de ponto',
                description = 'Apaga TODO o conteúdo do duty_logs.json (STAFF)',
                icon = 'broom',
                onSelect = function()
                    local res = lib.alertDialog({
                        header = 'Confirmar limpeza',
                        content = 'Isso vai apagar TODOS os registros do duty_logs.json.\nDeseja continuar?',
                        centered = true,
                        cancel = true
                    })
                    if res ~= 'confirm' then
                        notifyWarn('Limpeza cancelada.')
                        return openRootMenu()
                    end

                    ExecuteCommand('cleardutylogs')

                    notifyOk('Solicitação de limpeza enviada. Verifique a notificação.')
                    openRootMenu()
                end
            },
            {
                title = 'Criar backup do histórico',
                description = 'Gera um arquivo em backups/ com o conteúdo atual do duty_logs.json',
                icon = 'box-archive',
                onSelect = function()
                    local res = lib.alertDialog({
                        header = 'Confirmar backup',
                        content = 'Será criado um backup do duty_logs.json em backups/ com data e hora.\nDeseja continuar?',
                        centered = true,
                        cancel = true
                    })
                    if res ~= 'confirm' then
                        notifyWarn('Backup cancelado.')
                        return openRootMenu()
                    end

                    ExecuteCommand('backupdutylogs')

                    notifyOk('Solicitação de backup enviada. Verifique a notificação.')
                    openRootMenu()
                end
            },
        }
    })
    lib.showContext('dutylogcfg_tools')
end

-- Root Menu
function openRootMenu()
    local isStaff = lib.callback.await('dutylogcfg:isStaff', false)
    if not isStaff then return notifyErr('Você não tem permissão.') end

    local resp = lib.callback.await('dutylogcfg:getAll', false)
    if not resp or not resp.ok then return notifyErr('Falha ao carregar organizações.') end

    local data, options = resp.data or {}, {}

    options[#options+1] = {
        title = 'Adicionar organização',
        description = 'Criar um novo registro para um job',
        icon = 'plus',
        onSelect = showCreateOrgDialog
    }

    options[#options+1] = {
        title = 'Ferramentas do Ponto',
        description = 'Ações administrativas (ex.: limpar histórico / backup)',
        icon = 'toolbox',
        arrow = true,
        onSelect = function()
            openToolsMenu()
        end
    }

    for job, v in pairs(data) do
        options[#options+1] = {
            title = job,
            description = (v.LogTitle or '') .. '\nMinGrade: ' .. (v.MinReportGrade or 0),
            icon = 'building',
            arrow = true,
            onSelect = function() openOrgCard(job, v) end
        }
    end

    lib.registerContext({
        id = 'dutylogcfg_root',
        title = 'Ponto Eletronico',
        menu = 'menu_gerencial',
        options = options
    })
    lib.showContext('dutylogcfg_root')
end

RegisterCommand('logconfig', function() openRootMenu() end, false)
RegisterCommand('logtools', function() openToolsMenu() end, false)

CreateThread(function()
    TriggerEvent('chat:addSuggestion', '/logconfig', 'Abrir configurador de organizações (ADMIN)')
    TriggerEvent('chat:addSuggestion', '/logtools',  'Abrir ferramentas administrativas do ponto (ADMIN)')
end)
