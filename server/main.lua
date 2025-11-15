local QBCore = exports[Config.Core]:GetCoreObject()

local RESOURCE = GetCurrentResourceName()
local LOG_FILE = 'data/ponto_log.json'

local Timers = {}

local function FormatDuration(sec)
    local h = math.floor(sec / 3600)
    local m = math.floor((sec % 3600) / 60)
    local s = sec % 60
    local out = ''
    if h > 0 then out = out .. h .. 'h ' end
    if m > 0 then out = out .. m .. 'm ' end
    if s > 0 then out = out .. s .. 's' end
    return out ~= '' and out or '0s'
end

-- carrega array de logs do arquivo
local function LoadLogs()
    local content = LoadResourceFile(RESOURCE, LOG_FILE)
    if not content or content == '' then return {} end
    local ok, data = pcall(json.decode, content)
    if ok and type(data) == 'table' then return data end
    print('⚠️ [Duty Logs] JSON inválido em ' .. LOG_FILE .. ', reiniciando lista.')
    return {}
end

-- salva array de logs no arquivo
local function SaveLogs(tbl)
    local encoded = json.encode(tbl, { indent = true })
    if not encoded then
        print('[Duty Logs] Falha ao codificar JSON.')
        return false
    end
    local ok = SaveResourceFile(RESOURCE, LOG_FILE, encoded, #encoded)
    if not ok then
        print('[Duty Logs] SaveResourceFile falhou. Verifique se a pasta "logs" existe dentro do recurso.')
        return false
    end
    return true
end

-- append de um log
local function AppendLog(entry)
    local logs = LoadLogs()
    logs[#logs + 1] = entry
    local ok = SaveLogs(logs)
    if ok then
        print('[Duty Logs] Log gravado: ' .. (entry.status or 'N/A') .. ' | ' .. (entry.job or 'N/A'))
    end
end

-- pega webhook por job
local function GetWebhook(job)
    return Config.AuthJobs[job] and Config.AuthJobs[job].Webhook or nil
end

-- envia ENTRADA
local function SendOnDutyLogToDiscord(playerName, job, jobGrade, discordId)
    AppendLog({
        status = 'Entrou em Serviço',
        job = job,
        player = playerName,
        grade = jobGrade,
        discord = discordId,
        time = os.date('%d/%m/%Y %X')
    })

    local webhook = GetWebhook(job)
    if not webhook then return end

    PerformHttpRequest(webhook, function() end, 'POST', json.encode({
        username = (Config.AuthJobs[job] and Config.AuthJobs[job].LogTitle) or 'Duty Log',
        embeds = {{
            color = (Config.AuthJobs[job] and Config.AuthJobs[job].Color) or 3447003,
            title = 'Entrou em Serviço',
            description = ("Funcionário: **%s**\nCargo: **%s**\nGraduação: **%s**\nDiscord: <@%s>"):format(playerName, job, jobGrade, discordId or '0'),
            footer = { text = os.date('%d/%m/%Y %X') },
            thumbnail = { url = (Config.AuthJobs[job] and Config.AuthJobs[job].IconURL) or '' },
        }}
    }), { ['Content-Type'] = 'application/json' })
end

-- envia SAÍDA
local function SendOffDutyLogToDiscord(message, job, seconds)
    AppendLog({
        status = 'Saiu de Serviço',
        job = job,
        message = message,
        seconds = seconds or 0,
        time = os.date('%d/%m/%Y %X')
    })

    local webhook = GetWebhook(job)
    if not webhook then return end

    PerformHttpRequest(webhook, function() end, 'POST', json.encode({
        username = (Config.AuthJobs[job] and Config.AuthJobs[job].LogTitle) or 'Duty Log',
        embeds = {{
            color = (Config.AuthJobs[job] and Config.AuthJobs[job].Color) or 3447003,
            title = 'Saiu de Serviço',
            description = message,
            footer = { text = os.date('%d/%m/%Y %X') },
            thumbnail = { url = (Config.AuthJobs[job] and Config.AuthJobs[job].IconURL) or '' },
        }}
    }), { ['Content-Type'] = 'application/json' })
end

-- ============ EVENTOS ============
-- player carregou → se já estiver de serviço, loga "userjoined"
RegisterNetEvent('kael-dutylog:server:userjoined', function(job, duty)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player or not job or not duty then return end
    if not Config.AuthJobs[job] then return end

    local citizenid = Player.PlayerData.citizenid
    if not Timers[citizenid] and duty then
        Timers[citizenid] = { job = job, startTime = os.time(), startDate = os.date('%d/%m/%Y %X') }
        local name = ('%s %s (%s)'):format(Player.PlayerData.charinfo.firstname, Player.PlayerData.charinfo.lastname, Player.PlayerData.name)
        local grade = Player.PlayerData.job.grade.name
        local discord = (QBCore.Functions.GetIdentifier(src, 'discord') or ''):gsub('discord:', '')
        SendOnDutyLogToDiscord(name, job, grade, discord)
    end
end)

-- DUTY ON
RegisterNetEvent('kael-dutylog:server:onDuty', function(job)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player or not job or not Config.AuthJobs[job] then return end

    local citizenid = Player.PlayerData.citizenid
    if Timers[citizenid] then return end -- já estava cronometrando

    Timers[citizenid] = { job = job, startTime = os.time(), startDate = os.date('%d/%m/%Y %X') }
    local name = ('%s %s (%s)'):format(Player.PlayerData.charinfo.firstname, Player.PlayerData.charinfo.lastname, Player.PlayerData.name)
    local grade = Player.PlayerData.job.grade.name
    local discord = (QBCore.Functions.GetIdentifier(src, 'discord') or ''):gsub('discord:', '')

    SendOnDutyLogToDiscord(name, job, grade, discord)
end)

-- DUTY OFF
RegisterNetEvent('kael-dutylog:server:offDuty', function(job)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player or not job or not Config.AuthJobs[job] then return end

    local citizenid = Player.PlayerData.citizenid
    local t = Timers[citizenid]
    if not t then return end

    local elapsed = os.time() - t.startTime
    local readable = FormatDuration(elapsed)
    local name = ('%s %s (%s)'):format(Player.PlayerData.charinfo.firstname, Player.PlayerData.charinfo.lastname, Player.PlayerData.name)
    local grade = Player.PlayerData.job.grade.name
    local discord = (QBCore.Functions.GetIdentifier(src, 'discord') or ''):gsub('discord:', '')

    local msg = ("Funcionário: **%s**\nStatus: **Saindo de Serviço**\nDiscordID: <@%s>\nCargo: **%s**\nGraduação: **%s**\nTempo de serviço: **%s**\nInício: %s\nFim: %s")
        :format(name, discord, job, grade, readable, t.startDate, os.date('%d/%m/%Y %X'))

    Timers[citizenid] = nil
    SendOffDutyLogToDiscord(msg, job, elapsed)
end)

-- QUEDA / SAÍDA DO SERVIDOR
AddEventHandler('playerDropped', function()
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end

    local citizenid = Player.PlayerData.citizenid
    local t = Timers[citizenid]
    if not t then return end

    local job = t.job
    if not Config.AuthJobs[job] then Timers[citizenid] = nil return end

    local elapsed = os.time() - t.startTime
    local readable = FormatDuration(elapsed)
    local name = ('%s %s (%s)'):format(Player.PlayerData.charinfo.firstname, Player.PlayerData.charinfo.lastname, Player.PlayerData.name)
    local grade = Player.PlayerData.job.grade.name
    local discord = (QBCore.Functions.GetIdentifier(src, 'discord') or ''):gsub('discord:', '')

    local msg = ("Funcionário: **%s**\nStatus: **Saiu do Servidor**\nDiscordID: <@%s>\nCargo: **%s**\nGraduação: **%s**\nTempo de serviço: **%s**\nInício: %s\nFim: %s")
        :format(name, discord, job, grade, readable, t.startDate, os.date('%d/%m/%Y %X'))

    Timers[citizenid] = nil
    SendOffDutyLogToDiscord(msg, job, elapsed)
end)

-- === RELATÓRIO POR ORG, COM PERMISSÃO DE GRADE ===
QBCore.Commands.Add('relatorioorg', 'Envia relatório de tempo da sua organização', {
    { name = 'dias', help = '(opcional) considerar apenas últimos X dias' }
}, false, function(source, args)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end

    local job = Player.PlayerData.job and Player.PlayerData.job.name
    if not job or not Config.AuthJobs[job] then
        if src > 0 then TriggerClientEvent('QBCore:Notify', src, 'Seu job não está autorizado no sistema de logs.', 'error') end
        return
    end

    local jobCfg = Config.AuthJobs[job]
    local gradeLevel = 0
    if Player.PlayerData.job and Player.PlayerData.job.grade then
        -- QBCore/Qbox: pode ser number ou table com .level
        if type(Player.PlayerData.job.grade) == "table" then
            gradeLevel = tonumber(Player.PlayerData.job.grade.level or 0) or 0
        else
            gradeLevel = tonumber(Player.PlayerData.job.grade or 0) or 0
        end
    end

    local minG = tonumber(jobCfg.MinReportGrade or 0) or 0
    if gradeLevel < minG then
        if src > 0 then TriggerClientEvent('QBCore:Notify', src, ('Permissão insuficiente. Grade mínima: %d.'):format(minG), 'error') end
        return
    end

    -- janela opcional de dias (filtragem por data do log)
    local onlyDays = tonumber(args[1] or 0)
    local cutoffTS = nil
    if onlyDays and onlyDays > 0 then
        cutoffTS = os.time() - (onlyDays * 86400)
    end

    -- lê todos os logs e filtra por job & período
    local logs = LoadLogs()
    if not logs or #logs == 0 then
        if src > 0 then TriggerClientEvent('QBCore:Notify', src, 'Nenhum log encontrado.', 'error') end
        return
    end

    -- agrupar total por jogador (nome formatado no message) dentro da org
    local totals = {}

    local function parseBrDateToTS(brDate) -- "dd/mm/YYYY HH:MM:SS" -> timestamp
        local d, m, y, H, M, S = brDate:match("(%d%d)/(%d%d)/(%d%d%d%d)%s+(%d%d):(%d%d):(%d%d)")
        if d then
            return os.time({ day = tonumber(d), month = tonumber(m), year = tonumber(y), hour = tonumber(H), min = tonumber(M), sec = tonumber(S) })
        end
        return nil
    end

    for _, l in ipairs(logs) do
        if l.status == 'Saiu de Serviço' and l.job == job then
            if not cutoffTS or (l.time and parseBrDateToTS(l.time) and parseBrDateToTS(l.time) >= cutoffTS) then
                local name = nil
                if l.message then
                    name = l.message:match("Funcionário: %*%*(.-)%*%*")
                end
                if not name and l.player then
                    name = l.player
                end
                local secs = tonumber(l.seconds or 0) or 0
                if name then
                    totals[name] = (totals[name] or 0) + secs
                end
            end
        end
    end

    -- monta descrição
    local lines = { ("📊 **Relatório de Tempo – %s**"):format(job) }
    local any = false
    for name, secs in pairs(totals) do
        any = true
        table.insert(lines, ("👤 **%s** — ⏱️ %s"):format(name, FormatDuration(secs)))
    end
    if not any then
        table.insert(lines, "_Sem registros nesse período._")
    end
    local desc = table.concat(lines, "\n")

    -- escolhe webhook específico da org (fallback para Webhook normal)
    local webhook = jobCfg.ReportWebhook or jobCfg.Webhook
    if not webhook or webhook == "" then
        if src > 0 then TriggerClientEvent('QBCore:Notify', src, 'Webhook de relatório não configurado para esta organização.', 'error') end
        return
    end

    PerformHttpRequest(webhook, function() end, 'POST', json.encode({
        username = jobCfg.LogTitle or ('Relatório ' .. job),
        embeds = {{
            color = jobCfg.Color or 3447003,
            title = ("Relatório de Tempo (%s)"):format(job),
            description = desc,
            footer = { text = os.date("%d/%m/%Y %X") },
            thumbnail = { url = jobCfg.IconURL or "" },
        }}
    }), { ['Content-Type'] = 'application/json' })

    if src > 0 then TriggerClientEvent('QBCore:Notify', src, 'Relatório enviado no Discord da sua organização.', 'success') end
end, 'user')  -- não precisa setar 'admin', o gate é por MinReportGrade

-- /relatoriojob ADMIN
QBCore.Commands.Add('relatoriojob', 'Relatório de tempo por organização (STAFF)', {
    { name = 'job',  help = 'ex.: police, ambulance, mecano...' },
    { name = 'dias', help = '(opcional) últimos X dias' }
}, true, function(source, args)
    local src  = source
    local job  = tostring(args[1] or ''):lower()
    local days = tonumber(args[2] or 0)

    -- gate por admin (server-side)
    if not IsStaff(src) then
        if src > 0 then TriggerClientEvent('QBCore:Notify', src, 'Sem permissão.', 'error') end
        return
    end

    if job == '' then
        if src > 0 then TriggerClientEvent('QBCore:Notify', src, 'Uso: /relatoriojob <job> [dias]', 'error') end
        return
    end

    local jobCfg = Config.AuthJobs[job]
    if not jobCfg then
        if src > 0 then TriggerClientEvent('QBCore:Notify', src, ('Job "%s" não está em Config.AuthJobs.'):format(job), 'error') end
        return
    end

    local cutoffTS = nil
    if days and days > 0 then
        cutoffTS = os.time() - (days * 86400)
    end

    local logs = LoadLogs()
    if not logs or #logs == 0 then
        if src > 0 then TriggerClientEvent('QBCore:Notify', src, 'Nenhum log encontrado.', 'error') end
        return
    end

    local function parseBrDateToTS(brDate)
        if not brDate or type(brDate) ~= 'string' then return nil end
        local d,m,y,H,M,S = brDate:match("(%d%d)/(%d%d)/(%d%d%d%d)%s+(%d%d):(%d%d):(%d%d)")
        if d then return os.time({ day=tonumber(d), month=tonumber(m), year=tonumber(y), hour=tonumber(H), min=tonumber(M), sec=tonumber(S) }) end
        return nil
    end

    local totals = {}
    for _, l in ipairs(logs) do
        if l.status == 'Saiu de Serviço' and l.job == job then
            if not cutoffTS then
                local name = (l.message and l.message:match("Funcionário: %*%*(.-)%*%*")) or l.player
                local secs = tonumber(l.seconds or 0) or 0
                if name then totals[name] = (totals[name] or 0) + secs end
            else
                local ts = parseBrDateToTS(l.time)
                if ts and ts >= cutoffTS then
                    local name = (l.message and l.message:match("Funcionário: %*%*(.-)%*%*")) or l.player
                    local secs = tonumber(l.seconds or 0) or 0
                    if name then totals[name] = (totals[name] or 0) + secs end
                end
            end
        end
    end

    local lines = { ("📊 **Relatório de Tempo – %s**%s"):format(job, (days and days > 0) and (" (últimos "..days.." dias)") or "") }
    local any = false
    for name, secs in pairs(totals) do
        any = true
        table.insert(lines, ("👤 **%s** — ⏱️ %s"):format(name, FormatDuration(secs)))
    end
    if not any then
        table.insert(lines, "_Sem registros no período/organização selecionados._")
    end
    local desc = table.concat(lines, "\n")

    --STAFF WEBHOOK EXCLUSIVO (sem fallback)
    local webhook = Config.StaffWebhook
    if not webhook or webhook == "" then
        if src > 0 then TriggerClientEvent('QBCore:Notify', src, 'Config.StaffWebhook não configurado.', 'error') end
        return
    end

    PerformHttpRequest(webhook, function() end, 'POST', json.encode({
        username = (jobCfg.LogTitle or 'Relatório') .. ' | STAFF',
        embeds = {{
            color = jobCfg.Color or 3447003,
            title = ("Relatório de Tempo (%s) – STAFF"):format(job),
            description = desc,
            footer = { text = os.date("%d/%m/%Y %X") },
            thumbnail = { url = jobCfg.IconURL or "" },
        }}
    }), { ['Content-Type'] = 'application/json' })

    if src > 0 then TriggerClientEvent('QBCore:Notify', src, 'Relatório (STAFF) enviado.', 'success') end
end, 'admin')

-- Garante QBCore
local QBCore = QBCore or exports[(Config and Config.Core) or 'qb-core']:GetCoreObject()

-- Fallback: IsStaff (ADMIN) se não existir global
if not IsStaff then
    IsStaff = function(src)
        if QBCore and QBCore.Functions and QBCore.Functions.HasPermission then
            local ok, has = pcall(function()
                return QBCore.Functions.HasPermission(src, 'admin')
            end)
            if ok and has then return true end
        end
        local Player = QBCore and QBCore.Functions and QBCore.Functions.GetPlayer and QBCore.Functions.GetPlayer(src)
        if Player and Player.Functions and Player.Functions.HasPermission then
            local ok, has = pcall(function()
                return Player.Functions:HasPermission('admin')
            end)
            if ok and has then return true end
        end
        if IsPlayerAceAllowed and (IsPlayerAceAllowed(src, 'group.admin') or IsPlayerAceAllowed(src, 'command')) then
            return true
        end
        return false
    end
end

-- /cleardutylogs -> zera o arquivo JSON (apenas ADMIN)
QBCore.Commands.Add('cleardutylogs', 'Limpa todo o duty_logs.json (ADMIN)', {}, false, function(src)
    if not IsStaff(src) then
        if src > 0 then
            TriggerClientEvent('ox_lib:notify', src, {
                type = 'error', title = 'Duty Logs', description = 'Você não tem permissão.'
            })
        end
        return
    end

    local resource = GetCurrentResourceName()
    local relPath  = 'logs/duty_logs.json'

    local ok = SaveResourceFile(resource, relPath, '[]', 2)
    if ok then
        print(('[Duty Logs] %s limpou o arquivo duty_logs.json'):format(src == 0 and 'Console' or GetPlayerName(src)))
        if src > 0 then
            TriggerClientEvent('ox_lib:notify', src, {
                type = 'success', title = 'Duty Logs', description = 'Todos os registros foram apagados!'
            })
        end
    else
        if src > 0 then
            TriggerClientEvent('ox_lib:notify', src, {
                type = 'error', title = 'Duty Logs',
                description = 'Falha ao gravar. Confira se a pasta "logs" existe dentro do recurso.'
            })
        end
    end
end, 'admin')
