'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PasswordGeneratorPage() {
  const [length, setLength] = useState(12);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [strength, setStrength] = useState('Weak');

  // 生成密码
  const generatePassword = () => {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+[]{}|;:,.<>?';

    let characters = '';
    if (includeLowercase) characters += lowercase;
    if (includeUppercase) characters += uppercase;
    if (includeNumbers) characters += numbers;
    if (includeSymbols) characters += symbols;

    if (characters.length === 0) {
      setPassword('');
      setStrength('Weak');
      return;
    }

    let newPassword = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      newPassword += characters[randomIndex];
    }

    setPassword(newPassword);
    calculateStrength(newPassword);
  };

  // 计算密码强度
  const calculateStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 1;

    if (score <= 2) setStrength('Weak');
    else if (score <= 4) setStrength('Medium');
    else setStrength('Strong');
  };

  // 复制到剪贴板
  const copyToClipboard = async () => {
    if (password) {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 当设置变化时重新生成密码
  useEffect(() => {
    generatePassword();
  }, [length, includeLowercase, includeUppercase, includeNumbers, includeSymbols, generatePassword]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">密码生成器</h1>
              <p className="text-gray-600">生成安全的随机密码</p>
            </div>
            <div className="flex space-x-2">
              <Link href="/tools">
                <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors">
                  返回工具列表
                </button>
              </Link>
              <Link href="/">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  返回主页
                </button>
              </Link>
            </div>
          </div>
        </header>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-gray-700 font-medium">密码长度</label>
              <span className="text-gray-600">{length}</span>
            </div>
            <input
              type="range"
              min="6"
              max="24"
              value={length}
              onChange={(e) => setLength(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="lowercase"
                checked={includeLowercase}
                onChange={(e) => setIncludeLowercase(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="lowercase" className="text-gray-700">包含小写字母 (a-z)</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="uppercase"
                checked={includeUppercase}
                onChange={(e) => setIncludeUppercase(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="uppercase" className="text-gray-700">包含大写字母 (A-Z)</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="numbers"
                checked={includeNumbers}
                onChange={(e) => setIncludeNumbers(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="numbers" className="text-gray-700">包含数字 (0-9)</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="symbols"
                checked={includeSymbols}
                onChange={(e) => setIncludeSymbols(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="symbols" className="text-gray-700">包含特殊字符 (!@#$%^&*)</label>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-gray-700 font-medium">生成的密码</label>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                strength === 'Weak' ? 'bg-red-100 text-red-800' :
                strength === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {strength}
              </div>
            </div>
            <div className="flex">
              <input
                type="text"
                value={password}
                readOnly
                className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={copyToClipboard}
                disabled={!password}
                className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {copied ? '已复制' : '复制'}
              </button>
            </div>
          </div>

          <button
            onClick={generatePassword}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            重新生成密码
          </button>
        </div>
      </div>
    </div>
  );
}
