import pyautogui
import time
import subprocess

# Habilita a trava de segurança do pyautogui (exigido pela auditoria)
pyautogui.FAILSAFE = True

def click_at(x, y):
    """Clica em uma posição específica da tela."""
    pyautogui.click(int(x), int(y))
    return {'success': True, 'result': f'Cliquei na posição ({x}, {y}).'}

def double_click_at(x, y):
    """Dá duplo clique em uma posição específica."""
    pyautogui.doubleClick(int(x), int(y))
    return {'success': True, 'result': f'Duplo clique na posição ({x}, {y}).'}

def right_click_at(x, y):
    """Clica com o botão direito."""
    pyautogui.rightClick(int(x), int(y))
    return {'success': True, 'result': f'Clique direito na posição ({x}, {y}).'}

def type_text(text):
    """Digita um texto no campo ativo."""
    pyautogui.write(text, interval=0.03)
    return {'success': True, 'result': f'Texto digitado.'}

def type_text_br(text):
    """Digita texto com suporte a caracteres especiais (português)."""
    import pyperclip
    pyperclip.copy(text)
    pyautogui.hotkey('ctrl', 'v')
    return {'success': True, 'result': f'Texto colado.'}

def press_hotkey(*keys):
    """Pressiona uma combinação de teclas (ex: ctrl+c)."""
    pyautogui.hotkey(*keys)
    return {'success': True, 'result': f'Atalho executado: {"+".join(keys)}.'}

def press_key(key):
    """Pressiona uma tecla simples (enter, tab, escape, etc)."""
    pyautogui.press(key)
    return {'success': True, 'result': f'Tecla pressionada: {key}.'}

def scroll_page(direction='down', amount=5):
    """Rola a página para cima ou para baixo."""
    clicks = int(amount) if direction == 'up' else -int(amount)
    pyautogui.scroll(clicks)
    return {'success': True, 'result': f'Página rolada para {"cima" if direction == "up" else "baixo"}.'}

def move_mouse(x, y):
    """Move o mouse para uma posição."""
    pyautogui.moveTo(int(x), int(y), duration=0.3)
    return {'success': True, 'result': f'Mouse movido para ({x}, {y}).'}

# ═══════════════════════════════════════════════════════════════
# WORKFLOWS INTELIGENTES (Combina múltiplas ações automaticamente)
# ═══════════════════════════════════════════════════════════════

def search_in_browser(query, browser='chrome'):
    """Abre o navegador e pesquisa direto na barra de endereço."""
    import webbrowser
    url = f'https://www.google.com/search?q={query}'
    webbrowser.open(url)
    return {'success': True, 'result': f'Pesquisando "{query}" no navegador.'}

def search_youtube(query):
    """Pesquisa diretamente no YouTube."""
    import webbrowser
    url = f'https://www.youtube.com/results?search_query={query}'
    webbrowser.open(url)
    return {'success': True, 'result': f'Pesquisando "{query}" no YouTube.'}

def search_spotify(query):
    """Pesquisa diretamente no Spotify Web."""
    import webbrowser
    url = f'https://open.spotify.com/search/{query}'
    webbrowser.open(url)
    return {'success': True, 'result': f'Pesquisando "{query}" no Spotify.'}

def navigate_to_url(url):
    """Vai para uma URL no navegador ativo (Ctrl+L + digita + Enter)."""
    pyautogui.hotkey('ctrl', 'l')
    time.sleep(0.3)
    import pyperclip
    pyperclip.copy(url)
    pyautogui.hotkey('ctrl', 'v')
    time.sleep(0.2)
    pyautogui.press('enter')
    return {'success': True, 'result': f'Navegando para {url}.'}

def new_tab(url=''):
    """Abre uma nova aba no navegador."""
    pyautogui.hotkey('ctrl', 't')
    if url:
        time.sleep(0.3)
        import pyperclip
        pyperclip.copy(url if url.startswith('http') else f'https://{url}')
        pyautogui.hotkey('ctrl', 'v')
        time.sleep(0.2)
        pyautogui.press('enter')
    return {'success': True, 'result': f'Nova aba aberta.'}

def close_tab():
    """Fecha a aba atual do navegador."""
    pyautogui.hotkey('ctrl', 'w')
    return {'success': True, 'result': 'Aba fechada.'}

def fullscreen():
    """Coloca a janela ativa em tela cheia (F11)."""
    pyautogui.press('f11')
    return {'success': True, 'result': 'Tela cheia ativada.'}

def undo():
    """Desfaz a última ação (Ctrl+Z)."""
    pyautogui.hotkey('ctrl', 'z')
    return {'success': True, 'result': 'Ação desfeita.'}

def redo():
    """Refaz a última ação (Ctrl+Y)."""
    pyautogui.hotkey('ctrl', 'y')
    return {'success': True, 'result': 'Ação refeita.'}

def copy_clipboard():
    """Copia o conteúdo selecionado."""
    pyautogui.hotkey('ctrl', 'c')
    return {'success': True, 'result': 'Conteúdo copiado.'}

def paste_clipboard():
    """Cola o conteúdo da área de transferência."""
    pyautogui.hotkey('ctrl', 'v')
    return {'success': True, 'result': 'Conteúdo colado.'}

def select_all():
    """Seleciona tudo (Ctrl+A)."""
    pyautogui.hotkey('ctrl', 'a')
    return {'success': True, 'result': 'Tudo selecionado.'}

def save_file():
    """Salva o arquivo atual (Ctrl+S)."""
    pyautogui.hotkey('ctrl', 's')
    return {'success': True, 'result': 'Arquivo salvo.'}

def alt_tab():
    """Alterna entre janelas (Alt+Tab)."""
    pyautogui.hotkey('alt', 'tab')
    return {'success': True, 'result': 'Janela alternada.'}

def open_task_view():
    """Abre a visão de tarefas do Windows."""
    pyautogui.hotkey('win', 'tab')
    return {'success': True, 'result': 'Visão de tarefas aberta.'}

def take_snip():
    """Abre a ferramenta de recorte do Windows."""
    pyautogui.hotkey('win', 'shift', 's')
    return {'success': True, 'result': 'Ferramenta de recorte aberta.'}

def open_emoji_picker():
    """Abre o seletor de emojis do Windows."""
    pyautogui.hotkey('win', '.')
    return {'success': True, 'result': 'Seletor de emojis aberto.'}

def zoom_in():
    """Aumenta o zoom (Ctrl++)."""
    pyautogui.hotkey('ctrl', '+')
    return {'success': True, 'result': 'Zoom aumentado.'}

def zoom_out():
    """Diminui o zoom (Ctrl+-)."""
    pyautogui.hotkey('ctrl', '-')
    return {'success': True, 'result': 'Zoom diminuído.'}

def refresh_page():
    """Atualiza a página (F5)."""
    pyautogui.press('f5')
    return {'success': True, 'result': 'Página atualizada.'}

def go_back():
    """Volta para a página anterior."""
    pyautogui.hotkey('alt', 'left')
    return {'success': True, 'result': 'Voltando página.'}

def go_forward():
    """Avança para a próxima página."""
    pyautogui.hotkey('alt', 'right')
    return {'success': True, 'result': 'Avançando página.'}
