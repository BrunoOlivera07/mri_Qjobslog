local QBCore = exports[Config.Core or 'qb-core']:GetCoreObject()

--util para (re)enviar status atual quando carregar/reiniciar
local function SendJoinedSnapshot()
    local pd = QBCore.Functions.GetPlayerData()
    if not pd or not pd.job then return end
    TriggerServerEvent("kael-dutylog:server:userjoined", pd.job.name, pd.job.onduty)
end

--jogador carregou → manda snapshot de job/duty
RegisterNetEvent("QBCore:Client:OnPlayerLoaded", function()
    SendJoinedSnapshot()
end)

--Recurso iniciou durante jogo → manda snapshot também
AddEventHandler("onResourceStart", function(res)
    if res ~= GetCurrentResourceName() then return end

    CreateThread(function()
        Wait(500)
        SendJoinedSnapshot()
    end)
end)

--QBCore informa mudança de duty (padrão QBCore/QBox)
RegisterNetEvent("QBCore:Client:SetDuty", function(isOnDuty)
    local pd = QBCore.Functions.GetPlayerData()
    if not pd or not pd.job then return end
    local jobName = pd.job.name
    if isOnDuty then
        TriggerServerEvent("kael-dutylog:server:onDuty", jobName)
    else
        TriggerServerEvent("kael-dutylog:server:offDuty", jobName)
    end
end)

--Após o toggle, esperamos 200ms e lemos o estado atualizado.
RegisterNetEvent("MRI_QDuty:client:ToggleDuty", function()
    CreateThread(function()
        Wait(200)
        local pd = QBCore.Functions.GetPlayerData()
        if not pd or not pd.job then return end
        local jobName = pd.job.name
        if pd.job.onduty then
            TriggerServerEvent("kael-dutylog:server:onDuty", jobName)
        else
            TriggerServerEvent("kael-dutylog:server:offDuty", jobName)
        end
    end)
end)

RegisterNetEvent("QBCore:Client:OnJobUpdate", function(job)
    if not job then return end

    Wait(100)
    SendJoinedSnapshot()
end)