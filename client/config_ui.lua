local QBCore = exports[Config.Core or 'qb-core']:GetCoreObject()

local function notifyOk(msg)
    lib.notify({ title = locale('menu.backup_title'), description = msg, type = 'success', position = 'top' })
end

local function notifyWarn(msg)
    lib.notify({ title = locale('menu.backup_title'), description = msg, type = 'warning', position = 'top' })
end

local function notifyErr(msg)
    lib.notify({ title = locale('menu.backup_title'), description = msg, type = 'error', position = 'top' })
end

-- Function to parse Color (Hex or RGB string) to Decimal
local function ParseColor(input)
    if not input then return 3447003 end
    local str = tostring(input):gsub("#","")
    
    -- Tenta formato "255, 255, 255"
    if str:find(",") then
        local r, g, b = str:match("(%d+)%s*[,%s]%s*(%d+)%s*[,%s]%s*(%d+)")
        if r and g and b then
            return (tonumber(r) * 65536) + (tonumber(g) * 256) + tonumber(b)
        end
    end

    -- Tenta Hex
    return tonumber(str, 16) or 3447003
end

-- Create Org Dialog
local function showCreateOrgDialog()
    local input = lib.inputDialog(locale('dialog.create_org_title'), {
        { type = 'input',   label = locale('input.job_name'),                   placeholder = 'police', required = true, description = locale('input.job_name_desc') },
        { type = 'input',   label = locale('input.log_title'),              placeholder = 'Logs Polícia', required = true, description = locale('input.log_title_desc') },
        { type = 'color',   label = locale('input.color_selector'), default = '#ffffff' },
        { type = 'input',   label = locale('input.color_manual'),        placeholder = '255, 0, 0 ou #FF0000', description = locale('input.color_manual_desc') },
        { type = 'input',   label = locale('input.icon_url'),      placeholder = 'https://...', description = locale('input.icon_url_desc') },
        { type = 'input',   label = locale('input.min_grade'),             placeholder = '3', required = true, description = locale('input.min_grade_desc') },
        { type = 'input',   label = locale('input.webhook'),      placeholder = 'https://discord.com/api/webhooks/...', required = true, description = locale('input.webhook_desc') },
        { type = 'input',   label = locale('input.report_webhook'),    placeholder = 'https://discord.com/api/webhooks/...', required = true, description = locale('input.report_webhook_desc') },
    })
    if not input then return openRootMenu() end

    local key = (input[1] or ''):lower()
    if key == '' then
        notifyErr(locale('error.invalid_job'))
        return openRootMenu()
    end

    local colorManual = input[4]
    local colorPicker = input[3]
    local finalColor  = (colorManual and colorManual ~= '') and ParseColor(colorManual) or ParseColor(colorPicker)

    local payload = {
        LogTitle       = (input[2] and input[2] ~= '') and input[2] or (locale('desc.default_log_title') .. key),
        Color          = finalColor,
        IconURL        = input[5] or '',
        MinReportGrade = tonumber(input[6]) or 0,
        Webhook        = input[7] or '',
        ReportWebhook  = input[8] or '',
    }

    local save = lib.callback.await('dutylogcfg:saveOrg', false, key, payload)
    if save and save.ok then
        notifyOk(locale('notify.org_created'))
    else
        notifyErr(locale('error.save_failed'))
    end
    openRootMenu()
end

--Edit org dialog
local function showEditOrgDialog(orgName, orgData)
    local input = lib.inputDialog(locale('dialog.edit_org_title', orgName), {
        { type = 'input',   label = locale('input.log_title'), default = orgData.LogTitle or '',description = locale('input.log_title_desc')},
        { type = 'color',   label = locale('input.color_selector'), default = string.format("#%06x", tonumber(orgData.Color) or 3447003) },
        { type = 'input',   label = locale('input.color_manual'), default = '', description = locale('input.color_manual_desc_edit') },
        { type = 'input',   label = locale('input.icon_url'), default = orgData.IconURL or '', description = locale('input.icon_url_desc')  },
        { type = 'input',   label = locale('input.webhook'), default = orgData.Webhook or '', description = locale('input.webhook_desc') },
        { type = 'input',   label = locale('input.report_webhook'), default = orgData.ReportWebhook or '', description = locale('input.report_webhook_desc') },
        { type = 'number',  label = locale('input.min_grade'), default = tonumber(orgData.MinReportGrade or 0), description = locale('input.min_grade_desc') }
    })

    if not input then return openRootMenu() end

    local colorManual = input[3]
    local colorPicker = input[2]
    local finalColor  = (colorManual and colorManual ~= '') and ParseColor(colorManual) or ParseColor(colorPicker)

    local payload = {
        LogTitle = input[1],
        Color = finalColor,
        IconURL = input[4],
        Webhook = input[5],
        ReportWebhook = input[6],
        MinReportGrade = tonumber(input[7]),
    }

    local result = lib.callback.await('dutylogcfg:saveOrg', false, orgName, payload)
    if result and result.ok then
        notifyOk(locale('notify.org_updated'))
    else
        notifyErr(locale('error.update_failed'))
    end
    openRootMenu()
