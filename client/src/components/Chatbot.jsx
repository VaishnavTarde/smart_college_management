import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendMessage } from '../services/aiService';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { id: 1, text: "Hi! I'm your Campus Assistant. Ask me anything about events or clubs!", sender: 'bot' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = { id: Date.now(), text: input, sender: 'user' };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            const responseText = await sendMessage(userMsg.text);
            const botMsg = { id: Date.now() + 1, text: responseText, sender: 'bot' };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error("Chatbot error:", error);
            const errorMsg = { id: Date.now() + 1, text: "Sorry, I'm having trouble connecting right now.", sender: 'bot' };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    // Edit & Delete Logic
    const [editingId, setEditingId] = useState(null);

    const handleDelete = (id) => {
        if (window.confirm("Delete this message?")) {
            setMessages(prev => prev.map(m => m.id === id ? { ...m, isDeleted: true, text: "This message was deleted" } : m));
        }
    };

    const startEditing = (msg) => {
        setInput(msg.text);
        setEditingId(msg.id);
        // Focus input
    };

    const handleUpdate = (id, newText) => {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, text: newText } : m));
        setEditingId(null);
        setInput('');
    };

    // Markdown renderer for bot messages
    const renderMarkdown = (text) => {
        const lines = text.split('\n');
        const elements = [];
        let i = 0;

        while (i < lines.length) {
            const line = lines[i];

            // Skip empty lines
            if (line.trim() === '') {
                i++;
                continue;
            }

            // Heading (## or #)
            if (line.startsWith('## ')) {
                elements.push(
                    <p key={i} className="font-bold text-secondary text-sm mt-2 mb-1">
                        {formatInline(line.slice(3))}
                    </p>
                );
                i++;
                continue;
            }
            if (line.startsWith('# ')) {
                elements.push(
                    <p key={i} className="font-bold text-secondary text-base mt-2 mb-1">
                        {formatInline(line.slice(2))}
                    </p>
                );
                i++;
                continue;
            }

            // Bullet list (lines starting with * or - or •)
            if (/^[\*\-•]\s/.test(line)) {
                const listItems = [];
                while (i < lines.length && /^[\*\-•]\s/.test(lines[i])) {
                    listItems.push(
                        <li key={i} className="flex items-start gap-1.5">
                            <span className="text-secondary mt-0.5 flex-shrink-0">•</span>
                            <span>{formatInline(lines[i].replace(/^[\*\-•]\s/, ''))}</span>
                        </li>
                    );
                    i++;
                }
                elements.push(
                    <ul key={`ul-${i}`} className="space-y-1 my-1 pl-1">
                        {listItems}
                    </ul>
                );
                continue;
            }

            // Numbered list
            if (/^\d+\.\s/.test(line)) {
                const listItems = [];
                let num = 1;
                while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
                    listItems.push(
                        <li key={i} className="flex items-start gap-1.5">
                            <span className="text-secondary font-bold flex-shrink-0 min-w-[18px]">{num}.</span>
                            <span>{formatInline(lines[i].replace(/^\d+\.\s/, ''))}</span>
                        </li>
                    );
                    i++;
                    num++;
                }
                elements.push(
                    <ol key={`ol-${i}`} className="space-y-1 my-1 pl-1">
                        {listItems}
                    </ol>
                );
                continue;
            }

            // Normal paragraph
            elements.push(
                <p key={i} className="leading-relaxed">
                    {formatInline(line)}
                </p>
            );
            i++;
        }

        return <div className="space-y-1 text-sm">{elements}</div>;
    };

    // Format inline markdown: **bold**, *italic*, `code`
    const formatInline = (text) => {
        const parts = [];
        // Pattern: **bold**, *italic*, `code`
        const regex = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`/g;
        let last = 0;
        let match;
        let idx = 0;
        while ((match = regex.exec(text)) !== null) {
            if (match.index > last) {
                parts.push(<span key={idx++}>{text.slice(last, match.index)}</span>);
            }
            if (match[1] !== undefined) {
                parts.push(<strong key={idx++} className="font-bold text-gray-900">{match[1]}</strong>);
            } else if (match[2] !== undefined) {
                parts.push(<em key={idx++} className="italic">{match[2]}</em>);
            } else if (match[3] !== undefined) {
                parts.push(<code key={idx++} className="bg-gray-100 text-secondary px-1 rounded text-xs font-mono">{match[3]}</code>);
            }
            last = regex.lastIndex;
        }
        if (last < text.length) {
            parts.push(<span key={idx++}>{text.slice(last)}</span>);
        }
        return parts.length > 0 ? parts : text;
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-80 sm:w-96 mb-4 overflow-hidden pointer-events-auto flex flex-col h-[500px]"
                    >
                        {/* Header */}
                        <div className="bg-secondary p-4 flex justify-between items-center text-white">
                            <div className="flex items-center space-x-2">
                                <div className="bg-white/20 p-1.5 rounded-full">
                                    <Bot size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Campus Assistant</h3>
                                    <p className="text-xs text-blue-100 flex items-center">
                                        <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></span>
                                        Online
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-white/80 hover:text-white hover:bg-white/10 p-1 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex ${msg.sender === 'user' ? 'justify-end group' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[80%] rounded-2xl p-3 text-sm shadow-sm
                                        ${msg.sender === 'user'
                                            ? 'bg-secondary text-white rounded-tr-none'
                                            : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                        }`}
                                    >
                                        {msg.isDeleted ? (
                                            <span className="italic opacity-70 flex items-center gap-1">
                                                <X size={12} /> This message was deleted
                                            </span>
                                        ) : msg.sender === 'bot' ? (
                                            renderMarkdown(msg.text)
                                        ) : (
                                            msg.text
                                        )}
                                    </div>
                                    {/* Action Buttons for User Messages */}
                                    {msg.sender === 'user' && !msg.isDeleted && (Date.now() - msg.id < 5 * 60 * 1000) && (
                                        <div className="flex flex-col gap-1 ml-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => startEditing(msg)}
                                                className="text-gray-400 hover:text-secondary"
                                                title="Edit"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(msg.id)}
                                                className="text-gray-400 hover:text-red-500"
                                                title="Delete"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none p-4 max-w-[80%] shadow-sm flex space-x-1 items-center">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Suggested Chips */}
                        {messages.length < 3 && (
                            <div className="px-4 pb-2 bg-gray-50/50 flex gap-2 overflow-x-auto scrollbar-hide">
                                {['Upcoming Events', 'Join a Club', 'Placements', 'Contact Admin'].map((chip) => (
                                    <button
                                        key={chip}
                                        onClick={() => setInput(chip)}
                                        className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1.5 text-gray-600 hover:bg-secondary/10 hover:border-secondary/30 hover:text-secondary whitespace-nowrap transition-colors"
                                    >
                                        {chip}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input Area */}
                        <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex space-x-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask about events..."
                                className="flex-1 bg-gray-100 text-gray-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary/50 transition-all border border-transparent"
                            />
                            {editingId ? (
                                <button
                                    type="button"
                                    onClick={() => handleUpdate(editingId, input)}
                                    className="bg-green-500 text-white p-2 rounded-xl hover:bg-green-600 transition-colors shadow-sm"
                                >
                                    <Send size={18} />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isTyping}
                                    className="bg-secondary text-white p-2 rounded-xl hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                >
                                    <Send size={18} />
                                </button>
                            )}
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className="bg-secondary hover:bg-accent text-white p-4 rounded-full shadow-lg shadow-secondary/30 transition-all pointer-events-auto"
            >
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
            </motion.button>
        </div>
    );
};

export default Chatbot;
