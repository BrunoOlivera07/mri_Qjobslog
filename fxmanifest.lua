fx_version 'cerulean'
lua54 'yes'
game 'gta5'

author 'Gordela | New Age Studios'
description 'Duty Logs + In-game Configurator (ox_lib)'
version '1.0.0'

shared_scripts {
    '@ox_lib/init.lua',
    'shared/config.lua',
    'shared/locale.lua'
}

client_scripts {
    'client/config_ui.lua',
}

server_scripts {
    'server/main.lua',
    'server/backup_logs.lua'
}

files {
    'mri_Qjobslog.sql',
    'locales/*.json'
}
