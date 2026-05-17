import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, Send, Power, Volume2, VolumeX, Play, 
  SkipForward, Monitor, Cpu, HardDrive, Chrome, Camera, Bot, Tv, X, Settings, Brain, ChevronDown
} from 'lucide-react';

function App() {
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('jarvis_api_url') || `http://${window.location.hostname}:5001`);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempApiUrl, setTempApiUrl] = useState(apiUrl);
  
  const [isOnline, setIsOnline] = useState(false);
  const [isLiveScreenOpen, setIsLiveScreenOpen] = useState(false);
  const [liveFrame, setLiveFrame] = useState(null);
  const [models, setModels] = useState([]);
  const [currentModel, setCurrentModel] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [logs, setLogs] = useState([
    { id: 1, sender: 'system', text: 'Olá, sou o Jarvis. Como posso te ajudar hoje?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Check health + fetch models periodically
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${apiUrl}/health`, {
          headers: {
            'ngrok-skip-browser-warning': 'true'
          }
        });
        if (res.ok) {
          setIsOnline(true);
          const data = await res.json();
          if (data.current_model) setCurrentModel(data.current_model);
        } else {
          setIsOnline(false);
        }
      } catch (e) {
        setIsOnline(false);
      }
    };

    const fetchModels = async () => {
      try {
        const res = await fetch(`${apiUrl}/models`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        if (res.ok) {
          const data = await res.json();
          setModels(data.models);
          setCurrentModel(data.current);
        }
      } catch (e) { /* silencioso */ }
    };

    checkHealth();
    fetchModels();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  // Lógica da Tela ao Vivo (Bypass do Ngrok)
  useEffect(() => {
    let interval;
    if (isLiveScreenOpen) {
      const fetchFrame = async () => {
        try {
          const res = await fetch(`${apiUrl}/frame`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
          });
          const data = await res.json();
          if (data.success && data.frame) {
            setLiveFrame(`data:image/jpeg;base64,${data.frame}`);
          }
        } catch (e) {
          console.error("Falha ao puxar tela ao vivo");
        }
      };
      
      fetchFrame(); // puxa o primeiro frame imediatamente
      interval = setInterval(fetchFrame, 800); // puxa a cada 0.8s
    } else {
      setLiveFrame(null);
    }
    return () => clearInterval(interval);
  }, [isLiveScreenOpen, apiUrl]);

  // Setup Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'pt-BR';
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        handleMessageSubmit(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("Seu navegador atual não suporta o microfone por padrão. Recomendado: Google Chrome no PC ou Android.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error("Erro ao iniciar microfone", e);
      }
    }
  };

  const speak = (text) => {
    if (!text) return;
    
    // Remove tags de imagem
    let cleanText = text.replace(/\[SCREENSHOT_DATA\].*$/, '');
    
    // Expressão regular mágica para remover EMOJIS! 
    // Mantém apenas Letras (\p{L}), Números (\p{N}), Pontuação (\p{P}) e Espaços (\p{Z})
    cleanText = cleanText.replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '');

    if (!cleanText.trim()) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const addMessage = (sender, text) => {
    setLogs(prev => [...prev, { id: Date.now(), sender, text }]);
  };

  // Enviar para o endpoint Ollama de chat
  const handleMessageSubmit = async (textToSend) => {
    if (!textToSend.trim()) return;
    
    addMessage('user', textToSend);
    setInputValue('');

    try {
      const res = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ message: textToSend })
      });
      
      const data = await res.json();
      
      if (data.text) {
        addMessage('system', data.text);
        speak(data.text);
      }
      
      if (data.action_result && data.action_result.screenshot) {
        addMessage('system', `[SCREENSHOT_DATA]${data.action_result.screenshot}`);
      }

    } catch (e) {
      addMessage('system', 'Desculpe, não consegui conectar ao servidor.');
      speak('Desculpe, não consegui conectar ao servidor.');
    }
  };

  // Botões de Ação Direta (ignoram o LLM e vão direto pra ação pra ser mais rápido)
  const executeDirectAction = async (action, target = '') => {
    addMessage('user', `Executar ação: ${action}`);
    try {
      const res = await fetch(`${apiUrl}/execute`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ action, target })
      });
      const data = await res.json();
      addMessage('system', data.result);
      speak(data.result);
      if (data.screenshot) {
        addMessage('system', `[SCREENSHOT_DATA]${data.screenshot}`);
      }
    } catch (e) {
      addMessage('system', 'Erro na conexão direta.');
    }
  };

  const renderMessageContent = (msg) => {
    if (msg.text.includes('[SCREENSHOT_DATA]')) {
      const textPart = msg.text.split('[SCREENSHOT_DATA]')[0];
      const b64 = msg.text.split('[SCREENSHOT_DATA]')[1];
      return (
        <>
          {textPart && <p>{textPart}</p>}
          <img src={`data:image/png;base64,${b64}`} alt="Screenshot" className="message-image" />
        </>
      );
    }
    return <p>{msg.text}</p>;
  };

  const switchModel = async (modelKey) => {
    try {
      const res = await fetch(`${apiUrl}/models/switch`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ model: modelKey })
      });
      const data = await res.json();
      if (data.success) {
        setCurrentModel(data.current);
        addMessage('system', `🧠 ${data.result}`);
        speak(data.result);
      }
    } catch (e) {
      addMessage('system', 'Erro ao trocar modelo.');
    }
    setIsModelDropdownOpen(false);
  };

  const activeModel = models.find(m => m.key === currentModel);

  return (
    <div className="app-container">
      
      {/* Sidebar - Painel Rápido */}
      <aside className="action-sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <Bot size={24} color="var(--primary)" />
            <span>Jarvis Panel</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button className="btn-icon" onClick={() => setIsSettingsOpen(true)} title="Configurações de Conexão" style={{ background: 'none' }}>
              <Settings size={20} color="var(--text-muted)" />
            </button>
            <div className={`status-dot ${!isOnline ? 'offline' : ''}`} title={isOnline ? 'Online' : 'Offline'} />
          </div>
        </div>

        {isLiveScreenOpen ? (
          <div className="live-stream-sidebar">
            <div className="live-stream-header">
              <h3><Tv size={18} color="var(--primary)" /> Tela ao Vivo</h3>
              <button className="btn-close-inline" onClick={() => setIsLiveScreenOpen(false)} title="Fechar Visualização">
                <X size={16} />
              </button>
            </div>
            {liveFrame ? (
              <img 
                src={liveFrame} 
                alt="Live Screen Stream" 
                className="stream-image-inline"
              />
            ) : (
              <div className="stream-image-inline" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', color: 'gray' }}>
                Conectando ao PC...
              </div>
            )}
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px' }}>
              Transmissão em tempo real ativa. Feche para voltar aos controles.
            </p>
          </div>
        ) : (
          <div className="action-sections">
            <div className="action-section">
              <h3>Apps & Web</h3>
              <div className="grid-buttons">
                <button className="action-btn" onClick={() => executeDirectAction('open_app', 'chrome')}>
                  <Chrome size={20} /> Chrome
                </button>
                <button className="action-btn" onClick={() => executeDirectAction('open_url', 'youtube.com')}>
                  <Play size={20} /> YouTube
                </button>
              </div>
            </div>

            <div className="action-section">
              <h3>Mídia</h3>
              <div className="grid-buttons">
                <button className="action-btn" onClick={() => executeDirectAction('play_pause')}>
                  <Play size={20} /> Play/Pause
                </button>
                <button className="action-btn" onClick={() => executeDirectAction('next_track')}>
                  <SkipForward size={20} /> Próxima
                </button>
                <button className="action-btn" onClick={() => executeDirectAction('volume_up')}>
                  <Volume2 size={20} /> Vol +
                </button>
                <button className="action-btn" onClick={() => executeDirectAction('volume_down')}>
                  <VolumeX size={20} /> Vol -
                </button>
              </div>
            </div>

            <div className="action-section">
              <h3>Sistema</h3>
              <div className="grid-buttons">
                <button className="action-btn" onClick={() => executeDirectAction('system_info', 'all')}>
                  <Monitor size={20} /> Resumo
                </button>
                <button className="action-btn" onClick={() => executeDirectAction('screenshot')}>
                  <Camera size={20} /> Print
                </button>
                <button className="action-btn" onClick={() => setIsLiveScreenOpen(true)} style={{ gridColumn: '1 / -1' }}>
                  <Tv size={20} color="var(--primary)" /> Tela ao Vivo
                </button>
              </div>
            </div>

            <div className="action-section">
              <h3>Energia</h3>
              <div className="grid-buttons">
                <button className="action-btn danger" onClick={() => executeDirectAction('sleep')}>
                  <Power size={20} /> Suspender
                </button>
              </div>
            </div>

            {/* Model Selector */}
            <div className="action-section model-section">
              <h3>🧠 Modelo de IA</h3>
              <div className="model-selector">
                <button 
                  className="model-current-btn" 
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                >
                  <div className="model-current-info">
                    <Brain size={18} color="var(--primary)" />
                    <div>
                      <span className="model-current-name">{activeModel?.name || currentModel}</span>
                      <span className="model-current-size">{activeModel?.size || ''}</span>
                    </div>
                  </div>
                  <ChevronDown size={16} className={`model-chevron ${isModelDropdownOpen ? 'open' : ''}`} />
                </button>
                
                {isModelDropdownOpen && (
                  <div className="model-dropdown">
                    {models.map(m => (
                      <button 
                        key={m.key} 
                        className={`model-option ${m.key === currentModel ? 'active' : ''}`}
                        onClick={() => switchModel(m.key)}
                      >
                        <div className="model-option-info">
                          <span className="model-option-name">{m.name}</span>
                          <span className="model-option-desc">{m.desc}</span>
                        </div>
                        <span className="model-option-size">{m.size}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Chat Area */}
      <main className="chat-container">
        
        <header className="chat-header">
          <div className="avatar">
            <Bot size={24} />
          </div>
          <div className="chat-title">
            <h2>J.A.R.V.I.S Assistant</h2>
            <span>{isOnline ? (activeModel ? `${activeModel.name} • Pronto` : 'Pronto para ajudar') : 'Desconectado'}</span>
          </div>
        </header>

        <div className="chat-messages">
          {logs.map(msg => (
            <div key={msg.id} className={`message-wrapper ${msg.sender}`}>
              <div className="message-bubble">
                {renderMessageContent(msg)}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form 
          className="chat-input-area" 
          onSubmit={(e) => { e.preventDefault(); handleMessageSubmit(inputValue); }}
        >
          <div className="input-container">
            <button 
              type="button" 
              className={`btn-icon ${isListening ? 'active-mic' : ''}`}
              onClick={toggleMic}
              title="Falar"
            >
              <Mic size={20} />
            </button>
            
            <input 
              type="text" 
              className="chat-input"
              placeholder="Fale ou digite um comando..." 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            
            <button type="submit" className="btn-icon btn-send" title="Enviar">
              <Send size={18} />
            </button>
          </div>
        </form>

      </main>
      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚙️ Configurações (Acesso Remoto)</h2>
              <button className="btn-close" onClick={() => setIsSettingsOpen(false)}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ color: 'var(--text-muted)' }}>
                Se você está acessando pela nuvem (Netlify), cole aqui o link público do seu túnel (ex: ngrok, localtunnel).
              </p>
              <input 
                type="text" 
                className="chat-input"
                style={{ width: '100%', border: '1px solid var(--panel-border)' }}
                value={tempApiUrl}
                onChange={e => setTempApiUrl(e.target.value)}
                placeholder="https://exemplo.ngrok.app"
              />
              <button 
                className="action-btn"
                style={{ background: 'var(--primary)', color: 'white', alignSelf: 'flex-start', marginTop: '10px' }}
                onClick={() => {
                  const cleanUrl = tempApiUrl.replace(/\/$/, ''); // Remove a barra no final se tiver
                  setApiUrl(cleanUrl);
                  localStorage.setItem('jarvis_api_url', cleanUrl);
                  setIsSettingsOpen(false);
                }}
              >
                Salvar Configuração
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
