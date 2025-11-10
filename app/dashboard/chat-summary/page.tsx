'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, TrendingUp, CheckCircle, Sparkles } from 'lucide-react';

interface Conversation {
  id: string;
  contact: {
    name: string;
    phoneNumber: string;
  };
  lastMessageAt: string;
  messages: Array<{
    id: string;
    text: string;
    direction: string;
  }>;
}

interface ChatSummary {
  id: string;
  contactName: string;
  contactPhone: string;
  messageCount: number;
  summary: string;
  keyTopics: string[];
  sentimentScore: number;
  actionItems: string[];
  generatedAt: string;
  llmModel: string;
}

export default function ChatSummaryPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [summaries, setSummaries] = useState<ChatSummary[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchConversations();
    fetchSummaries();
  }, []);

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/conversations', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations ?? []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummaries = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/chat-summary', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSummaries(data);
      }
    } catch (error) {
      console.error('Error fetching summaries:', error);
    }
  };

  const generateSummary = async (conversationId: string) => {
    try {
      setGenerating(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/chat-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ conversationId }),
      });

      if (response.ok) {
        const summary = await response.json();
        setSummaries([summary, ...summaries.filter((s) => s.id !== summary.id)]);
        setSelectedConversation(conversationId);
        alert('Summary generated successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to generate summary');
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      alert('Error generating summary');
    } finally {
      setGenerating(false);
    }
  };

  const getSentimentColor = (score: number) => {
    if (score > 0.3) return 'text-green-600 bg-green-50';
    if (score < -0.3) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getSentimentLabel = (score: number) => {
    if (score > 0.3) return 'Positive';
    if (score < -0.3) return 'Negative';
    return 'Neutral';
  };

  const getConversationSummary = (conversationId: string) => {
    return summaries.find((s) => s.id === conversationId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
        {/* Header */}
        <div>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Chat Summaries with HR</h1>
          <p className="text-gray-600 mt-1">AI-powered conversation summaries and insights</p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-blue-900">AI-Powered Insights</h3>
              <p className="text-sm text-blue-700 mt-1">
                Generate summaries of your HR conversations to quickly understand key topics, action items, and
                sentiment. Powered by Gemini AI.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conversations List */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Select Conversation</h2>
            <div className="space-y-2">
              {conversations.map((conversation) => {
                const summary = getConversationSummary(conversation.id);
                return (
                  <div
                    key={conversation.id}
                    className={`bg-white border rounded-lg p-4 ${
                      selectedConversation === conversation.id ? 'border-blue-500' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{conversation.contact.name}</h3>
                        <p className="text-sm text-gray-600">{conversation.contact.phoneNumber}</p>
                        {conversation.lastMessageAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            Last message: {new Date(conversation.lastMessageAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        {summary ? (
                          <button
                            onClick={() => setSelectedConversation(conversation.id)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            View Summary
                          </button>
                        ) : (
                          <button
                            onClick={() => generateSummary(conversation.id)}
                            disabled={generating}
                            className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:bg-gray-400"
                          >
                            {generating ? 'Generating...' : 'Generate'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {conversations.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>No conversations found</p>
                  <p className="text-sm mt-2">Start messaging to see conversations here</p>
                </div>
              )}
            </div>
          </div>

          {/* Summary Display */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Summary Details</h2>
            {selectedConversation && summaries.find((s) => s.id === selectedConversation) ? (
              <div className="space-y-4">
                {summaries
                  .filter((s) => s.id === selectedConversation)
                  .map((summary) => (
                    <div key={summary.id} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                      {/* Header */}
                      <div className="border-b pb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{summary.contactName}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span>{summary.messageCount} messages</span>
                          <span>•</span>
                          <span>Generated: {new Date(summary.generatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Sentiment */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Sentiment
                        </h4>
                        <div
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getSentimentColor(
                            summary.sentimentScore
                          )}`}
                        >
                          {getSentimentLabel(summary.sentimentScore)}
                          <span className="text-xs">({summary.sentimentScore.toFixed(2)})</span>
                        </div>
                      </div>

                      {/* Summary */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Summary</h4>
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{summary.summary}</p>
                      </div>

                      {/* Key Topics */}
                      {summary.keyTopics.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Key Topics</h4>
                          <div className="flex flex-wrap gap-2">
                            {summary.keyTopics.map((topic, index) => (
                              <span key={index} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Items */}
                      {summary.actionItems.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Action Items
                          </h4>
                          <ul className="space-y-2">
                            {summary.actionItems.map((item, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                                <span className="text-blue-600 mt-1">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Model Info */}
                      <div className="text-xs text-gray-500 pt-2 border-t">
                        Generated using {summary.llmModel}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-600">Select a conversation and generate a summary to view insights</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
