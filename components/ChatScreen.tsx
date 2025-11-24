import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { AppSettings, MediaItem, Message } from '../types';
import SettingsModal from './SettingsModal';

interface ChatScreenProps {
    settings: AppSettings;
    onUpdateSettings: (s: Partial<AppSettings>) => void;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ settings, onUpdateSettings }) => {
    const [chats, setChats] = useState<Record<string, Message[]>>({});
    const [currentChatId, setCurrentChatId] = useState<string>('default');
    const [inputText, setInputText] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [mediaList, setMediaList] = useState<MediaItem[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<'connected'|'connecting'|'disconnected'>('connected');
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initial Load
    useEffect(() => {
        const load = () => {
            const savedChats = localStorage.getItem('rinkl_ai_chats');
            if (savedChats) {
                try {
                    const parsed = JSON.parse(savedChats);
                    setChats(parsed);
                    if (!parsed['default'] && Object.keys(parsed).length === 0) {
                        setChats({ 'default': [] });
                    } else if (!parsed[currentChatId]) {
                        setCurrentChatId(Object.keys(parsed)[0]);
                    }
                } catch (e) {
                    setChats({ 'default': [] });
                }
            } else {
                setChats({ 'default': [] });
            }
        };
        load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chats, currentChatId, isTyping]);

    // Save on change
    useEffect(() => {
        if (Object.keys(chats).length > 0) {
            localStorage.setItem('rinkl_ai_chats', JSON.stringify(chats));
        }
    }, [chats]);

    const handleSendMessage = async () => {
        if ((!inputText.trim() && mediaList.length === 0) || isTyping) return;

        const newMessage: Message = {
            id: Date.now().toString(),
            text: inputText.trim(),
            sender: 'user',
            timestamp: new Date().toISOString(),
            media: [...mediaList]
        };

        const updatedChats = { ...chats };
        if (!updatedChats[currentChatId]) updatedChats[currentChatId] = [];
        updatedChats[currentChatId].push(newMessage);
        setChats(updatedChats);

        setInputText('');
        setMediaList([]);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        setIsTyping(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const history = updatedChats[currentChatId].map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model',
                parts: msg.media && msg.media.length > 0 
                    ? [
                        { text: msg.text }, 
                        ...msg.media.map(m => ({ 
                            inlineData: { 
                                mimeType: m.type, 
                                data: m.data.split(',')[1] 
                            } 
                        }))
                      ]
                    : [{ text: msg.text }]
            }));

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: history,
                config: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                }
            });

            const aiText = response.text || "No response.";

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: aiText,
                sender: 'ai',
                timestamp: new Date().toISOString()
            };

            setChats(prev => ({
                ...prev,
                [currentChatId]: [...prev[currentChatId], aiMessage]
            }));

        } catch (error) {
            console.error("Gemini API Error:", error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: "Error: Could not connect to AI service.",
                sender: 'ai',
                isError: true,
                timestamp: new Date().toISOString()
            };
            setChats(prev => ({
                ...prev,
                [currentChatId]: [...prev[currentChatId], errorMessage]
            }));
        } finally {
            setIsTyping(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    setMediaList(prev => [...prev, {
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        data: ev.target?.result as string,
                        url: URL.createObjectURL(file)
                    }]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const createNewChat = () => {
        const newId = 'chat_' + Date.now();
        setChats(prev => ({ ...prev, [newId]: [] }));
        setCurrentChatId(newId);
        setIsSidebarOpen(false);
    };

    const deleteChat = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (Object.keys(chats).length <= 1) return;
        if (window.confirm("Delete this chat?")) {
            const newChats = { ...chats };
            delete newChats[id];
            setChats(newChats);
            if (currentChatId === id) {
                setCurrentChatId(Object.keys(newChats)[0]);
            }
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const openEditModal = (msg: Message) => {
        setEditingMessageId(msg.id);
        setEditText(msg.text);
    };

    const saveEditedMessage = async () => {
        if (!editingMessageId) return;

        const chat = [...chats[currentChatId]];
        const index = chat.findIndex(m => m.id === editingMessageId);
        
        if (index !== -1) {
            chat[index].text = editText;
            const newHistory = chat.slice(0, index + 1);
            
            setChats(prev => ({ ...prev, [currentChatId]: newHistory }));
            setEditingMessageId(null);
            
            setIsTyping(true);
            try {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

                const history = newHistory.map(msg => ({
                    role: msg.sender === 'user' ? 'user' : 'model',
                    parts: msg.media && msg.media.length > 0 
                    ? [
                        { text: msg.text }, 
                        ...msg.media.map(m => ({ 
                            inlineData: { 
                                mimeType: m.type, 
                                data: m.data.split(',')[1] 
                            } 
                        }))
                      ]
                    : [{ text: msg.text }]
                }));

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: history,
                    config: {
                        temperature: 0.7,
                        maxOutputTokens: 1000,
                    }
                });

                const aiText = response.text || "No response.";

                 setChats(prev => ({
                    ...prev,
                    [currentChatId]: [...prev[currentChatId], {
                        id: Date.now().toString(),
                        text: aiText,
                        sender: 'ai',
                        timestamp: new Date().toISOString()
                    }]
                }));
            } catch (e) {
                console.error(e);
            } finally {
                setIsTyping(false);
            }
        }
    };

    const clearAllData = () => {
        localStorage.clear();
        window.location.reload();
    };

    const renderContent = (text: string) => {
        const parts = text.split(/(```[\s\S]*?```|`[^`]+`|\*\*[^*]+\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('```')) {
                return <pre key={i} className="bg-gray-800 text-gray-100 p-3 rounded-md overflow-x-auto my-2 text-sm font-mono whitespace-pre-wrap">{part.replace(/```/g, '')}</pre>;
            }
            if (part.startsWith('`')) {
                return <code key={i} className="bg-gray-200 dark:bg-gray-700 px-1 rounded text-sm font-mono">{part.replace(/`/g, '')}</code>;
            }
            if (part.startsWith('**')) {
                return <strong key={i}>{part.replace(/\*\*/g, '')}</strong>;
            }
            return <span key={i} className="whitespace-pre-wrap">{part}</span>;
        });
    };

    return (
        <div className="flex h-full flex-col bg-[#f5f7fa] dark:bg-gray-900 transition-colors duration-300">
            {/* Header */}
            <header className="flex items-center justify-center p-4 bg-white dark:bg-gray-800 shadow-sm relative z-20">
                <button onClick={() => setIsSidebarOpen(true)} className="absolute left-4 p-2 text-gray-600 dark:text-gray-300">
                    <div className="w-6 h-0.5 bg-current mb-1.5"></div>
                    <div className="w-6 h-0.5 bg-current mb-1.5"></div>
                    <div className="w-6 h-0.5 bg-current"></div>
                </button>
                <div className={`px-5 py-2 rounded-full border-2 font-semibold text-sm transition-colors duration-300
                    ${connectionStatus === 'connected' ? 'border-green-500 text-green-700 dark:text-green-400' : 
                      connectionStatus === 'connecting' ? 'border-orange-400 text-orange-600 dark:text-orange-400' : 
                      'border-red-500 text-red-600'}`}>
                    Rinkl AI
                </div>
            </header>

            {/* Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setIsSidebarOpen(false)} />
            )}

            {/* Sidebar */}
            <aside className={`fixed top-0 left-0 h-full w-[300px] bg-white dark:bg-gray-800 shadow-xl z-40 transform transition-transform duration-300 flex flex-col
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 space-y-3">
                    <button onClick={createNewChat} className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-2 font-medium transition-colors">
                        <span>+</span> New Chat
                    </button>
                    <button onClick={() => setIsSettingsOpen(true)} className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors">
                         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                            <circle cx="12" cy="12" r="3" />
                         </svg>
                         Settings
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {Object.keys(chats).map(id => (
                        <div key={id} onClick={() => { setCurrentChatId(id); setIsSidebarOpen(false); }}
                            className={`p-3 rounded-xl cursor-pointer group relative border transition-all
                            ${currentChatId === id 
                                ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                                : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                            <div className="font-medium text-gray-800 dark:text-gray-200 text-sm">Chat {id.split('_')[1] || '1'}</div>
                            <div className="text-xs text-gray-500 truncate mt-1">
                                {chats[id][chats[id].length -1]?.text.substring(0, 30) || 'New Conversation'}
                            </div>
                            <button onClick={(e) => deleteChat(e, id)} 
                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                                Del
                            </button>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Main Chat Area */}
            <main className="flex-1 overflow-hidden flex flex-col relative max-w-4xl mx-auto w-full">
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {chats[currentChatId]?.map((msg, index) => (
                        <div key={index} className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                            
                            <div className={`p-4 shadow-sm relative text-base leading-relaxed mb-1
                                ${msg.sender === 'user' 
                                    ? 'bg-[#2c3e50] text-white rounded-t-2xl rounded-bl-2xl' 
                                    : 'bg-[#f1f3f4] text-gray-800 dark:bg-gray-700 dark:text-gray-100 rounded-t-2xl rounded-br-2xl'
                                }`}>
                                
                                {msg.media && msg.media.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {msg.media.map((m, i) => (
                                            <img key={i} src={m.url} alt="attachment" className="w-24 h-24 object-cover rounded-lg border border-white/20" />
                                        ))}
                                    </div>
                                )}
                                
                                {renderContent(msg.text)}
                            </div>

                            {/* Action Buttons: Left Bottom Corner, No circles */}
                            <div className="flex gap-2 self-start px-1">
                                <button onClick={() => handleCopy(msg.text)} title="Copy" className="opacity-50 hover:opacity-100 transition-opacity p-1 text-gray-500 dark:text-gray-400">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                </button>
                                {msg.sender === 'user' && (
                                    <button onClick={() => openEditModal(msg)} title="Edit" className="opacity-50 hover:opacity-100 transition-opacity p-1 text-gray-500 dark:text-gray-400">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex items-start">
                             <div className="bg-[#f1f3f4] dark:bg-gray-700 p-4 rounded-t-2xl rounded-br-2xl">
                                <div className="typing-dots flex space-x-1">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                                </div>
                             </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-transparent">
                    {mediaList.length > 0 && (
                        <div className="flex gap-2 mb-2 p-2 bg-white dark:bg-gray-800 rounded-xl overflow-x-auto shadow-sm">
                            {mediaList.map((m, i) => (
                                <div key={i} className="relative flex-shrink-0">
                                    <img src={m.url} alt="preview" className="w-16 h-16 object-cover rounded-lg" />
                                    <button onClick={() => setMediaList(prev => prev.filter((_, idx) => idx !== i))} 
                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <div className="flex items-end bg-white dark:bg-gray-800 rounded-[28px] shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-gray-100 dark:border-gray-700 p-2">
                        {/* Attach Button: Simple White Plus (on blue background for visibility, or simple + if requested literally) */}
                        {/* User asked for "Just white symbol +" instead of paperclip. */}
                        <div className="flex items-center justify-center pb-1 pl-1">
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple accept="image/*" className="hidden" />
                            <button onClick={() => fileInputRef.current?.click()} 
                                className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
                                title="Attach">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                            </button>
                        </div>

                        <textarea
                            ref={textareaRef}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                            placeholder="Type a message..."
                            className="flex-1 max-h-32 min-h-[44px] py-2.5 px-4 bg-transparent border-none outline-none resize-none text-gray-700 dark:text-gray-200"
                            rows={1}
                        />

                        <button onClick={handleSendMessage} disabled={(!inputText && mediaList.length === 0) || isTyping}
                            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all mb-0.5 mr-0.5
                                ${(!inputText && mediaList.length === 0) || isTyping ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md'}`}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </main>

            {/* Edit Modal */}
            {editingMessageId && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                        <h3 className="text-lg font-bold mb-4 dark:text-white">Edit Message</h3>
                        <textarea 
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full h-32 p-3 border border-gray-200 dark:border-gray-700 rounded-xl resize-none mb-6 outline-none focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setEditingMessageId(null)} 
                                className="px-5 py-2.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                Cancel
                            </button>
                            <button onClick={saveEditedMessage}
                                className="px-5 py-2.5 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all">
                                Save & Regenerate
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)}
                settings={settings}
                onUpdateSettings={onUpdateSettings}
                onClearData={clearAllData}
            />
        </div>
    );
};

export default ChatScreen;