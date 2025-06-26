import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.exchangeCodeForSession(window.location.href)
      .then(({ error }) => {
        if (error) {
          console.error(error);
          navigate('/login');
        } else {
          navigate('/basic-info');
        }
      });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mb-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1D73C3] mx-auto"></div>
        </div>
        <p className="text-gray-600">ログインを完了しています...</p>
      </div>
    </div>
  );
};

export default AuthCallback;