import keyboard

def play_pause() -> dict:
    keyboard.send('play/pause media')
    return {'success': True, 'result': '▶️⏸️ Play/Pause acionado.'}

def volume_up() -> dict:
    for _ in range(5): keyboard.send('volume up')
    return {'success': True, 'result': '🔊 Volume aumentado.'}

def volume_down() -> dict:
    for _ in range(5): keyboard.send('volume down')
    return {'success': True, 'result': '🔉 Volume diminuído.'}

def next_track() -> dict:
    keyboard.send('next track')
    return {'success': True, 'result': '⏭️ Próxima faixa.'}

def prev_track() -> dict:
    keyboard.send('previous track')
    return {'success': True, 'result': '⏮️ Faixa anterior.'}
