import subprocess, psutil, os

# ─── EDITE COM OS CAMINHOS DO SEU PC ─────────────────────────────────────────
APP_MAP = {
    'discord':    r'%LOCALAPPDATA%\Discord\Update.exe --processStart Discord.exe',
    'spotify':    r'%APPDATA%\Spotify\Spotify.exe',
    'chrome':     r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'firefox':    r'C:\Program Files\Mozilla Firefox\firefox.exe',
    'steam':      r'C:\Program Files (x86)\Steam\steam.exe',
    'obs':        r'C:\Program Files\obs-studio\bin\64bit\obs64.exe',
    'vscode':     r'%LOCALAPPDATA%\Programs\Microsoft VS Code\Code.exe',
    'minecraft':  r'C:\XboxGames\Minecraft Launcher\Content\Minecraft.exe',
    'notepad':    'notepad.exe',
    'calculator': 'calc.exe',
    'explorer':   'explorer.exe',
    'taskmgr':    'taskmgr.exe',
}

def open_app(name: str) -> dict:
    name_lower = name.lower().strip()
    exe = APP_MAP.get(name_lower, name_lower)
    exe = os.path.expandvars(exe)
    try:
        subprocess.Popen(exe, shell=True)
        return {'success': True, 'result': f'✅ {name.capitalize()} iniciado.'}
    except Exception as e:
        return {'success': False, 'result': f'❌ Não encontrado: {name}. Erro: {e}'}

def kill_process(name: str) -> dict:
    mortos = []
    for proc in psutil.process_iter(['name', 'pid']):
        try:
            if name.lower() in proc.info['name'].lower():
                proc.kill()
                mortos.append(proc.info['name'])
        except: continue
    if mortos:
        return {'success': True, 'result': f'✅ Encerrado: {", ".join(mortos)}'}
    return {'success': False, 'result': f'❌ Processo não encontrado: {name}'}
