'use client'

import { useState, useEffect } from 'react'

export default function RegisterPage() {
  const [usercode, setUsercode] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, message: '', color: '' })
  const [isRequestingInvite, setIsRequestingInvite] = useState(false)
  const [usercodeError, setUsercodeError] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [checkingUsercode, setCheckingUsercode] = useState(false)
  const [usercodeAvailable, setUsercodeAvailable] = useState<boolean | null>(null)

  // 密码强度检测
  useEffect(() => {
    if (password) {
      let score = 0
      if (password.length >= 8) score++
      if (/[A-Z]/.test(password)) score++
      if (/[a-z]/.test(password)) score++
      if (/[0-9]/.test(password)) score++
      if (/[^A-Za-z0-9]/.test(password)) score++

      const strength = [
        { score: 0, message: '请输入密码', color: 'bg-gray-300' },
        { score: 1, message: '密码强度：弱', color: 'bg-red-500' },
        { score: 2, message: '密码强度：中', color: 'bg-yellow-500' },
        { score: 3, message: '密码强度：良好', color: 'bg-blue-500' },
        { score: 4, message: '密码强度：强', color: 'bg-green-500' },
        { score: 5, message: '密码强度：非常强', color: 'bg-green-600' }
      ]

      setPasswordStrength(strength[score])
    } else {
      setPasswordStrength({ score: 0, message: '', color: 'bg-gray-300' })
    }
  }, [password])

  // 账号格式验证
  useEffect(() => {
    if (usercode) {
      // 验证账号格式，允许输入英文字符的点
      const usercodeRegex = /^[A-Za-z0-9.]{3,20}$/
      if (!usercodeRegex.test(usercode)) {
        setUsercodeError('账号只能输入字母、数字和英文字符的点，长度在3到20位之间')
        setUsercodeAvailable(null)
      } else {
        setUsercodeError('')
      }
    } else {
      setUsercodeError('')
      setUsercodeAvailable(null)
    }
  }, [usercode])

  // 检查账号是否已存在
  const checkUsercodeAvailability = async () => {
    if (usercode && !usercodeError) {
      setCheckingUsercode(true)
      try {
        const response = await fetch('/api/auth/check-usercode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usercode })
        })
        const data = await response.json()
        setUsercodeAvailable(data.available)
        if (!data.available) {
          setUsercodeError('该账号已被使用')
        }
      } catch (error) {
        setUsercodeAvailable(null)
      } finally {
        setCheckingUsercode(false)
      }
    }
  }

  // 用户名验证
  useEffect(() => {
    if (username) {
      // 验证用户名格式
      const usernameRegex = /^[A-Za-z0-9\u4e00-\u9fa5]{1,20}$/
      if (!usernameRegex.test(username)) {
        setUsernameError('用户名只能输入字母、数字和中文，不能输入空格和符号，长度在20位以内')
      } else {
        setUsernameError('')
      }
    } else {
      setUsernameError('')
    }
  }, [username])

  // 邮箱格式验证
  useEffect(() => {
    if (email) {
      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        setEmailError('请输入正确的邮箱格式')
      } else {
        setEmailError('')
      }
    } else {
      setEmailError('')
    }
  }, [email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // 验证账号
    if (usercodeError) {
      setLoading(false)
      setError(usercodeError)
      return
    }

    if (!usercodeAvailable) {
      setLoading(false)
      setError('请确保账号可用')
      return
    }

    // 验证用户名
    if (usernameError) {
      setLoading(false)
      setError(usernameError)
      return
    }

    // 验证邮箱
    if (emailError) {
      setLoading(false)
      setError(emailError)
      return
    }

    if (password !== confirmPassword) {
      setLoading(false)
      setError('两次输入的密码不一致')
      return
    }

    if (passwordStrength.score < 2) {
      setLoading(false)
      setError('密码强度不足，请使用更复杂的密码')
      return
    }

    if (!agreeTerms) {
      setLoading(false)
      setError('请同意用户协议和隐私政策')
      return
    }

    try {
      // 调用注册API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usercode, username, email, password, inviteCode, agreeTerms })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '注册失败')
      
      setLoading(false)
      setSuccess('注册成功！正在跳转到登录页面...')
      setTimeout(() => {
        window.location.href = '/auth/login'
      }, 2000)
    } catch (err: any) {
      setLoading(false)
      setError(err.message || '注册失败，请重试')
    }
  }

  const handleInviteCodeRequest = async () => {
    setIsRequestingInvite(true)
    try {
      // 更友好的邀请码申请界面
      const userEmail = prompt('请输入您的邮箱，我们将发送邀请码给您：')
      if (userEmail) {
        const reason = prompt('请简要说明您需要邀请码的原因：')
        if (reason) {
          // 调用邀请码申请API
          const response = await fetch('/api/auth/invite-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail, reason, action: 'request' })
          })
          const data = await response.json()
          if (!response.ok) throw new Error(data.error || '申请失败')
          
          alert('邀请码申请已提交，我们将尽快处理并发送邀请码到您的邮箱')
        }
      }
    } catch (err: any) {
      alert('邀请码申请失败：' + (err.message || '请稍后重试'))
    } finally {
      setIsRequestingInvite(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#001F3F] to-[#0074D9]">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#001F3F]">注册</h1>
          <p className="text-gray-600 mt-2">创建新账号，开始您的旅程</p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              账号
            </label>
            <div className="relative">
              <input
                type="text"
                value={usercode}
                onChange={(e) => setUsercode(e.target.value)}
                onBlur={checkUsercodeAvailability}
                required
                maxLength={20}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0074D9] focus:border-transparent transition-all ${usercodeError ? 'border-red-500' : usercodeAvailable === true ? 'border-green-500' : 'border-gray-300'}`}
                placeholder="请输入账号"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {checkingUsercode ? (
                  <span className="text-gray-400">检查中...</span>
                ) : usercodeAvailable === true && !usercodeError ? (
                  <span className="text-green-500">✓</span>
                ) : (
                  <span className="text-gray-400">{usercode.length}/20</span>
                )}
              </div>
            </div>
            {usercodeError && (
              <p className="text-xs text-red-500 mt-1">
                {usercodeError}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              用户名
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                maxLength={20}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0074D9] focus:border-transparent transition-all ${usernameError ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="请输入用户名"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                {username.length}/20
              </div>
            </div>
            {usernameError && (
              <p className="text-xs text-red-500 mt-1">
                {usernameError}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0074D9] focus:border-transparent transition-all ${emailError ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="请输入邮箱"
            />
            {emailError && (
              <p className="text-xs text-red-500 mt-1">
                {emailError}
              </p>
            )}
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
            <div className="mt-2">
              <div className="flex items-center space-x-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${passwordStrength.color} transition-all duration-300 ease-in-out`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-600 min-w-[100px]">
                  {passwordStrength.message}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                密码长度至少8位，包含大小写字母、数字和特殊字符
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              确认密码
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0074D9] focus:border-transparent transition-all"
                placeholder="请再次输入密码"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              邀请码
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0074D9] focus:border-transparent transition-all"
                placeholder="请输入邀请码"
              />
              <button
                type="button"
                onClick={handleInviteCodeRequest}
                disabled={isRequestingInvite}
                className="px-4 py-2 bg-[#0074D9] text-white rounded-lg hover:bg-[#0056b3] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isRequestingInvite ? '申请中...' : '申请邀请码'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              没有邀请码？点击&amp;quot;申请邀请码&amp;quot;获取
            </p>
          </div>

          <div className="flex items-start">
            <input
              type="checkbox"
              id="agreeTerms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-1 mr-2 h-4 w-4 text-[#0074D9] focus:ring-[#0074D9] border-gray-300 rounded"
            />
            <label htmlFor="agreeTerms" className="text-sm text-gray-600">
              我同意
              <a href="#" className="text-[#0074D9] hover:underline">用户协议</a>
              和
              <a href="#" className="text-[#0074D9] hover:underline">隐私政策</a>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#0074D9] to-[#7FDBFF] text-white py-2 px-4 rounded-lg hover:from-[#0056b3] hover:to-[#0074D9] transition-all transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            已有账号？{' '}
            <a href="/auth/login" className="text-[#0074D9] hover:underline font-medium">
              立即登录
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