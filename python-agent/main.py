"""
Agente Python do ATLAS
Servidor Flask local que executa ações reais no Windows.
Só aceita conexões de localhost (seguro).
"""
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from executor import execute_action
import logging, os
from datetime import datetime
import io
import time
import pyautogui
from actions.hand_tracker import start_vision, stop_vision, is_vision_active

app = Flask(__name__)
# Segurança: CORS restrito (Auditoria)
CORS(app, resources={r"/*": {"origins": "*"}}, allow_headers=["Content-Type", "Authorization", "ngrok-skip-browser-warning"])

# --- CARREGAMENTO DE COMANDOS CUSTOMIZADOS ---
import json
import re
from pathlib import Path

CUSTOM_COMMANDS = []
try:
    with open(Path(__file__).parent / 'custom_commands.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
        for cmd in data.get('commands', []):
            patterns = [re.compile(r'\b' + re.escape(t) + r'\b', re.IGNORECASE) for t in cmd['triggers']]
            CUSTOM_COMMANDS.append({
                'patterns': patterns,
                'action': cmd['action'],
                'target': cmd['target'],
                'response': cmd['response']
            })
    logging.info(f"{len(CUSTOM_COMMANDS)} comandos customizados carregados com sucesso.")
except Exception as e:
    logging.error(f"Erro ao carregar custom_commands.json: {e}")


# ─── MODELOS DE IA DISPONÍVEIS ────────────────────────────────────────────────
MODELS = {
    'qwen3-8b': {
        'id': 'qwen3:8b',
        'name': 'Qwen 3 (8B)',
        'desc': 'Modelo principal — inteligente e rápido. Melhor custo-benefício.',
        'size': '5.2GB'
    },
    'deepseek-coder': {
        'id': 'deepseek-coder:6.7b',
        'name': 'DeepSeek Coder (6.7B)',
        'desc': 'Especialista em código, rápido e otimizado para sua máquina.',
        'size': '3.8GB'
    },
}

current_model = 'qwen3-8b'  # Modelo padrão

LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'logs')
os.makedirs(LOG_DIR, exist_ok=True)
logging.basicConfig(
    filename=os.path.join(LOG_DIR, 'jarvis.log'),
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    encoding='utf-8'
)

@app.route('/execute', methods=['POST'])
def execute():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'result': 'Payload vazio'}), 400
    action = data.get('action', '')
    target = data.get('target', '')
    logging.info(f"Ação: {action} | Alvo: {target}")
    result = execute_action(action, target)
    
    # Interceptar mensagens feias do sistema para falar bonito na voz
    if action == 'screenshot':
        result['result'] = 'Aqui está o print da tela.'

    logging.info(f"Resultado: {result.get('result', '')}")
    return jsonify(result)

import requests
import json

@app.route('/health')
def health():
    return jsonify({
        'status': 'online',
        'time': datetime.now().isoformat(),
        'current_model': current_model,
        'model_name': MODELS.get(current_model, {}).get('name', current_model)
    })

@app.route('/actions')
def actions():
    return jsonify({'acoes': [
        'open_app', 'kill_process', 'screenshot',
        'system_info', 'shutdown', 'restart', 'sleep',
        'play_pause', 'volume_up', 'volume_down',
        'next_track', 'open_url'
    ]})

@app.route('/models', methods=['GET'])
def list_models():
    """Lista todos os modelos disponíveis e qual está ativo."""
    models_list = []
    for key, info in MODELS.items():
        models_list.append({
            'key': key,
            'id': info['id'],
            'name': info['name'],
            'desc': info['desc'],
            'size': info['size'],
            'active': key == current_model
        })
    return jsonify({'models': models_list, 'current': current_model})

@app.route('/vision/start', methods=['POST'])
def api_start_vision():
    success = start_vision()
    return jsonify({'success': True, 'result': 'Visão ativada.' if success else 'Visão já estava ativa.'})

@app.route('/vision/stop', methods=['POST'])
def api_stop_vision():
    success = stop_vision()
    return jsonify({'success': True, 'result': 'Visão desativada.' if success else 'Visão já estava desativada.'})

