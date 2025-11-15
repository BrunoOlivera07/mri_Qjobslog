local RESOURCE = GetCurrentResourceName()
local CONFIG_FILE = 'shared/orgs_config.json'

local QBCore = exports[Config.Core]:GetCoreObject()

-- ===== Helpers =====
local function LoadOrgConfig()
    local raw = LoadResourceFile(RESOURCE, CONFIG_FILE)
    if not raw or raw == '' then
        -- primeira execução: migrar do Config.AuthJobs para arquivo
        local base = {}
        for job, v in pairs(Config.AuthJobs or {}) do
            base[job] = {
                Webhook       = v.Webhook or '',
                ReportWebhook = v.ReportWebhook or '',
                MinReportGrade= v.MinReportGrade or 0,
                LogTitle      = v.LogTitle or ('Logs ' .. job),
                Color         = v.Color or 3447003,
                IconURL       = v.IconURL or '',
            }
        end
        local encoded = json.encode(base, { indent = true })
        SaveResourceFile(RESOURCE, CONFIG_FILE, encoded, #encoded)
        return base
    end
    local ok, data = pcall(json.decode, raw)
    if ok and type(data) == 'table' then return data end
    --print('[Config] org_config.json inválido. Recriando a partir do Config.AuthJobs.')
    return LoadOrgConfig() -- tenta recriar
end

local function SaveOrgConfig(tbl)
    local encoded = json.encode(tbl, { indent = true })
    if not encoded then
        --print('[Config] Falha ao codificar org_config.')
        return false
    end
    local ok = SaveResourceFile(RESOURCE, CONFIG_FILE, encoded, #encoded)
    if not ok then
        --print('[Config] SaveResourceFile falhou. Verifique a pasta "logs".')
        return false
    end
    return true
end

local OrgConfig = LoadOrgConfig()

-- Permissão: admin do QBCore OU regra StaffPerms (job/grade)
-- (ANTES) local function IsStaff(src)
-- (DEPOIS) -> GLOBAL
_G.IsStaff = function(src)
    -- QBCore server-wide
    if QBCore.Functions and QBCore.Functions.HasPermission then
        local ok, has = pcall(function()
            return QBCore.Functions.HasPermission(src, 'admin')
        end)
        if ok and has then return true end
    end

    -- Player object
    local Player = QBCore.Functions.GetPlayer(src)
    if Player and Player.Functions and Player.Functions.HasPermission then
        local ok, has = pcall(function()
            return Player.Functions:HasPermission('admin')
        end)
        if ok and has then return true end
    end

    -- ACE fallback
    if IsPlayerAceAllowed and (IsPlayerAceAllowed(src, 'group.admin') or IsPlayerAceAllowed(src, 'command')) then
        return true
    end

    return false
end


-- Atualiza Config.AuthJobs em runtime pra manter compatibilidade do resto do script
local function SyncRuntimeConfig()
    Config.AuthJobs = Config.AuthJobs or {}
    for job, v in pairs(OrgConfig) do
        Config.AuthJobs[job] = {
            Webhook       = v.Webhook,
            ReportWebhook = v.ReportWebhook,
            MinReportGrade= v.MinReportGrade or 0,
            LogTitle      = v.LogTitle or ('Logs ' .. job),
            Color         = v.Color or 3447003,
            IconURL       = v.IconURL or '',
        }
    end
end
SyncRuntimeConfig()

-- ===== ox_lib callbacks =====
lib.callback.register('dutylogcfg:isStaff', function(src)
    return IsStaff(src)
end)

lib.callback.register('dutylogcfg:getAll', function(src)
    if not IsStaff(src) then return { ok = false, reason = 'no_perm' } end
    return { ok = true, data = OrgConfig }
end)

lib.callback.register('dutylogcfg:saveOrg', function(src, key, data)
    if not IsStaff(src) then return { ok = false, reason = 'no_perm' } end
    if not key or key == '' or type(data) ~= 'table' then
        return { ok = false, reason = 'bad_data' }
    end
    OrgConfig[key] = {
        Webhook       = tostring(data.Webhook or ''),
        ReportWebhook = tostring(data.ReportWebhook or ''),
        MinReportGrade= tonumber(data.MinReportGrade or 0) or 0,
        LogTitle      = tostring(data.LogTitle or ('Logs ' .. key)),
        Color         = tonumber(data.Color or 3447003) or 3447003,
        IconURL       = tostring(data.IconURL or ''),
    }
    local ok = SaveOrgConfig(OrgConfig)
    if ok then
        SyncRuntimeConfig()
       --print(('[Config] Org "%s" salva por %s'):format(key, GetPlayerName(src)))
        return { ok = true }
    end
    return { ok = false, reason = 'save_fail' }
end)

lib.callback.register('dutylogcfg:deleteOrg', function(src, key)
    if not IsStaff(src) then return { ok = false, reason = 'no_perm' } end
    if not key or not OrgConfig[key] then
        return { ok = false, reason = 'not_found' }
    end
    OrgConfig[key] = nil
    local ok = SaveOrgConfig(OrgConfig)
    if ok then
        SyncRuntimeConfig()
        --print(('[Config] Org "%s" removida por %s'):format(key, GetPlayerName(src)))
        return { ok = true }
    end
    return { ok = false, reason = 'save_fail' }
end)

RegisterNetEvent('kael-dutylog:config:saveOrg', function(key, data)
    if not IsStaff(source) then return end
    OrgConfig[key] = data
    SaveOrgConfig(OrgConfig)
    --print('[DutyLog] Organização "' .. key .. '" salva com sucesso.')
end)

--print(json.encode(data, { indent = true }))
