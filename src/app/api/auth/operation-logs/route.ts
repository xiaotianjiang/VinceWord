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

    // 检查用户权限
    const { data: user } = await supabase
      .from('vw_users')
      .select('role')
      .eq('id', decoded.userId)
      .single();

    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: '您没有权限访问此功能' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const operation = searchParams.get('operation');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('vw_operation_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (operation) {
      query = query.eq('operation', operation);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: logs, error, count } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, logs, total: count });
  } catch (error) {
    console.error('获取操作日志错误:', error);
    return NextResponse.json({ error: '获取操作日志失败' }, { status: 500 });
  }
}
