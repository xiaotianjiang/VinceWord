'use client'

import { useState } from 'react'

export default function LoginPage() {
  // 从本地缓存中读取登录信息
  const getRememberedInfo = () => {
    // 确保在客户端环境中才访问 localStorage
    if (typeof window !== 'undefined') {
      const rememberedUsername = localStorage.getItem('remembered-username') || '';
      const rememberedPassword = localStorage.getItem('remembered-password') || '';
      const rememberedPhone = localStorage.getItem('remembered-phone') || '';
      
      // 如果有记住的账号密码，默认勾选记住我
      if (rememberedUsername && rememberedPassword) {
        return {
          identifier: rememberedUsername,
          password: rememberedPassword,
          phone: rememberedPhone,
          remember: true
        };
      }
      // 如果只有记住的手机号，默认切换到短信登录
      if (rememberedPhone) {
        return {
          identifier: '',
          password: '',
          phone: rememberedPhone,
          remember: true
        };
      }
    }
    return {
      identifier: '',
      password: '',
      phone: '',
      remember: false
    };
  };

  const rememberedInfo = getRememberedInfo();
  
  const [activeTab, setActiveTab] = useState<'password' | 'sms'>(rememberedInfo.phone ? 'sms' : 'password')
  const [identifier, setIdentifier] = useState(rememberedInfo.identifier)
  const [password, setPassword] = useState(rememberedInfo.password)
  const [phone, setPhone] = useState(rememberedInfo.phone)
  const [code, setCode] = useState('')
  const [remember, setRemember] = useState(rememberedInfo.remember)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      let response, data
      if (activeTab === 'password') {
        // 账号密码登录
        response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password, remember })
        })
      } else {
        // 验证码登录
        response = await fetch('/api/auth/login/sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, code, remember })
        })
      }
      
      data = await response.json()
      if (!response.ok) throw new Error(data.error || '登录失败')

      // 存储token和用户信息到localStorage
      localStorage.setItem('auth-token', data.token)
      if (data.user) {
        localStorage.setItem('user-info', JSON.stringify(data.user))
      }
      
      // 处理记住我功能
      if (remember) {
        if (activeTab === 'password') {
          // 账号密码登录，存储账号和密码
          localStorage.setItem('remembered-username', identifier);
          localStorage.setItem('remembered-password', password);
        } else {
          // 验证码登录，存储手机号
          localStorage.setItem('remembered-phone', phone);
        }
        console.log('已存储登录信息到本地缓存');
      } else {
        // 未勾选记住我，清除之前存储的登录信息
        localStorage.removeItem('remembered-username');
        localStorage.removeItem('remembered-password');
        localStorage.removeItem('remembered-phone');
      }
      
      // 登录成功后跳转到回调地址或首页
      const urlParams = new URLSearchParams(window.location.search);
      const callbackUrl = urlParams.get('callback');
      // 确保回调地址是有效的
      const redirectUrl = callbackUrl && callbackUrl.startsWith('/') ? callbackUrl : '/';
      
      // 添加日志输出
      console.log('登录成功，存储的用户信息:', data.user);
      console.log('登录成功，存储的token:', data.token.substring(0, 20) + '...');
      console.log('登录成功，跳转到:', redirectUrl);
      
      window.location.href = redirectUrl;  
    } catch (err: any) {
      setLoading(false)
      setError(err.message || '登录失败，请重试')
    }
  }

  const handleThirdPartyLogin = (provider: string) => {
    // 第三方登录逻辑
    console.log(`第三方登录: ${provider}`)
  }

  const handleSendCode = async () => {
    if (!phone) {
      setError('请输入手机号')
      return
    }

    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'login', target: phone })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '发送验证码失败')
      
      // 开始倒计时
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err: any) {
      setError(err.message || '发送验证码失败')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#001F3F] to-[#0074D9]">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#001F3F]">登录</h1>
          <p className="text-gray-600 mt-2">欢迎回来，继续您的旅程</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* 登录方式切换 */}
        <div className="flex mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-2 text-center font-medium transition-colors ${activeTab === 'password' ? 'text-[#0074D9] border-b-2 border-[#0074D9]' : 'text-gray-500 hover:text-[#0074D9]'}`}
          >
            账号密码登录
          </button>
          <button
            onClick={() => setActiveTab('sms')}
            className={`flex-1 py-2 text-center font-medium transition-colors ${activeTab === 'sms' ? 'text-[#0074D9] border-b-2 border-[#0074D9]' : 'text-gray-500 hover:text-[#0074D9]'}`}
          >
            验证码登录
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === 'password' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  用户名/邮箱/手机号
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0074D9] focus:border-transparent transition-all"
                  placeholder="请输入账号"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  密码
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0074D9] focus:border-transparent transition-all"
                    placeholder="请输入密码"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  手机号
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0074D9] focus:border-transparent transition-all"
                  placeholder="请输入手机号"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  验证码
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0074D9] focus:border-transparent transition-all"
                    placeholder="请输入验证码"
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={countdown > 0}
                    className="px-4 py-2 bg-[#0074D9] text-white rounded-lg hover:bg-[#0056b3] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {countdown > 0 ? `${countdown}s后重发` : '发送验证码'}
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="mr-2 h-4 w-4 text-[#0074D9] focus:ring-[#0074D9] border-gray-300 rounded"
              />
              <label htmlFor="remember" className="text-sm text-gray-600">
                记住我
              </label>
            </div>
            <a href="#" className="text-sm text-[#0074D9] hover:underline">
              忘记密码？
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#0074D9] to-[#7FDBFF] text-white py-2 px-4 rounded-lg hover:from-[#0056b3] hover:to-[#0074D9] transition-all transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        {/* 第三方登录功能暂时注释掉 */}
        {/*
        <div className="my-6 flex items-center justify-center">
          <div className="h-px bg-gray-300 flex-grow"></div>
          <span className="mx-4 text-sm text-gray-500">其他登录方式</span>
          <div className="h-px bg-gray-300 flex-grow"></div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => handleThirdPartyLogin('wechat')}
            className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all transform hover:scale-105 hover:shadow-sm"
          >
            <span className="text-lg">微信</span>
          </button>
          <button
            onClick={() => handleThirdPartyLogin('qq')}
            className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all transform hover:scale-105 hover:shadow-sm"
          >
            <span className="text-lg">QQ</span>
          </button>
          <button
            onClick={() => handleThirdPartyLogin('google')}
            className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all transform hover:scale-105 hover:shadow-sm"
          >
            <span className="text-lg">Google</span>
          </button>
        </div>
        */}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            还没有账号？{' '}
            <a href="/auth/register" className="text-[#0074D9] hover:underline font-medium">
              立即注册
            </a>
          </p>
          <p className="text-sm text-gray-600 mt-2">
            <a href="/" className="text-[#0074D9] hover:underline font-medium">
              返回主页
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}