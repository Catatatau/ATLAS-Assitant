import webbrowser

def open_url(url: str) -> dict:
    if not url.startswith('http'):
        url = f'https://{url}'
    webbrowser.open(url)
    return {'success': True, 'result': f'🌐 Abrindo: {url}'}
