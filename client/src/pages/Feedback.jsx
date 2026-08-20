import { useState } from 'react';
import AppHeader from '../components/AppHeader';
import Footer from '../components/Footer';

function Feedback({ currentUser, onLogout, pendingGroupInvitesCount }) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState(null); // 'success' | 'error'
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ text: text.trim() })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit feedback');
      }

      setText('');
      setStatus('success');
    } catch (err) {
      console.error('Feedback submit error:', err);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <AppHeader
        currentUser={currentUser}
        onLogout={onLogout}
        pendingInvitesCount={pendingGroupInvitesCount}
      />

      <main className="flex-grow max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Feedback</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Have an idea for a new feature or improvement? Let us know!
        </p>

        {status === 'success' && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-400">Thanks! Your feedback has been submitted.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">Something went wrong. Please try again.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <label
            htmlFor="feedback"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Your feedback
          </label>
          <textarea
            id="feedback"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe your idea..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition"
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}

export default Feedback;
