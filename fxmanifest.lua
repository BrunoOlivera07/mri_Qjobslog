fx_version 'cerulean'
lua54 'yes'
game 'gta5'

author 'Gordela | New Age Studios'
description 'Duty Logs + In-game Configurator (ox_lib)'
version '1.0.0'

shared_scripts {
    '@ox_lib/init.lua',   -- ox_lib
    'shared/config.lua',
}

client_scripts {
    'client/config_ui.lua',
    'client/*.lua',       -- seus outros clients (opcional)
}

server_scripts {
    'server/config_store.lua',
    'server/main.lua',       -- seus outros servers (opcional)
    'server/backup_logs.lua'
}
