'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { BookOpen, Plus, Smile, Meh, Frown, ThumbsUp, ThumbsDown, Save } from 'lucide-react';

interface DailyNote {
  id: string;
  date: string;
  title?: string;
  content: string;
  mood?: string;
  tags: string[];
}

export default function NotesPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState<DailyNote | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<string>('NEUTRAL');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recentNotes, setRecentNotes] = useState<DailyNote[]>([]);

  useEffect(() => {
    fetchNote(selectedDate);
    fetchRecentNotes();
  }, [selectedDate]);

  const fetchNote = async (date: string) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/notes?date=${date}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          const noteData = data[0];
          setNote(noteData);
          setTitle(noteData.title || '');
          setContent(noteData.content || '');
          setMood(noteData.mood || 'NEUTRAL');
          setTags(noteData.tags || []);
        } else {
          // No note for this date
          setNote(null);
          setTitle('');
          setContent('');
          setMood('NEUTRAL');
          setTags([]);
        }
      }
    } catch (error) {
      console.error('Error fetching note:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentNotes = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const response = await fetch(
        `/api/notes?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRecentNotes(data);
      }
    } catch (error) {
      console.error('Error fetching recent notes:', error);
    }
  };

  const saveNote = async () => {
    if (!content.trim()) {
      alert('Please add some content to your note');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: selectedDate,
          title,
          content,
          mood,
          tags,
        }),
      });

      if (response.ok) {
        const savedNote = await response.json();
        setNote(savedNote);
        fetchRecentNotes();
        alert('Note saved successfully!');
      } else {
        alert('Failed to save note');
      }
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Error saving note');
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const getMoodIcon = (moodValue: string) => {
    switch (moodValue) {
      case 'GREAT':
        return <ThumbsUp className="w-6 h-6 text-green-500" />;
      case 'GOOD':
        return <Smile className="w-6 h-6 text-blue-500" />;
      case 'NEUTRAL':
        return <Meh className="w-6 h-6 text-gray-500" />;
      case 'BAD':
        return <Frown className="w-6 h-6 text-orange-500" />;
      case 'TERRIBLE':
        return <ThumbsDown className="w-6 h-6 text-red-500" />;
      default:
        return <Meh className="w-6 h-6 text-gray-500" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Daily Notes</h1>
            <p className="text-gray-600 mt-1">Capture your thoughts and track your day</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Note Editor */}
          <div className="lg:col-span-2 space-y-4">
            {/* Date Selector */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Note Form */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title (Optional)</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your note a title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Mood Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">How are you feeling?</label>
                <div className="flex gap-4">
                  {['GREAT', 'GOOD', 'NEUTRAL', 'BAD', 'TERRIBLE'].map((moodValue) => (
                    <button
                      key={moodValue}
                      onClick={() => setMood(moodValue)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 ${
                        mood === moodValue ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {getMoodIcon(moodValue)}
                      <span className="text-xs font-medium">{moodValue}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your thoughts, achievements, learnings, or anything else..."
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <div className="flex gap-2 mb-2 flex-wrap">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                      {tag}
                      <button onClick={() => removeTag(tag)} className="text-blue-500 hover:text-blue-700">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    placeholder="Add a tag..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={addTag}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={saveNote}
                disabled={saving}
                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save Note'}
              </button>
            </div>
          </div>

          {/* Recent Notes Sidebar */}
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Recent Notes
              </h3>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {recentNotes.map((recentNote) => (
                  <button
                    key={recentNote.id}
                    onClick={() => setSelectedDate(recentNote.date.split('T')[0])}
                    className={`w-full text-left p-3 rounded-lg border ${
                      selectedDate === recentNote.date.split('T')[0]
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(recentNote.date).toLocaleDateString()}
                      </span>
                      {recentNote.mood && getMoodIcon(recentNote.mood)}
                    </div>
                    {recentNote.title && (
                      <p className="text-sm text-gray-700 font-medium mb-1">{recentNote.title}</p>
                    )}
                    <p className="text-xs text-gray-600 line-clamp-2">{recentNote.content}</p>
                  </button>
                ))}
                {recentNotes.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">No recent notes</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
