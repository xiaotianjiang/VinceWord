import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { usercode } = await request.json()

    if (!usercode) {
      return NextResponse.json({ error: '账号不能为空' }, { status: 400 })
    }

    // 验证账号格式，允许输入英文字符的点
    const usercodeRegex = /^[A-Za-z0-9.]{3,20}$/
    if (!usercodeRegex.test(usercode)) {
      return NextResponse.json({ error: '账号格式不正确' }, { status: 400 })
    }

    // 从数据库检查账号是否已存在
    const { data: existingUser, error } = await supabase
      .from('vw_users')
      .select('id')
      .eq('usercode', usercode)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 是未找到记录的错误码
      console.error('检查账号时出错:', error)
      return NextResponse.json({ error: '服务器错误' }, { status: 500 })
    }

    // 如果找到用户，则账号已存在
    const available = !existingUser

    return NextResponse.json({ available })
  } catch (error) {
    console.error('检查账号时出错:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
