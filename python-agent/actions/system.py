import psutil, subprocess

def get_system_info(target: str = 'all') -> dict:
    ram   = psutil.virtual_memory()
    cpu   = psutil.cpu_percent(interval=1)
    disco = psutil.disk_usage('C:\\')

    if target == 'ram':
        return {'success': True, 'result':
            f"💾 RAM: {ram.percent}% em uso\n"
            f"   Usado: {ram.used//(1024**3):.1f}GB / Total: {ram.total//(1024**3):.1f}GB\n"
            f"   Livre: {ram.available//(1024**3):.1f}GB"}
    elif target == 'cpu':
        return {'success': True, 'result': f"🖥️ CPU: {cpu}% em uso ({psutil.cpu_count()} núcleos)"}
    elif target == 'disco':
        return {'success': True, 'result':
            f"💿 Disco C:\n"
            f"   Usado: {disco.used//(1024**3):.1f}GB / Total: {disco.total//(1024**3):.1f}GB\n"
            f"   Livre: {disco.free//(1024**3):.1f}GB ({100-disco.percent:.0f}%)"}
    else:
        return {'success': True, 'result':
            f"📊 Status:\n"
            f"🖥️ CPU:   {cpu}%\n"
            f"💾 RAM:   {ram.percent}% ({ram.used//(1024**3):.1f}/{ram.total//(1024**3):.1f}GB)\n"
            f"💿 Disco: {disco.percent}% usado ({disco.free//(1024**3):.1f}GB livres)"}

def shutdown_pc() -> dict:
    subprocess.run('shutdown /s /t 30', shell=True)
    return {'success': True, 'result': '⚠️ PC desliga em 30s. Para cancelar: CMD → shutdown /a'}

def restart_pc() -> dict:
    subprocess.run('shutdown /r /t 30', shell=True)
    return {'success': True, 'result': '⚠️ PC reinicia em 30s. Para cancelar: CMD → shutdown /a'}

def sleep_pc() -> dict:
    subprocess.run('rundll32.exe powrprof.dll,SetSuspendState 0,1,0', shell=True)
    return {'success': True, 'result': '😴 Entrando em modo sleep.'}
