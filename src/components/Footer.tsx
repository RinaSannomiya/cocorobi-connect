import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center space-y-4">
          {/* Links */}
          <div className="flex justify-center space-x-6">
            <a 
              href="https://cocorobi.co.jp/privacy-policy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-gray-600 hover:text-[#1D73C3] transition-colors duration-200"
            >
              プライバシーポリシー
            </a>
            <a 
              href="https://cocorobi.notion.site/217bc495c0468087a046e74d293188b0?pvs=143"
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-gray-600 hover:text-[#1D73C3] transition-colors duration-200"
            >
              利用規約
            </a>
            <a 
              href="https://cocorobi.co.jp/contact" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-gray-600 hover:text-[#1D73C3] transition-colors duration-200"
            >
              お問い合わせ
            </a>
          </div>
          
          {/* Copyright */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              © 2024 こころび. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;