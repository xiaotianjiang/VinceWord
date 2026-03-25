import { NextRequest, NextResponse } from 'next/server'

// 模拟数据库检查
// 实际项目中应该连接数据库查询
const existingUsercodes = new Set(['admin', 'test', 'user'])

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

    // 检查账号是否已存在
    const available = !existingUsercodes.has(usercode)

    return NextResponse.json({ available })
  } catch (error) {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