end


-- Org Card
local function openOrgCard(job, v)
    lib.registerContext({
        id = 'dutylogcfg_org_' .. job,
        menu = 'dutylogcfg_root',
        title = locale('menu.edit_org', job),
        options = {
            {
                title = locale('menu.edit'),
                icon = 'pen',
                onSelect = function()
                    showEditOrgDialog(job, v)
                end
            },
            {
                title = locale('menu.remove'),
                icon = 'trash',
                onSelect = function()
                    local alert = lib.alertDialog({
                        header = locale('alert.delete_title'),
                        content = locale('alert.delete_msg', job),
                        centered = true,
                        cancel = true,
                        labels = { confirm = locale('alert.confirm'), cancel = locale('alert.cancel') }
                    })
                    if alert ~= 'confirm' then
                        return openRootMenu()
                    end

                    local del = lib.callback.await('dutylogcfg:deleteOrg', false, job)
                    if del and del.ok then
                        notifyOk(locale('notify.org_deleted'))
                    else
                        notifyErr(locale('error.delete_failed'))
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
        return notifyErr(locale('error.no_permission'))
    end

    lib.registerContext({
        id = 'dutylogcfg_tools',
        menu = 'dutylogcfg_root',
        title = locale('menu.tools_title'),
        options = {
            {
                title = locale('backup.opt_clear'),
                description = locale('backup.opt_clear_desc'),
                icon = 'broom',
                onSelect = function()
                    local res = lib.alertDialog({
                        header = locale('alert.confirm_clear_title'),
                        content = locale('alert.confirm_clear_msg'),
                        centered = true,
                        cancel = true,
                        labels = { confirm = locale('alert.confirm'), cancel = locale('alert.cancel') }
                    })
                    if res ~= 'confirm' then
                        notifyWarn(locale('notify.clear_cancelled'))
                        return openRootMenu()
                    end

                    ExecuteCommand('cleardutylogs')

                    notifyOk(locale('notify.clear_sent'))
                    openRootMenu()
                end
            },
            {
                title = locale('backup.opt_backup'),
                description = locale('backup.opt_backup_desc'),
                icon = 'box-archive',
                onSelect = function()
                    local res = lib.alertDialog({
                        header = locale('alert.confirm_backup_title'),
                        content = locale('alert.confirm_backup_msg'),
                        centered = true,
                        cancel = true,
                        labels = { confirm = locale('alert.confirm'), cancel = locale('alert.cancel') }
                    })
                    if res ~= 'confirm' then
                        notifyWarn(locale('notify.backup_cancelled'))
                        return openRootMenu()
                    end

                    ExecuteCommand('backupdutylogs')

                    notifyOk(locale('notify.backup_sent'))
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
    if not isStaff then return notifyErr(locale('error.no_permission')) end

    local resp = lib.callback.await('dutylogcfg:getAll_v2', false)
    if not resp or not resp.ok then return notifyErr(locale('error.load_failed')) end

    -- Decodifica o JSON string que vem do servidor
    local dataList = {}
    if resp.json and type(resp.json) == 'string' then
        dataList = json.decode(resp.json) or {}
    end

    local options = {}

    options[#options+1] = {
        title = locale('menu.add_org'),
        description = locale('menu.add_org_desc'),
        icon = 'plus',
        onSelect = showCreateOrgDialog
    }

    options[#options+1] = {
        title = locale('menu.tools'),
        description = locale('menu.tools_desc'),
        icon = 'toolbox',
        arrow = true,
        onSelect = function()
            openToolsMenu()
        end
    }

    -- Ordenar por nome (opcional, mas bom)
    table.sort(dataList, function(a,b) return (a.jobName or '') < (b.jobName or '') end)

    for _, item in ipairs(dataList) do
        local jobName = item.jobName
        if jobName then
            options[#options+1] = {
                title = jobName,
                description = (item.LogTitle or '') .. '\nMinGrade: ' .. (item.MinReportGrade or 0),
                icon = 'building',
                arrow = true,
                onSelect = function() openOrgCard(jobName, item) end
            }
        end
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

-- ============================================================
--  DUTY LOGIC (LISTENER)
-- ============================================================
RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function()
    local Player = QBCore.Functions.GetPlayerData()
    if Player.job and Player.job.onduty then
        TriggerServerEvent('kael-dutylog:server:userjoined', Player.job.name, true)
    end
end)

RegisterNetEvent('QBCore:Client:SetDuty', function(onDuty)
    local Player = QBCore.Functions.GetPlayerData()
    if not Player or not Player.job then return end
    
    if onDuty then
        TriggerServerEvent('kael-dutylog:server:onDuty', Player.job.name)
    else
        TriggerServerEvent('kael-dutylog:server:offDuty', Player.job.name)
    end
end)

RegisterNetEvent('QBCore:Client:OnJobUpdate', function(JobInfo)
    if JobInfo.onduty then
        TriggerServerEvent('kael-dutylog:server:onDuty', JobInfo.name)
    end
end)
