import { useState, useEffect } from 'react';

interface NavigationProps {
  onLogout: () => void;
}

export default function Navigation({ onLogout }: NavigationProps) {
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    async function loadUser() {
      try {
        if (window.electronAPI) {
          const token = localStorage.getItem('token');
          const user = await window.electronAPI.auth.getCurrentUser(token || undefined);
          if (user?.user) {
            setUsername(user.user.username);
          }
        }
      } catch (error) {
        console.error('加载用户信息失败:', error);
      }
    }
    loadUser();
  }, []);

  async function handleLogout() {
    try {
      if (window.electronAPI) {
        await window.electronAPI.auth.logout();
      }
      localStorage.removeItem('token');
      onLogout();
    } catch (error) {
      console.error('登出失败:', error);
      onLogout();
    }
  }

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">VibeTrading</h1>
          </div>
          <div className="flex items-center space-x-4">
            {username && (
              <span className="text-sm text-gray-700">
                欢迎, <span className="font-medium">{username}</span>
              </span>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100"
            >
              登出
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
