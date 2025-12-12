import { useState } from 'react';
import LoginForm from '../components/LoginForm';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div>
          <h1 className="text-3xl font-bold text-center text-gray-900">
            VibeTrading
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            通过AI对话创建量化交易策略
          </p>
        </div>
        <LoginForm onLogin={onLogin} />
      </div>
    </div>
  );
}
