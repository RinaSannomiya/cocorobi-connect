import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // トップ画面でのみログインボタンを表示
  const isHomePage = location.pathname === '/';

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 z-50 h-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
        <div className="flex items-center">
          <img 
            src="/logo_color.png" 
            alt="こころび" 
            className="h-8 w-auto max-w-[150px] cursor-pointer hover:opacity-80 transition-opacity duration-200"
            onClick={() => navigate('/')}
          />
        </div>
        <nav className="flex items-center space-x-4">
          {/* トップ画面でのみログインボタンを表示 */}
          {isHomePage && (
            <button 
              onClick={handleLoginClick}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <LogIn size={18} />
              <span>ログイン</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;