import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyJwt } from '@/lib/jwt';
import { createOperationLog } from '@/lib/operation-log';

// 更新token状态
export async function updateTokenStatus(token: string, status: string, reason: string = '状态更新'): Promise<void> {
  try {
    await supabase
      .from('vw_tokens')
      .update({
        status,
        last_status_change: new Date().toISOString(),
        status_reason: reason
      })
      .eq('token', token);
  } catch (error) {
    console.error('更新token状态错误:', error);
  }
}

export async function POST(request: NextRequest) {
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

    // 更新token状态为inactive
    await updateTokenStatus(token, 'inactive', '用户登出');

    // 记录登出日志
    await createOperationLog('logout', '成功', decoded.email, request.ip || 'unknown');

    return NextResponse.json({ success: true, message: '登出成功' });
  } catch (error) {
    console.error('登出错误:', error);
    return NextResponse.json({ error: '登出失败，请重试' }, { status: 500 });
  }
}

// 管理员强制下线用户
export async function DELETE(request: NextRequest) {
  try {
    // 从请求头获取管理员token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '缺少认证令牌' }, { status: 401 });
    }

    const adminToken = authHeader.replace('Bearer ', '');
    const adminDecoded = verifyJwt(adminToken);
    if (!adminDecoded || (adminDecoded.role !== 'admin' && adminDecoded.role !== 'superadmin')) {
      return NextResponse.json({ error: '您没有权限执行此操作' }, { status: 403 });
    }

    // 获取要下线的用户ID
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }

    // 获取用户的所有活跃token
    const { data: tokens } = await supabase
      .from('vw_tokens')
      .select('token')
      .eq('user_id', userId)
      .eq('status', 'active');

    // 将所有活跃token状态更新为inactive
    if (tokens && tokens.length > 0) {
      for (const tokenData of tokens) {
        await updateTokenStatus(tokenData.token, 'inactive', '管理员强制下线');
      }
    }

    // 记录操作日志
    await createOperationLog('user:force_logout', '成功', `用户ID: ${userId}`, request.ip || 'unknown');

    return NextResponse.json({ success: true, message: '用户已被强制下线' });
  } catch (error) {
    console.error('强制下线错误:', error);
    return NextResponse.json({ error: '操作失败，请重试' }, { status: 500 });
  }
}
