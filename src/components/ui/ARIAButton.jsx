import { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Brain, 
} from 'lucide-react';

export default function ARIAButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      sender: 'aria', 
      text: "Bonjour! 🇲🇦 Je suis ARIA, votre assistante d'apprentissage IA. Comment puis-je vous aider aujourd'hui dans votre parcours ?",
      time: '12:30' 
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const chatEndRef = useRef(null);

  // Scroll to bottom whenever messages list updates
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Pre-coded interactive answers for Moroccan AI questions
  const getAIResponse = (input) => {
    const text = input.toLowerCase();
    
    if (text.includes('salam') || text.includes('bonjour') || text.includes('salut')) {
      return "Salam! Que puis-je faire pour vous aujourd'hui ? Êtes-vous prêt à explorer nos cours d'Intelligence Artificielle ?";
    }
    if (text.includes('certificat') || text.includes('diplome')) {
      return "Nos certificats d'IA sont accrédités par l'IAAI Maroc. Complétez tous les quiz d'un parcours avec un score > 80% pour débloquer votre certificat téléchargeable et partageable sur LinkedIn !";
    }
    if (text.includes('d Darija') || text.includes('darija') || text.includes('maroc')) {
      return "Absolument ! Tous nos modèles et explications d'IA incluent des exemples contextualisés pour le Maroc, et nous lançons très bientôt des cours sur le NLP appliqué au dialecte Darija marocain !";
    }
    if (text.includes('payant') || text.includes('gratuit') || text.includes('prix') || text.includes('illimité')) {
      return "Vous êtes actuellement sur le Plan Gratuit. Pour débloquer l'accès à nos calculateurs GPU cloud, des quiz avancés et des certifications officielles, vous pouvez passer au plan Illimité pour seulement 299 DH/mois !";
    }
    if (text.includes('quiz') || text.includes('examen')) {
      return "Chaque module se termine par un Quiz interactif de 5 à 10 questions. N'hésitez pas à relire le syllabus du module et à vous exercer sur les notions de base !";
    }
    return "C'est une excellente question ! Dans le cadre de votre formation IAAI 101, l'apprentissage de ce concept vous aidera à mieux appréhender les modèles pré-entraînés (LLMs) et le Machine Learning. Souhaitez-vous des exemples concrets ?";
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: inputText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    const currentQuery = inputText;
    setInputText('');
    setIsTyping(true);

    // Simulate natural AI thinking delay
    setTimeout(() => {
      setIsTyping(false);
      const ariaMsg = {
        id: Date.now() + 1,
        sender: 'aria',
        text: getAIResponse(currentQuery),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, ariaMsg]);
    }, 1200);
  };

  const handleSuggestionClick = (suggestion) => {
    setInputText(suggestion);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Gradient Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Contacter l'assistante IA ARIA"
        className={`flex items-center gap-2.5 px-6 py-4 rounded-full bg-gradient-to-r from-brand-pink to-brand-purple hover:from-brand-purple hover:to-brand-pink text-white font-bold shadow-lg shadow-purple-300 hover:shadow-xl hover:shadow-purple-400 hover:-translate-y-1 transition-all duration-300 animate-float border border-white/20`}
      >
        <div className="relative">
          <MessageSquare className="w-5 h-5" />
          <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-white animate-ping" />
          <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-white" />
        </div>
        <span className="tracking-wide">ARIA</span>
      </button>

      {/* ARIA Chat Window popup (Slide Up & Fade) */}
      {isOpen && (
        <div 
          className="absolute bottom-20 right-0 w-96 h-[500px] bg-white rounded-3xl border border-purple-100 shadow-2xl flex flex-col overflow-hidden z-50 animate-float transition-all duration-300"
          role="dialog"
          aria-labelledby="aria-title"
        >
          {/* Chat Window Header */}
          <div className="p-4 bg-gradient-to-r from-brand-pink to-brand-purple text-white flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                <Brain className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <h3 id="aria-title" className="text-sm font-bold tracking-tight">ARIA AI</h3>
                <span className="text-[10px] text-purple-100 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Tuteur IA en ligne
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors text-white"
                aria-label="Fermer le tuteur ARIA"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-purple-50/20">
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div 
                  className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-sm transition-all duration-300 ${
                    msg.sender === 'user' 
                      ? 'bg-brand-purple text-white rounded-tr-none' 
                      : 'bg-white text-slate-800 border border-purple-100/50 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1 font-medium">{msg.time}</span>
              </div>
            ))}

            {/* AI Typing Indicator */}
            {isTyping && (
              <div className="flex flex-col items-start">
                <div className="px-4 py-3 rounded-2xl bg-white border border-purple-100/50 rounded-tl-none flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-purple animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-purple animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-purple animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Prompt suggestions */}
          <div className="px-4 py-2 bg-purple-50/10 border-t border-purple-50 flex gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none">
            <button 
              onClick={() => handleSuggestionClick("Comment avoir un certificat ?")}
              className="text-[10px] bg-white border border-purple-100 hover:border-brand-purple text-brand-purple font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-all duration-200"
            >
              📜 Certifications?
            </button>
            <button 
              onClick={() => handleSuggestionClick("Le contenu est-il en Darija ?")}
              className="text-[10px] bg-white border border-purple-100 hover:border-brand-purple text-brand-purple font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-all duration-200"
            >
              🇲🇦 NLP Darija?
            </button>
            <button 
              onClick={() => handleSuggestionClick("Prix du Plan Illimité")}
              className="text-[10px] bg-white border border-purple-100 hover:border-brand-purple text-brand-purple font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-all duration-200"
            >
              💎 Plan Illimité?
            </button>
          </div>

          {/* Chat Input Footer */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-purple-50 bg-white flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Posez une question à ARIA..."
              className="flex-1 h-10 px-3 bg-purple-50/30 border border-purple-100 focus:border-brand-purple rounded-xl text-xs outline-none text-slate-800 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-10 h-10 rounded-xl bg-gradient-to-r from-brand-pink to-brand-purple hover:shadow-md hover:shadow-purple-100 disabled:opacity-40 flex items-center justify-center text-white transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
