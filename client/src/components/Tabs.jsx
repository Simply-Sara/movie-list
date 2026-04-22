function Tabs({ tabs, activeTab, onTabChange, spacing = 'gap-4', ariaLabel }) {
  return (
    <nav className={`flex ${spacing}`} aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`py-3 px-1 text-sm font-medium border-b-2 transition ${
            activeTab === tab.id
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 text-gray-500 dark:text-gray-400">
              ({tab.count})
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}

export default Tabs;
