
import React, { useState, useEffect, useRef, memo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { AppSettings, MediaItem, Message } from '../types';
import SettingsModal from './SettingsModal';

interface ChatScreenProps {
    settings: AppSettings;
    onUpdateSettings: (s: Partial<AppSettings>) => void;
}

interface FeedbackMessage {
    id: string;
    type: string;
    text: string;
    timestamp: string;
    response?: string;
}

const API_KEYS = [
    "AIzaSyA_tf9A72GxzpcC7v1lXWFQGqkVFWBN820",
    "AIzaSyDk0tuyVpWEdqZ0-EUJXNntMK3YOGA1g8g"
];

// Optimized Message Item with Memoization
const MessageItem = memo(({ msg, onCopy, onEdit }: { msg: Message, onCopy: (t: string) => void, onEdit: (msg: Message) => void }) => {
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
        <div className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'} animate-fade-in`}>
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

            <div className="flex gap-2 self-start px-1">
                <button onClick={() => onCopy(msg.text)} title="Copy" className="opacity-50 hover:opacity-100 transition-opacity p-1 text-gray-500 dark:text-gray-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </button>
                {msg.sender === 'user' && (
                    <button onClick={() => onEdit(msg)} title="Edit" className="opacity-50 hover:opacity-100 transition-opacity p-1 text-gray-500 dark:text-gray-400">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
});

const ChatScreen: React.FC<ChatScreenProps> = ({ settings, onUpdateSettings }) => {
    const [chats, setChats] = useState<Record<string, Message[]>>({});
    const [currentChatId, setCurrentChatId] = useState<string>('default');
    const [inputText, setInputText] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [mediaList, setMediaList] = useState<MediaItem[]>([]);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');

    // Feedback States
    const [feedbackType, setFeedbackType] = useState('Feedback');
    const [feedbackText, setFeedbackText] = useState('');
    const [feedbackMessages, setFeedbackMessages] = useState<FeedbackMessage[]>([]);
    const [isSendingFeedback, setIsSendingFeedback] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const savedChats = localStorage.getItem('rinkl_ai_chats');
        if (savedChats) {
            try {
                const parsed = JSON.parse(savedChats);
                setChats(parsed);
                const keys = Object.keys(parsed);
                if (keys.length > 0 && !parsed[currentChatId]) {
                    setCurrentChatId(keys[0]);
                }
            } catch (e) {
                setChats({ 'default': [] });
            }
        } else {
            setChats({ 'default': [] });
        }

        const savedFeedback = localStorage.getItem('rinkl_feedback');
        if (savedFeedback) {
            try { setFeedbackMessages(JSON.parse(savedFeedback)); } catch (e) {}
        }
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chats, currentChatId, isTyping]);

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
        setIsTyping(true);

        try {
            // Priority 1: Use process.env.API_KEY if available
            // Priority 2: Use provided keys in list
            const keysToTry = [process.env.API_KEY, ...API_KEYS].filter(Boolean) as string[];
            let responseText = '';
            let success = false;

            for (const key of keysToTry) {
                try {
                    // Try direct REST fetch first as it's often more reliable for simple text in browser envs
                    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: updatedChats[currentChatId].map(msg => ({
                                role: msg.sender === 'user' ? 'user' : 'model',
                                parts: msg.media && msg.media.length > 0 
                                    ? [{ text: msg.text }, ...msg.media.map(m => ({ inlineData: { mimeType: m.type, data: m.data.split(',')[1] } }))]
                                    : [{ text: msg.text }]
                            }))
                        })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
                        success = true;
                        break;
                    }
                } catch (e) {
                    console.warn(`Key ${key} failed or blocked. Trying next.`);
                }
            }

            if (!success) throw new Error("All API attempts failed.");

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                text: responseText,
                sender: 'ai',
                timestamp: new Date().toISOString()
            };

            setChats(prev => ({ ...prev, [currentChatId]: [...prev[currentChatId], aiMessage] }));
        } catch (error) {
            setChats(prev => ({
                ...prev,
                [currentChatId]: [...prev[currentChatId], {
                    id: (Date.now() + 1).toString(),
                    text: "Connection error. This may be due to regional restrictions. Please check your VPN or try again later.",
                    sender: 'ai',
                    isError: true,
                    timestamp: new Date().toISOString()
                }]
            }));
        } finally {
            setIsTyping(false);
        }
    };

    const handleSendFeedback = () => {
        if (!feedbackText.trim()) return;
        setIsSendingFeedback(true);
        
        const newMsg: FeedbackMessage = {
            id: Date.now().toString(),
            type: feedbackType,
            text: feedbackText,
            timestamp: new Date().toISOString()
        };

        setTimeout(() => {
            const updated = [newMsg, ...feedbackMessages];
            setFeedbackMessages(updated);
            localStorage.setItem('rinkl_feedback', JSON.stringify(updated));
            setFeedbackText('');
            setIsSendingFeedback(false);
        }, 1000);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            Array.from(e.target.files).forEach((file: File) => {
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
                // Same robust sending logic for editing
                const keysToTry = [process.env.API_KEY, ...API_KEYS].filter(Boolean) as string[];
                let responseText = '';
                let success = false;

                for (const key of keysToTry) {
                    try {
                        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: newHistory.map(msg => ({
                                    role: msg.sender === 'user' ? 'user' : 'model',
                                    parts: msg.media && msg.media.length > 0 
                                        ? [{ text: msg.text }, ...msg.media.map(m => ({ inlineData: { mimeType: m.type, data: m.data.split(',')[1] } }))]
                                        : [{ text: msg.text }]
                                }))
                            })
                        });
                        if (res.ok) {
                            const data = await res.json();
                            responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
                            success = true;
                            break;
                        }
                    } catch(e) {}
                }

                if (success) {
                    setChats(prev => ({
                        ...prev,
                        [currentChatId]: [...prev[currentChatId], {
                            id: Date.now().toString(),
                            text: responseText,
                            sender: 'ai',
                            timestamp: new Date().toISOString()
                        }]
                    }));
                }
            } catch (e) { console.error(e); } finally { setIsTyping(false); }
        }
    };

    return (
        <div className="flex h-full flex-col bg-[#f5f7fa] dark:bg-gray-900 transition-colors duration-300">
            <header className="flex items-center justify-center p-4 bg-white dark:bg-gray-800 shadow-sm relative z-20">
                <button onClick={() => setIsSidebarOpen(true)} className="absolute left-4 p-2 text-gray-600 dark:text-gray-300">
                    <div className="w-6 h-0.5 bg-current mb-1.5"></div>
                    <div className="w-6 h-0.5 bg-current mb-1.5"></div>
                    <div className="w-6 h-0.5 bg-current"></div>
                </button>
                <div className="px-5 py-2 rounded-full border-2 border-blue-500 text-blue-700 dark:text-blue-400 font-semibold text-sm">Rinkl AI</div>
            </header>

            {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setIsSidebarOpen(false)} />}

            <aside className={`fixed top-0 left-0 h-full w-[300px] bg-white dark:bg-gray-800 shadow-xl z-40 transform transition-transform duration-300 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 space-y-3">
                    <button onClick={createNewChat} className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-2 font-medium transition-colors">+ New Chat</button>
                    <button onClick={() => setIsSettingsOpen(true)} className="w-full py-3 px-4 bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors">Settings</button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {Object.keys(chats).map((id, index) => (
                        <div key={id} onClick={() => { setCurrentChatId(id); setIsSidebarOpen(false); }}
                            className={`p-3 rounded-xl cursor-pointer group relative border transition-all
                            ${currentChatId === id 
                                ? 'bg-[#1e3a8a] border-transparent text-white' 
                                : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-800 dark:text-gray-200'}`}>
                            <div className={`font-medium text-sm ${currentChatId === id ? 'text-white' : ''}`}>Chat {index + 1}</div>
                            <div className={`text-xs truncate mt-1 ${currentChatId === id ? 'text-blue-100' : 'text-gray-500'}`}>
                                {chats[id][chats[id].length -1]?.text.substring(0, 30) || 'New Conversation'}
                            </div>
                            <button onClick={(e) => deleteChat(e, id)} 
                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity text-xs">Del</button>
                        </div>
                    ))}
                </div>
            </aside>

            <main className="flex-1 overflow-hidden flex flex-col relative max-w-4xl mx-auto w-full">
                <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
                    {chats[currentChatId]?.map((msg) => (
                        <MessageItem key={msg.id} msg={msg} onCopy={(t) => navigator.clipboard.writeText(t)} onEdit={(m) => { setEditingMessageId(m.id); setEditText(m.text); }} />
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

                <div className="p-4 bg-transparent">
                    {mediaList.length > 0 && (
                        <div className="flex gap-2 mb-2 p-2 bg-white dark:bg-gray-800 rounded-xl overflow-x-auto shadow-sm">
                            {mediaList.map((m, i) => (
                                <div key={i} className="relative flex-shrink-0">
                                    <img src={m.url} alt="preview" className="w-16 h-16 object-cover rounded-lg" />
                                    <button onClick={() => setMediaList(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex items-end bg-white dark:bg-gray-800 rounded-[28px] shadow-lg border border-gray-100 dark:border-gray-700 p-2">
                        <div className="flex items-center justify-center pb-1 pl-1">
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple accept="image/*" className="hidden" />
                            <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </button>
                        </div>
                        <textarea ref={textareaRef} value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder="Type a message..." className="flex-1 max-h-32 min-h-[44px] py-2.5 px-4 bg-transparent border-none outline-none resize-none text-gray-700 dark:text-gray-200" rows={1} />
                        <button onClick={handleSendMessage} disabled={(!inputText && mediaList.length === 0) || isTyping} className={`w-11 h-11 rounded-full flex items-center justify-center transition-all mb-0.5 mr-0.5 ${(!inputText && mediaList.length === 0) || isTyping ? 'bg-gray-200 dark:bg-gray-700' : 'bg-blue-600 hover:bg-blue-700 shadow-md'}`}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                    </div>
                </div>
            </main>

            {/* Feedback Modal */}
            {isFeedbackOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2001] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold dark:text-white">Feedback & Support</h2>
                            <button onClick={() => setIsFeedbackOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-semibold text-gray-500 uppercase mb-2 block">Message Type</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Feedback', 'Bug Report', 'Question', 'Suggestion', 'Other'].map(type => (
                                            <button 
                                                key={type}
                                                onClick={() => setFeedbackType(type)}
                                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${feedbackType === type ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-500 uppercase mb-2 block">Your Message</label>
                                    <textarea 
                                        value={feedbackText}
                                        onChange={(e) => setFeedbackText(e.target.value)}
                                        placeholder="Tell us what's on your mind..."
                                        className="w-full h-32 p-4 bg-gray-50 dark:bg-gray-700/50 border border-transparent focus:border-blue-500 rounded-2xl outline-none resize-none dark:text-white transition-all"
                                    />
                                </div>
                                <button 
                                    onClick={handleSendFeedback}
                                    disabled={!feedbackText.trim() || isSendingFeedback}
                                    className={`w-full py-3.5 rounded-2xl font-bold transition-all ${!feedbackText.trim() || isSendingFeedback ? 'bg-gray-100 text-gray-400 dark:bg-gray-700' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'}`}
                                >
                                    {isSendingFeedback ? 'Sending...' : 'Send Message'}
                                </button>
                            </div>

                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">My Messages</h3>
                                <div className="space-y-3">
                                    {feedbackMessages.length === 0 ? (
                                        <p className="text-center text-gray-400 text-sm py-4">No messages sent yet.</p>
                                    ) : (
                                        feedbackMessages.map(msg => (
                                            <div key={msg.id} className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-gray-100 dark:border-gray-700">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{msg.type}</span>
                                                    <span className="text-[10px] text-gray-400">{new Date(msg.timestamp).toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-sm text-gray-700 dark:text-gray-200">{msg.text}</p>
                                                {msg.response && (
                                                    <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-xl border border-blue-50 dark:border-blue-900/20">
                                                        <span className="text-[10px] font-bold text-blue-500 block mb-1">Admin Response</span>
                                                        <p className="text-sm text-gray-600 dark:text-gray-300 italic">{msg.response}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {editingMessageId && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                        <h3 className="text-lg font-bold mb-4 dark:text-white">Edit Message</h3>
                        <textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="w-full h-32 p-3 border border-gray-200 dark:border-gray-700 rounded-xl resize-none mb-6 outline-none focus:border-blue-500 dark:bg-gray-700 dark:text-white" />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setEditingMessageId(null)} className="px-5 py-2.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-200 transition-colors">Cancel</button>
                            <button onClick={saveEditedMessage} className="px-5 py-2.5 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 transition-all">Save & Regenerate</button>
                        </div>
                    </div>
                </div>
            )}

            <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
                settings={settings} 
                onUpdateSettings={onUpdateSettings} 
                onClearData={() => { localStorage.clear(); window.location.reload(); }}
                onOpenFeedback={() => setIsFeedbackOpen(true)}
            />
        </div>
    );
};

export default ChatScreen;
