import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyJwt } from '@/lib/jwt';

// 强制 API 路由为动态路由
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 从请求头获取token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '缺少认证令牌' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyJwt(token);
    if (!decoded) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }

    // 获取用户列表
    const { data: users, error } = await supabase
      .from('vw_users')
      .select('id, username, email, role')
      .order('username');

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
  }
}
