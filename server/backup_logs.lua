local QBCore = exports[(Config and Config.Core) or 'qb-core']:GetCoreObject()

-- usa o mesmo gate de admin de sempre
if not IsStaff then
    _G.IsStaff = function(src)
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

local RESOURCE  = GetCurrentResourceName()
local LOGS_FILE = 'logs/duty_logs.json'
local BKP_DIR   = 'logs_backup'

local function readLogs()
    local content = LoadResourceFile(RESOURCE, LOGS_FILE)
    if not content or content == '' then
        return nil, 'Nenhum duty_logs.json encontrado ou arquivo vazio.'
    end
    return content
end

local function trySave(path, data)
    -- SaveResourceFile retorna true/false dependendo do artifact
    local ok = SaveResourceFile(RESOURCE, path, data, #data)
    return ok and true or false
end

local function doBackup()
    local content, err = readLogs()
    if not content then
        return false, err
    end

    local filename = ('backup_%s.json'):format(os.date('%Y%m%d_%H%M%S'))

    local target1 = ("%s/%s"):format(BKP_DIR, filename)
    local ok1 = trySave(target1, content)
    if ok1 then
        return true, target1
    end

    return false, ("Falha ao salvar em '%s' e '%s'. Verifique se a pasta '%s' existe e tem permissão de escrita.")
        :format(target1, target2, BKP_DIR)
end

-- /backupdutylogs -> cria arquivo backup_YYYYMMDD_HHMMSS.json
QBCore.Commands.Add('backupdutylogs', 'Cria um backup do duty_logs.json (ADMIN)', {}, false, function(src)
    if not IsStaff(src) then
        if src > 0 then
            TriggerClientEvent('ox_lib:notify', src, { type = 'error', title = 'Duty Logs', description = 'Você não tem permissão.' })
        end
        return
    end

    local ok, msg = doBackup()
    if ok then
        print(('[Duty Logs] Backup criado por %s em: %s'):format(src == 0 and 'Console' or GetPlayerName(src), msg))
        if src > 0 then
            TriggerClientEvent('ox_lib:notify', src, { type = 'success', title = 'Duty Logs', description = 'Backup salvo: ' .. msg })
        end
    else
        print('[Duty Logs] ERRO backup: ' .. (msg or 'desconhecido'))
        if src > 0 then
            TriggerClientEvent('ox_lib:notify', src, { type = 'error', title = 'Duty Logs', description = msg or 'Erro ao criar backup.' })
        end
    end
end, 'admin')
