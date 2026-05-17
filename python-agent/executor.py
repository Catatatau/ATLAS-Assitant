from actions.apps      import open_app, kill_process
from actions.system    import get_system_info, shutdown_pc, restart_pc, sleep_pc, shutdown_jarvis
from actions.media     import play_pause, volume_up, volume_down, next_track, prev_track
from actions.screenshot import take_screenshot
from actions.web       import open_url

def execute_action(action: str, target: str) -> dict:
    try:
        mapa = {
            'open_app':    lambda: open_app(target),
            'kill_process':lambda: kill_process(target),
            'screenshot':  lambda: take_screenshot(),
            'system_info': lambda: get_system_info(target),
            'shutdown':    lambda: shutdown_pc(),
            'restart':     lambda: restart_pc(),
            'sleep':       lambda: sleep_pc(),
            'shutdown_jarvis': lambda: shutdown_jarvis(),
            'play_pause':  lambda: play_pause(),
            'volume_up':   lambda: volume_up(),
            'volume_down': lambda: volume_down(),
            'next_track':  lambda: next_track(),
            'prev_track':  lambda: prev_track(),
            'open_url':    lambda: open_url(target),
        }
        if action not in mapa:
            return {'success': False, 'result': f'Ação desconhecida: {action}'}
        return mapa[action]()
    except Exception as e:
        return {'success': False, 'result': f'Erro: {str(e)}'}
