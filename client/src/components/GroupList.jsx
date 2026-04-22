import { Link } from 'react-router-dom';

function GroupList({ groups, onGroupClick }) {
  const getRoleBadge = (role) => {
    switch (role) {
      case 'owner':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">👑 Owner</span>;
      case 'admin':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">Admin</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">Member</span>;
    }
  };

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div
          key={group.id}
          onClick={() => onGroupClick(group.id)}
          className="block bg-white dark:bg-gray-800 rounded-lg shadow p-4 border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                  <span className="text-indigo-600 dark:text-indigo-300 font-semibold text-sm">
                    {group.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
                    {group.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getRoleBadge(group.role)}
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {group.member_count || 0} member{group.member_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="ml-4 text-gray-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default GroupList;
