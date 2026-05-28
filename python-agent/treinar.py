"""
Treinador do Jarvis — Adicione novos comandos personalizados facilmente.
Rode este script para ensinar novas frases e ações ao Jarvis.
"""
import json
import os

COMMANDS_FILE = os.path.join(os.path.dirname(__file__), 'custom_commands.json')

def load_commands():
    if os.path.exists(COMMANDS_FILE):
        with open(COMMANDS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"commands": []}

def save_commands(data):
    with open(COMMANDS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def list_commands(data):
    print("\n═══════════════════════════════════════════")
    print("  COMANDOS PERSONALIZADOS DO JARVIS")
    print("═══════════════════════════════════════════")
    for i, cmd in enumerate(data['commands'], 1):
        triggers = ', '.join(cmd['triggers'])
        action = cmd.get('action', '') or '(nenhuma)'
        target = cmd.get('target', '') or '(nenhum)'
        response = cmd.get('response', '')
        print(f"\n  [{i}] Gatilhos: {triggers}")
        print(f"      Ação: {action} → {target}")
        print(f"      Resposta: {response}")
    if not data['commands']:
        print("\n  Nenhum comando personalizado ainda!")
    print("\n═══════════════════════════════════════════\n")

def add_command(data):
    print("\n--- ADICIONAR NOVO COMANDO ---")
    print("Digite as frases que ativam o comando (separe por vírgula):")
    print("  Exemplo: abre meu jogo, joga fortnite, bora jogar")
    triggers_input = input("  Gatilhos: ").strip()
    if not triggers_input:
        print("Cancelado.")
        return
    triggers = [t.strip().lower() for t in triggers_input.split(',') if t.strip()]

    print("\nQual ação o Jarvis deve executar?")
    print("  Opções: open_app, open_url, kill_process, screenshot, search_google,")
    print("          search_youtube, search_spotify, play_pause, volume_up,")
    print("          volume_down, next_track, shutdown, restart, sleep, lock")
    print("  (deixe vazio se for só responder sem ação)")
    action = input("  Ação: ").strip()

    target = ""
    if action:
        print("\nQual o alvo da ação?")
        if action == 'open_app':
            print("  Exemplo: chrome, discord, notepad, spotify")
        elif action == 'open_url':
            print("  Exemplo: youtube.com, https://google.com")
        elif action == 'search_google':
            print("  Exemplo: previsão do tempo")
        elif action == 'search_youtube':
            print("  Exemplo: lofi hip hop")
        target = input("  Alvo: ").strip()

    print("\nO que o Jarvis deve FALAR quando executar?")
    print("  Exemplo: Abrindo seu jogo favorito!")
    response = input("  Resposta: ").strip() or "Comando executado."

    new_cmd = {
        "triggers": triggers,
        "action": action,
        "target": target,
        "response": response
    }
    data['commands'].append(new_cmd)
    save_commands(data)
    print(f"\n✅ Comando adicionado com sucesso! Gatilhos: {', '.join(triggers)}")

def remove_command(data):
    list_commands(data)
    if not data['commands']:
        return
    try:
        idx = int(input("Digite o número do comando para remover: ")) - 1
        if 0 <= idx < len(data['commands']):
            removed = data['commands'].pop(idx)
            save_commands(data)
            print(f"✅ Comando removido: {', '.join(removed['triggers'])}")
        else:
            print("Número inválido.")
    except ValueError:
        print("Digite um número válido.")

def main():
    print()
    print("  ╔══════════════════════════════════════╗")
    print("  ║    TREINADOR DO J.A.R.V.I.S  🧠     ║")
    print("  ╚══════════════════════════════════════╝")
    print()

    data = load_commands()

    while True:
        print("  [1] Ver comandos existentes")
        print("  [2] Adicionar novo comando")
        print("  [3] Remover um comando")
        print("  [4] Sair")
        choice = input("\n  Escolha: ").strip()

        if choice == '1':
            list_commands(data)
        elif choice == '2':
            add_command(data)
            data = load_commands()
        elif choice == '3':
            remove_command(data)
            data = load_commands()
        elif choice == '4':
            print("\nAté mais! Os comandos já estão salvos e o Jarvis vai usá-los na próxima mensagem.")
            break
        else:
            print("Opção inválida.")

if __name__ == '__main__':
    main()
