import pyautogui, base64, os
from io import BytesIO
from datetime import datetime

DIR = r'C:\jarvis-project\logs\screenshots'

def take_screenshot() -> dict:
    try:
        os.makedirs(DIR, exist_ok=True)
        img  = pyautogui.screenshot()
        nome = f'print_{datetime.now().strftime("%Y%m%d_%H%M%S")}.png'
        img.save(os.path.join(DIR, nome))
        buf  = BytesIO()
        img.save(buf, format='PNG', optimize=True)
        b64  = base64.b64encode(buf.getvalue()).decode()
        return {
            'success': True,
            'result': f'📸 Screenshot salvo: {nome}',
            'screenshot': b64
        }
    except Exception as e:
        return {'success': False, 'result': f'Erro: {e}'}
