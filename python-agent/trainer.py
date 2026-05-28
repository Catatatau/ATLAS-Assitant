"""
Treinador do Jarvis — Ensine comandos personalizados ao seu assistente!
Rode este script para adicionar, ver ou remover comandos que o Jarvis vai aprender.
"""
import json
import os

COMMANDS_FILE = os.path.join(os.path.dirname(__file__), 'custom_commands.json')

def load_commands():
    if not os.path.exists(COMMANDS_FILE):
        return {"commands": []}
    with open(COMMANDS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_commands(data):
    with open(COMMANDS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def list_actions():
    print("\n╔════════════════════════════════════════════╗")
    print("║     AÇÕES DISPONÍVEIS DO JARVIS           ║")
    print("╠════════════════════════════════════════════╣")
    actions = [
        ("open_app",      "Abrir um programa",            "nome do app (ex: chrome, discord, spotify)"),
        ("kill_process",  "Fechar um programa",           "nome do app (ex: chrome, notepad)"),
        ("open_url",      "Abrir um site",                "URL (ex: youtube.com, google.com)"),
        ("search_youtube","Pesquisar no YouTube",          "o que pesquisar (ex: musica legal)"),
        ("search_spotify","Pesquisar no Spotify",          "o que pesquisar (ex: rock nacional)"),
        ("search_browser","Pesquisar no Google",           "o que pesquisar"),
        ("screenshot",    "Tirar print da tela",          "deixe vazio"),
        ("play_pause",    "Play/Pause mídia",             "deixe vazio"),
        ("volume_up",     "Aumentar volume",              "deixe vazio"),
        ("volume_down",   "Diminuir volume",              "deixe vazio"),
        ("volume_mute",   "Mutar som",                    "deixe vazio"),
        ("next_track",    "Próxima música",               "deixe vazio"),
        ("prev_track",    "Música anterior",              "deixe vazio"),
        ("shutdown",      "Desligar o PC",                "deixe vazio"),
        ("restart",       "Reiniciar o PC",               "deixe vazio"),
        ("sleep",         "Suspender o PC",               "deixe vazio"),
        ("lock",          "Bloquear a tela",              "deixe vazio"),
        ("minimize_all",  "Minimizar tudo",               "deixe vazio"),
        ("new_tab",       "Nova aba no navegador",        "URL opcional"),
        ("close_tab",     "Fechar aba do navegador",      "deixe vazio"),
        ("fullscreen",    "Tela cheia",                   "deixe vazio"),
        ("refresh",       "Atualizar página",             "deixe vazio"),
        ("scroll_up",     "Rolar para cima",              "deixe vazio"),
        ("scroll_down",   "Rolar para baixo",             "deixe vazio"),
        ("zoom_in",       "Aumentar zoom",                "deixe vazio"),
        ("zoom_out",      "Diminuir zoom",                "deixe vazio"),
        ("copy",          "Copiar (Ctrl+C)",              "deixe vazio"),
        ("paste",         "Colar (Ctrl+V)",               "deixe vazio"),
        ("save",          "Salvar (Ctrl+S)",              "deixe vazio"),
        ("undo",          "Desfazer (Ctrl+Z)",            "deixe vazio"),
        ("type_text",     "Digitar um texto",             "o texto a digitar"),
        ("press_key",     "Pressionar uma tecla",         "nome da tecla (ex: enter, escape, tab)"),
        ("alt_tab",       "Alternar janela",              "deixe vazio"),
        ("snip",          "Ferramenta de recorte",        "deixe vazio"),
        ("system_info",   "Info do sistema",              "'all', 'cpu', 'ram' ou 'disco'"),
    ]
    for action, desc, target_help in actions:
        print(f"║  {action:<18} {desc:<25} (target: {target_help})")
    print("╚════════════════════════════════════════════╝")

def add_command():
    print("\n══════════ ENSINAR NOVO COMANDO ══════════")
    print("Vou te fazer algumas perguntas simples.\n")
    
    # Triggers
    print("1) Como você vai FALAR esse comando? (separe variações com vírgula)")
    print("   Exemplo: meu jogo, abre meu jogo, joga aquele game")
    triggers_raw = input("   → ").strip()
    if not triggers_raw:
        print("❌ Cancelado. Nenhum gatilho informado.")
        return
    triggers = [t.strip().lower() for t in triggers_raw.split(',') if t.strip()]
    
    # Ação
    print("\n2) O que o Jarvis deve FAZER quando ouvir isso?")
    list_actions()
    action = input("\n   Digite o nome da ação (ex: open_app): ").strip().lower()
    if not action:
        print("❌ Cancelado.")
        return
    
    # Alvo
    print("\n3) Qual é o ALVO da ação? (ex: nome do app, URL, texto)")
    print("   Se a ação não precisa de alvo (como play_pause), deixe vazio.")
    target = input("   → ").strip()
    
    # Resposta
    print("\n4) O que o Jarvis deve RESPONDER por voz quando executar? (ex: Abrindo seu jogo!)")
    response = input("   → ").strip()
    if not response:
        response = "Executando comando personalizado."
    
    # Salvar
    data = load_commands()
    new_cmd = {
        "triggers": triggers,
        "action": action,
        "target": target,
        "response": response
    }
    data["commands"].append(new_cmd)
    save_commands(data)
    
    print(f"\n✅ COMANDO APRENDIDO COM SUCESSO!")
    print(f"   Gatilhos: {', '.join(triggers)}")
    print(f"   Ação: {action} → {target or '(sem alvo)'}")
    print(f"   Resposta: {response}")
    print(f"\n   Reinicie o start-tudo.bat para ativar!")

def list_commands():
    data = load_commands()
    commands = data.get("commands", [])
    
    if not commands:
        print("\n📭 Nenhum comando personalizado cadastrado.")
        return
    
    print(f"\n📋 Você tem {len(commands)} comando(s) personalizado(s):\n")
    for i, cmd in enumerate(commands, 1):
        triggers = ', '.join(cmd['triggers'])
        print(f"  [{i}] Gatilhos: {triggers}")
        print(f"      Ação: {cmd['action']} → {cmd.get('target', '')}")
        print(f"      Resposta: {cmd.get('response', '')}")
        print()

def remove_command():
    data = load_commands()
    commands = data.get("commands", [])
    
    if not commands:
        print("\n📭 Nenhum comando para remover.")
        return
    
    list_commands()
    try:
        idx = int(input("Digite o número do comando para remover: ")) - 1
        if 0 <= idx < len(commands):
            removed = commands.pop(idx)
            save_commands(data)
            print(f"\n🗑️  Comando removido: {', '.join(removed['triggers'])}")
        else:
            print("❌ Número inválido.")
    except ValueError:
        print("❌ Digite um número válido.")

def main():
    while True:
        print("\n")
        print("╔════════════════════════════════════════════╗")
        print("║     🧠 TREINADOR DO JARVIS                ║")
        print("║                                            ║")
        print("║  Ensine o Jarvis a entender novos          ║")
        print("║  comandos do SEU jeito!                    ║")
        print("╠════════════════════════════════════════════╣")
        print("║  [1] Ensinar novo comando                  ║")
        print("║  [2] Ver comandos aprendidos               ║")
        print("║  [3] Remover um comando                    ║")
        print("║  [4] Ver ações disponíveis                 ║")
        print("║  [0] Sair                                  ║")
        print("╚════════════════════════════════════════════╝")
        
        choice = input("\n   Escolha: ").strip()
        
        if choice == '1':
            add_command()
        elif choice == '2':
            list_commands()
        elif choice == '3':
            remove_command()
        elif choice == '4':
            list_actions()
        elif choice == '0':
            print("\n👋 Até mais! Não esqueça de reiniciar o start-tudo.bat para ativar os novos comandos!")
            break
        else:
            print("❌ Opção inválida.")

if __name__ == '__main__':
    main()
