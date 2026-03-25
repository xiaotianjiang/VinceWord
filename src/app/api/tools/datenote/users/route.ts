import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyJwt } from '@/lib/jwt';

// 从请求头获取用户信息
async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const decoded = verifyJwt(token);
  if (!decoded) {
    return null;
  }

  // 获取用户信息
  const { data: user } = await supabase
    .from('vw_users')
    .select('*')
    .eq('id', decoded.userId)
    .single();

  if (!user) {
    return null;
  }

  // 获取用户角色
  const { data: userRoles } = await supabase
    .from('vw_user_roles')
    .select('role_id')
    .eq('user_id', user.id);

  if (userRoles) {
    const roleIds = userRoles.map(ur => ur.role_id);
    const { data: roles } = await supabase
      .from('vw_roles')
      .select('*')
      .in('id', roleIds);

    user.roles = roles || [];
  }

  return user;
}

export async function GET(request: NextRequest) {
  try {
    // 检查是否在静态构建环境中
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
      return NextResponse.json({ success: false, error: 'API 路由在静态构建时不可用' }, { status: 503 });
    }

    // 获取当前用户
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ success: false, error: '请先登录' }, { status: 401 });
    }

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // 构建查询
    let query = supabase
      .from('vw_users')
      .select('id, email, username', { count: 'exact' });

    // 添加搜索条件
    if (search) {
      query = query.or(`email.ilike.%${search}%,username.ilike.%${search}%`);
    }

    // 执行查询
    const { data: users, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('查询用户失败:', error);
      return NextResponse.json({ success: false, error: '查询用户失败' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      users: users || [],
      total: count || 0
    });
  } catch (err) {
    console.error('服务器错误:', err);
    return NextResponse.json({ success: false, error: '服务器错误' }, { status: 500 });
  }
}
