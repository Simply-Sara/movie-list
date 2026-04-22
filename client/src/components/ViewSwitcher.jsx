function ViewSwitcher({ activeView, onViewChange }) {
  return (
    <div className="flex gap-1 border-l pl-6">
      <button
        onClick={() => onViewChange?.('list')}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
          activeView === 'list'
            ? 'bg-indigo-100 text-indigo-700 border border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-600'
            : 'text-gray-700 hover:bg-gray-50 border border-transparent hover:border-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
        }`}
      >
        All Media
      </button>
      <button
        onClick={() => onViewChange?.('queue')}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
          activeView === 'queue'
            ? 'bg-indigo-100 text-indigo-700 border border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-600'
            : 'text-gray-700 hover:bg-gray-50 border border-transparent hover:border-gray-200 dark:text-gray-300 dark:hover:bg-gray-700'
        }`}
      >
        Queue
      </button>
    </div>
  );
}

export default ViewSwitcher;
