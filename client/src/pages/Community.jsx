import React, { useState, useEffect, useRef } from 'react';
import { Send, User as UserIcon, MessageSquare, Smile, Edit2, X, Trash2 } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import api from '../services/api';
import { formatMessageDate } from '../utils/dateUtils';

const Community = () => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const messagesEndRef = useRef(null);
    const user = JSON.parse(localStorage.getItem('user'));

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const fetchMessages = async () => {
        try {
            const res = await api.get('/discussions/community/all');
            if (res.data.success) {
                setMessages(res.data.data);
                scrollToBottom();
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();

        if ((!newMessage.trim() && !editingMessageId) || (!editContent.trim() && editingMessageId)) return;

        try {
            if (editingMessageId) {
                // Edit Message
                const res = await api.put(`/discussions/${editingMessageId}`, { message: editContent });

                if (res.data.success) {
                    setMessages(messages.map(msg =>
                        msg._id === editingMessageId ? { ...msg, message: editContent } : msg
                    ));
                    setEditingMessageId(null);
                    setEditContent('');
                }
            } else {
                // Send New Message
                const res = await api.post('/discussions', {
                    message: newMessage,
                    isAnonymous,
                    clubId: null // Null for community
                });

                if (res.data.success) {
                    setMessages([...messages, res.data.data]);
                    setNewMessage('');
                    setShowEmojiPicker(false);
                }
            }
        } catch (error) {
            console.error('Error sending/editing message:', error);
        }
    };



    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this message?")) return;
        try {
            const token = localStorage.getItem('token');
            const res = await api.delete(`/discussions/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.data.success) {
                // Update local state to reflect soft delete
                setMessages(prev => prev.map(msg =>
                    msg._id === id ? { ...msg, isDeleted: true, message: "This message was deleted" } : msg
                ));
            } else {
                alert(res.data.error || "Failed to delete message");
            }
        } catch (error) {
            console.error("Error deleting message:", error);
            alert(error.response?.data?.error || "Error deleting message");
        }
    };

    const handleEmojiClick = (emojiObject) => {
        if (editingMessageId) {
            setEditContent(prev => prev + emojiObject.emoji);
        } else {
            setNewMessage(prev => prev + emojiObject.emoji);
        }
    };

    const startEditing = (msg) => {
        setEditingMessageId(msg._id);
        setEditContent(msg.message);
        setShowEmojiPicker(false);
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
                <MessageSquare size={64} className="text-gray-300 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Community Chat</h2>
                <p className="text-gray-500">Please login to join the discussion.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 h-[calc(100vh-80px)] flex flex-col">
            <div className="mb-4">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                    <MessageSquare className="text-secondary" />
                    Global Community
                </h1>
                <p className="text-gray-500">Connect with students across the entire campus.</p>
            </div>

            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {loading ? (
                        <div className="text-center text-gray-500 mt-10">Loading discussion...</div>
                    ) : messages.length === 0 ? (
                        <div className="text-center text-gray-400 mt-10">No messages yet. Be the first to say hi!</div>
                    ) : (
                        messages.map((msg) => {
                            const isMe = msg.userId === user.id || msg.userId === user._id; // Check both in case of population
                            return (
                                <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] md:max-w-[60%] rounded-2xl px-4 py-3 shadow-sm relative group ${isMe
                                        ? 'bg-secondary text-white rounded-br-none'
                                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                                        }`}>

                                        {/* Edit & Delete Buttons for User's Own Messages */}
                                        {isMe && !msg.isDeleted && (new Date() - new Date(msg.createdAt) < 5 * 60 * 1000) && (
                                            <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => startEditing(msg)}
                                                    className="bg-white text-gray-500 p-1 rounded-full shadow-sm hover:text-secondary border border-gray-100"
                                                    title="Edit Message"
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(msg._id)}
                                                    className="bg-white text-gray-500 p-1 rounded-full shadow-sm hover:text-red-500 border border-gray-100"
                                                    title="Delete Message"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        )}

                                        {!isMe && (
                                            <div className="text-[10px] font-bold opacity-70 mb-1 flex items-center gap-1">
                                                {msg.isAnonymous ? 'Anonymous Student' : msg.userName}
                                                {msg.userRole !== 'student' && (
                                                    <span className="bg-yellow-500 text-white px-1 rounded-[2px]">{msg.userRole}</span>
                                                )}
                                            </div>
                                        )}
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                            {msg.isDeleted ? (
                                                <span className="italic opacity-70 flex items-center gap-1">
                                                    <X size={12} /> This message was deleted
                                                </span>
                                            ) : (
                                                <span>
                                                    {msg.message}
                                                    {msg.isEdited && <span className="text-[10px] text-gray-400 ml-1 italic">(edited)</span>}
                                                </span>
                                            )}
                                        </p>
                                        <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-100' : 'text-gray-500'}`}>
                                            {formatMessageDate(msg.createdAt)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 relative">
                    {/* Emoji Picker */}
                    {showEmojiPicker && (
                        <div className="absolute bottom-20 left-4 z-10 shadow-xl rounded-xl">
                            <EmojiPicker onEmojiClick={handleEmojiClick} width={300} height={400} theme="auto" />
                        </div>
                    )}

                    {/* Editing Indicator */}
                    {editingMessageId && (
                        <div className="flex justify-between items-center bg-gray-50 px-3 py-1.5 rounded-lg mb-2 text-xs border border-gray-200">
                            <span className="text-gray-600 font-medium">Editing message...</span>
                            <button
                                onClick={() => { setEditingMessageId(null); setEditContent(''); }}
                                className="text-gray-400 hover:text-red-500"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                        {/* Emoji Toggle */}
                        <button
                            type="button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className={`p-2 rounded-full transition-colors ${showEmojiPicker ? 'bg-gray-200 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                        >
                            <Smile size={24} />
                        </button>

                        {/* Anonymous Toggle (Only for new messages) */}
                        {!editingMessageId && (
                            <button
                                type="button"
                                onClick={() => setIsAnonymous(!isAnonymous)}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all text-xs font-medium border whitespace-nowrap
                                    ${isAnonymous
                                        ? 'bg-gray-800 text-white border-gray-800'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                    }`}
                                title="Toggle Anonymous Mode"
                            >
                                <UserIcon size={14} className={isAnonymous ? "text-white" : "text-gray-500"} />
                                <span className="hidden sm:inline">{isAnonymous ? 'Anonymous' : 'Public'}</span>
                            </button>
                        )}

                        <input
                            type="text"
                            value={editingMessageId ? editContent : newMessage}
                            onChange={(e) => editingMessageId ? setEditContent(e.target.value) : setNewMessage(e.target.value)}
                            placeholder={editingMessageId ? "Update your message..." : "Type a message..."}
                            className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-secondary/50"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={(!newMessage.trim() && !editingMessageId) || (editingMessageId && !editContent.trim())}
                            className="bg-secondary text-white p-3 rounded-xl hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                        >
                            <Send size={20} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Community;
