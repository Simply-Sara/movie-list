import { useState } from 'react';
import Tabs from './Tabs';

function FriendRequests({ incomingRequests, outgoingRequests, onAccept, onReject, onCancel, loading }) {
  const [activeTab, setActiveTab] = useState('incoming');

  const incomingCount = incomingRequests.length;
  const outgoingCount = outgoingRequests.length;

  const tabs = [
    { id: 'incoming', label: 'Incoming', count: incomingCount },
    { id: 'outgoing', label: 'Outgoing', count: outgoingCount }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 overflow-hidden">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <Tabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                  </div>
                </div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {activeTab === 'incoming' && (
              incomingRequests.length === 0 ? (
                <p className="text-center py-8 text-gray-500 dark:text-gray-400">No incoming friend requests</p>
              ) : (
                <div className="space-y-3">
                  {incomingRequests.map((request) => (
                    <div key={request.friendship_id || request.id} className="flex items-center justify-between gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {request.avatar_url ? (
                          <img src={request.avatar_url} alt={request.username} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                            <span className="text-indigo-600 dark:text-indigo-300 text-sm font-semibold">
                              {request.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{request.username}</p>
                          {request.about_me && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{request.about_me}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onAccept(request.id)}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => onReject(request.id)}
                          className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === 'outgoing' && (
              outgoingRequests.length === 0 ? (
                <p className="text-center py-8 text-gray-500 dark:text-gray-400">No outgoing friend requests</p>
              ) : (
                <div className="space-y-3">
                  {outgoingRequests.map((request) => (
                    <div key={request.friendship_id || request.id} className="flex items-center justify-between gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {request.avatar_url ? (
                          <img src={request.avatar_url} alt={request.username} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                            <span className="text-indigo-600 dark:text-indigo-300 text-sm font-semibold">
                              {request.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{request.username}</p>
                          {request.about_me && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{request.about_me}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => onCancel(request.id)}
                        className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default FriendRequests;
