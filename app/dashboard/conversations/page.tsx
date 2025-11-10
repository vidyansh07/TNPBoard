'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Contact {
  id: string;
  name: string | null;
  phoneNumber: string;
  optIn: boolean;
}

interface Message {
  id: string;
  text: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  direction: 'IN' | 'OUT';
  status: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  contact: Contact;
  lastMessageAt: string | null;
  isArchived: boolean;
  messageCount: number;
  lastMessage: {
    text: string | null;
    timestamp: string;
    direction: 'IN' | 'OUT';
  } | null;
}

interface ConversationDetail extends Conversation {
  messages: Message[];
}

export default function ConversationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }
    
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/conversations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to fetch conversations');
      
      const data = await res.json();
      setConversations(data.conversations);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationDetails = async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/conversations/${conversationId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to fetch conversation details');
      
      const data = await res.json();
      setSelectedConversation(data.conversation);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingMessages(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">WhatsApp Conversations</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {/* Chat Layout */}
        <div className="bg-white rounded-lg shadow overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
          <div className="flex h-full">
            {/* Conversation List */}
            <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-2">💬</div>
                  <p className="text-gray-600">No conversations found</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => fetchConversationDetails(conv.id)}
                    className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                      selectedConversation?.id === conv.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-gray-900">
                          {conv.contact.name || conv.contact.phoneNumber}
                        </div>
                        {conv.contact.optIn && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                            Opt-in
                          </span>
                        )}
                      </div>
                      {conv.lastMessageAt && (
                        <span className="text-xs text-gray-500">
                          {formatTime(conv.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    
                    {!conv.contact.name && (
                      <div className="text-xs text-gray-500 mb-1">{conv.contact.phoneNumber}</div>
                    )}
                    
                    {conv.lastMessage && (
                      <div className="text-sm text-gray-600 truncate">
                        {conv.lastMessage.direction === 'OUT' && '✓ '}
                        {conv.lastMessage.text || '📎 Media'}
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-500 mt-1">
                      {conv.messageCount} messages
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Thread */}
            <div className="flex-1 flex flex-col">
              {!selectedConversation ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">💬</div>
                    <p className="text-gray-600">Select a conversation to view messages</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Conversation Header */}
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          {selectedConversation.contact.name || selectedConversation.contact.phoneNumber}
                        </h2>
                        <p className="text-sm text-gray-600">{selectedConversation.contact.phoneNumber}</p>
                      </div>
                      {selectedConversation.contact.optIn && (
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          Opt-in Active
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-gray-600">Loading messages...</div>
                      </div>
                    ) : selectedConversation.messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <p className="text-gray-600">No messages yet</p>
                        </div>
                      </div>
                    ) : (
                      selectedConversation.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.direction === 'OUT' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 ${
                              message.direction === 'OUT'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-900'
                            }`}
                          >
                            {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}
                            
                            {message.mediaUrl && (
                              <div className="mt-2">
                                {message.mediaType?.startsWith('image') ? (
                                  <img
                                    src={message.mediaUrl}
                                    alt="Media"
                                    className="rounded max-w-full h-auto"
                                  />
                                ) : (
                                  <a
                                    href={message.mediaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm underline"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                    {message.mediaType || 'Download'}
                                  </a>
                                )}
                              </div>
                            )}
                            
                            <div
                              className={`text-xs mt-1 ${
                                message.direction === 'OUT' ? 'text-blue-100' : 'text-gray-600'
                              }`}
                            >
                              {new Date(message.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