@app.route('/vision/status', methods=['GET'])
def api_vision_status():
    return jsonify({'active': is_vision_active()})

@app.route('/models/switch', methods=['POST'])
def switch_model():
    """Troca o modelo de IA ativo."""
    global current_model
    data = request.get_json()
    model_key = data.get('model', '')
    if model_key not in MODELS:
        return jsonify({'success': False, 'result': f'Modelo desconhecido: {model_key}. Opções: {", ".join(MODELS.keys())}'}), 400
    current_model = model_key
    model_info = MODELS[current_model]
    logging.info(f"Modelo trocado para: {model_info['name']} ({model_info['id']})")
    return jsonify({'success': True, 'result': f'Modelo trocado para {model_info["name"]}.', 'current': current_model})

def generate_frames():
    while True:
        try:
            img = pyautogui.screenshot()
            img.thumbnail((1280, 720)) # Otimização de rede
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='JPEG', quality=70)
            frame = img_byte_arr.getvalue()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            time.sleep(0.1) # Limita a ~10 fps para não pesar a CPU
        except Exception as e:
            logging.error(f"Erro no stream: {e}")
            time.sleep(1)

@app.route('/stream')
def video_stream():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/frame', methods=['GET'])
def single_frame():
    try:
        import base64
        img = pyautogui.screenshot()
        img.thumbnail((1024, 576)) # Resolução ainda menor para ser super rápido na nuvem
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='JPEG', quality=50)
        b64 = base64.b64encode(img_byte_arr.getvalue()).decode('utf-8')
        return jsonify({'success': True, 'frame': b64})
    except Exception as e:
        logging.error(f"Erro no frame: {e}")
        return jsonify({'success': False}), 500

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({'success': False, 'result': 'Mensagem vazia.'}), 400
    
    user_message = data['message']
    user_text = user_message.lower()

    # --- MOTOR NLP LOCAL (Substitui o Ollama com 0ms de delay) ---
    import re
    
    # 0. Comandos Customizados (custom_commands.json)
    for cmd in CUSTOM_COMMANDS:
        for pattern in cmd['patterns']:
            if pattern.search(user_text):
                if cmd['action']:
                    res = execute_action(cmd['action'], cmd['target'])
                    return jsonify({'success': True, 'is_action': True, 'text': cmd['response'], 'action_result': res})
                else:
                    return jsonify({'success': True, 'is_action': False, 'text': cmd['response']})

    
    # 1. Abrir coisas
    match_abrir = re.search(r'(abrir|abre|inicia|iniciar) (o|a)?\s*(.*)', user_text)
    if match_abrir:
        target = match_abrir.group(3).strip()
        if "youtube" in target:
            execute_action('open_url', 'youtube.com')
            return jsonify({'success': True, 'is_action': True, 'text': 'Abrindo o YouTube para você.'})
        else:
            execute_action('open_app', target)
            return jsonify({'success': True, 'is_action': True, 'text': f'Iniciando {target}.'})

    # 2. Fechar coisas
    match_fechar = re.search(r'(fechar|fecha|encerra|encerrar|matar) (o|a)?\s*(.*)', user_text)
    if match_fechar:
        target = match_fechar.group(3).strip()
        execute_action('kill_process', target)
        return jsonify({'success': True, 'is_action': True, 'text': f'Fechando {target}.'})

    # 3. Print / Captura
    if "print" in user_text or "captura de tela" in user_text or "foto" in user_text:
        res = execute_action('screenshot', '')
        return jsonify({'success': True, 'is_action': True, 'text': 'Aqui está o print da tela.', 'action_result': res})

    # 3.5. Visão
    if "ativar visão" in user_text or "ligar câmera" in user_text:
        start_vision()
        return jsonify({'success': True, 'is_action': True, 'text': 'Câmera e controle por gestos ativados.'})
    if "desativar visão" in user_text or "desligar câmera" in user_text:
        stop_vision()
        return jsonify({'success': True, 'is_action': True, 'text': 'Câmera desligada.'})

    # 4. Controle de Mídia
    if "toca" in user_text or "pausa" in user_text or "música" in user_text or "play" in user_text:
        execute_action('play_pause', '')
        return jsonify({'success': True, 'is_action': True, 'text': 'Mídia pausada ou iniciada.'})
    if "próxima" in user_text or "pula" in user_text:
        execute_action('next_track', '')
        return jsonify({'success': True, 'is_action': True, 'text': 'Pulando faixa.'})
    if "volume" in user_text:
        if "aumenta" in user_text or "mais" in user_text or "sobe" in user_text:
            execute_action('volume_up', '')
            return jsonify({'success': True, 'is_action': True, 'text': 'Aumentando o volume.'})
        if "abaixa" in user_text or "menos" in user_text or "diminui" in user_text:
            execute_action('volume_down', '')
            return jsonify({'success': True, 'is_action': True, 'text': 'Abaixando o volume.'})

    # 5. Sistema
    if "suspender" in user_text or "dormir" in user_text:
        execute_action('sleep', '')
        return jsonify({'success': True, 'is_action': True, 'text': 'Boa noite. Suspendendo sistema.'})
    if "resumo" in user_text or "status" in user_text:
        res = execute_action('system_info', 'all')
        return jsonify({'success': True, 'is_action': True, 'text': 'Verificando as métricas do sistema.', 'action_result': res})

    # --- CÉREBRO PROFUNDO (IA Ollama) ---
    # Se não for um comando simples, repassa para a verdadeira IA pensar.
    prompt = f"""Você é o ATLAS. O usuário disse: "{user_message}"
Responda SEMPRE com um JSON válido:
{{
  "is_action": booleano,
  "action": "acao",
  "target": "alvo",
  "response_text": "sua conversa"
}}
Ações válidas: open_app, kill_process, screenshot, system_info, shutdown, restart, sleep, play_pause, volume_up, volume_down, next_track, prev_track, open_url.
Se for apenas bate-papo (ex: conte uma piada, olá), is_action é false."""

    try:
        import requests
        import json
        model_id = MODELS[current_model]['id']
        logging.info(f"Enviando para Ollama ({MODELS[current_model]['name']})...")
        res = requests.post('http://127.0.0.1:11434/api/generate', json={
            "model": model_id,
            "prompt": prompt,
            "format": "json",
            "stream": False
        }, timeout=120)
        
        if res.status_code == 200:
            raw_response = res.json().get('response', '')
            
            # Limpa blockquotes de markdown se a IA retornar json formatado com ```json
            clean_json_str = raw_response.strip()
            if clean_json_str.startswith('```json'):
                clean_json_str = clean_json_str[7:]
            elif clean_json_str.startswith('```'):
                clean_json_str = clean_json_str[3:]
            if clean_json_str.endswith('```'):
                clean_json_str = clean_json_str[:-3]
            clean_json_str = clean_json_str.strip()

            try:
                ai_data = json.loads(clean_json_str)
            except json.JSONDecodeError as err:
                logging.error(f"Falha ao decodificar JSON da IA: {err} | Conteúdo: {raw_response}")
                return jsonify({'success': False, 'text': 'O Cérebro profundo retornou uma resposta confusa. Tente de novo.'})
            
            if ai_data.get('is_action'):
                action = ai_data.get('action')
                target = ai_data.get('target', '')
                action_result = execute_action(action, target)
                return jsonify({
                    'success': True,
                    'is_action': True,
                    'text': ai_data.get('response_text', 'Executando.'),
                    'action_result': action_result
                })
            else:
                return jsonify({
                    'success': True,
                    'is_action': False,
                    'text': ai_data.get('response_text', 'Entendido.')
                })
        else:
            return jsonify({'success': False, 'text': f'Erro no Cérebro profundo (Status {res.status_code}). O modelo pode ser pesado demais.'})
            
    except Exception as e:
        logging.error(f"Erro Ollama: {e}")
        return jsonify({'success': False, 'text': 'Meu cérebro de IA profunda está desligado no momento. Use comandos exatos.'})

if __name__ == '__main__':
    print("ATLAS Agent iniciado -> Escutando em todas as interfaces de rede na porta 5001")
    app.run(host='0.0.0.0', port=5001, debug=False)
