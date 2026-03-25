import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createOperationLog } from '@/lib/operation-log';
import { verifyJwt } from '@/lib/jwt';

export async function GET(request: NextRequest) {
  try {
    // 检查是否在静态构建环境中
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
      return NextResponse.json({ error: 'API 路由在静态构建时不可用' }, { status: 503 });
    }

    // 从请求头获取token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '缺少认证令牌' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // 检查token状态
    const { data: tokenData } = await supabase
      .from('vw_tokens')
      .select('status, expires_at')
      .eq('token', token)
      .single();
    
    if (!tokenData) {
      return NextResponse.json({ error: '令牌不存在' }, { status: 401 });
    }
    
    if (tokenData.status !== 'active') {
      return NextResponse.json({ error: '令牌已被注销' }, { status: 401 });
    }
    
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ error: '令牌已过期' }, { status: 401 });
    }
    
    const decoded = verifyJwt(token);
    if (!decoded) {
      return NextResponse.json({ error: '您没有权限访问此功能' }, { status: 403 });
    }
    
    // 检查是否有管理员或超级管理员角色
    const hasAdminRole = decoded.roles.some(role => role.type === 'admin' || role.type === 'superadmin');
    if (!hasAdminRole) {
      return NextResponse.json({ error: '您没有权限访问此功能' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const userId = searchParams.get('userId') || '';

    let query = supabase
      .from('vw_tokens')
      .select('*, vw_users(usercode, username, email, role)', { count: 'exact' });

    if (search) {
      query = query.or(`token.ilike.%${search}%,device_info.ilike.%${search}%`);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: tokens, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: tokens,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('获取token黑名单错误:', error);
    return NextResponse.json({ error: '获取token黑名单失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // 检查是否在静态构建环境中
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
      return NextResponse.json({ error: 'API 路由在静态构建时不可用' }, { status: 503 });
    }

    // 从请求头获取token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '缺少认证令牌' }, { status: 401 });
    }

    const authToken = authHeader.replace('Bearer ', '');
    
    // 检查token状态
    const { data: authTokenData } = await supabase
      .from('vw_tokens')
      .select('status, expires_at')
      .eq('token', authToken)
      .single();
    
    if (!authTokenData) {
      return NextResponse.json({ error: '令牌不存在' }, { status: 401 });
    }
    
    if (authTokenData.status !== 'active') {
      return NextResponse.json({ error: '令牌已被注销' }, { status: 401 });
    }
    
    if (new Date(authTokenData.expires_at) < new Date()) {
      return NextResponse.json({ error: '令牌已过期' }, { status: 401 });
    }
    
    const decoded = verifyJwt(authToken);
    if (!decoded) {
      return NextResponse.json({ error: '您没有权限执行此操作' }, { status: 403 });
    }
    
    // 检查是否有管理员或超级管理员角色
    const hasAdminRole = decoded.roles.some(role => role.type === 'admin' || role.type === 'superadmin');
    if (!hasAdminRole) {
      return NextResponse.json({ error: '您没有权限执行此操作' }, { status: 403 });
    }

    const { id, token: targetToken } = await request.json();
    if (!id && !targetToken) {
      return NextResponse.json({ error: '缺少token ID或token值' }, { status: 400 });
    }

    // 先获取token信息
    let targetTokenData;
    if (id) {
      const { data } = await supabase
        .from('vw_tokens')
        .select('token, user_id')
        .eq('id', id)
        .single();
      targetTokenData = { id, token: data?.token, user_id: data?.user_id };
    } else {
      const { data } = await supabase
        .from('vw_tokens')
        .select('id, user_id')
        .eq('token', targetToken)
        .single();
      targetTokenData = { id: data?.id, token: targetToken, user_id: data?.user_id };
    }

    if (!targetTokenData) {
      return NextResponse.json({ error: 'token不存在' }, { status: 404 });
    }

    // 从vw_tokens表中删除
    const { error } = await supabase
      .from('vw_tokens')
      .delete()
      .eq('id', targetTokenData.id);

    if (error) {
      throw error;
    }

    // 不需要添加到黑名单，只更新状态即可

    // 记录操作日志
    await createOperationLog('token:remove', '成功', `删除token: ${targetTokenData.id}`, request.ip || 'unknown');

    return NextResponse.json({ success: true, message: 'token已删除' });
  } catch (error) {
    console.error('移除token黑名单错误:', error);
    return NextResponse.json({ error: '移除token黑名单失败' }, { status: 500 });
  }
}

// 清除过期的token黑名单
export async function POST(request: NextRequest) {
  try {
    // 检查是否在静态构建环境中
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
      return NextResponse.json({ error: 'API 路由在静态构建时不可用' }, { status: 503 });
    }

    // 从请求头获取token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '缺少认证令牌' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // 检查token状态
    const { data: tokenData } = await supabase
      .from('vw_tokens')
      .select('status, expires_at')
      .eq('token', token)
      .single();
    
    if (!tokenData) {
      return NextResponse.json({ error: '令牌不存在' }, { status: 401 });
    }
    
    if (tokenData.status !== 'active') {
      return NextResponse.json({ error: '令牌已被注销' }, { status: 401 });
    }
    
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ error: '令牌已过期' }, { status: 401 });
    }
    
    const decoded = verifyJwt(token);
    if (!decoded) {
      return NextResponse.json({ error: '您没有权限执行此操作' }, { status: 403 });
    }
    
    // 检查是否有管理员或超级管理员角色
    const hasAdminRole = decoded.roles.some(role => role.type === 'admin' || role.type === 'superadmin');
    if (!hasAdminRole) {
      return NextResponse.json({ error: '您没有权限执行此操作' }, { status: 403 });
    }

    const body = await request.json();
    
    // 如果是清理过期token
    if (!body.id) {
      // 清理过期token
      const { error, count } = await supabase
        .from('vw_tokens')
        .update({ status: 'expired' })
        .lt('expires_at', new Date().toISOString())
        .eq('status', 'active');

      if (error) {
        throw error;
      }

      // 记录操作日志
      await createOperationLog('token:cleanup', '成功', `清理过期token: ${count}个`, request.ip || 'unknown');

      return NextResponse.json({ success: true, message: `成功清理 ${count} 个过期token` });
    }
    
    // 如果是设置过期时间
    if (body.id && body.expires_at) {
      const { error } = await supabase
        .from('vw_tokens')
        .update({ 
          expires_at: body.expires_at,
          // 如果设置的过期时间小于当前时间，将状态改为expired
          status: new Date(body.expires_at) < new Date() ? 'expired' : 'active'
        })
        .eq('id', body.id);

      if (error) {
        throw error;
      }

      // 记录操作日志
      await createOperationLog('token:update_expiry', '成功', `更新token过期时间: ${body.id}`, request.ip || 'unknown');

      return NextResponse.json({ success: true, message: 'token过期时间已更新' });
    }

    return NextResponse.json({ error: '无效的请求' }, { status: 400 });
  } catch (error) {
    console.error('操作token错误:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

// 一键下线用户所有token
export async function PUT(request: NextRequest) {
  try {
    // 检查是否在静态构建环境中
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
      return NextResponse.json({ error: 'API 路由在静态构建时不可用' }, { status: 503 });
    }

    // 从请求头获取token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '缺少认证令牌' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // 检查token状态
    const { data: tokenData } = await supabase
      .from('vw_tokens')
      .select('status, expires_at')
      .eq('token', token)
      .single();
    
    if (!tokenData) {
      return NextResponse.json({ error: '令牌不存在' }, { status: 401 });
    }
    
    if (tokenData.status !== 'active') {
      return NextResponse.json({ error: '令牌已被注销' }, { status: 401 });
    }
    
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ error: '令牌已过期' }, { status: 401 });
    }
    
    const decoded = verifyJwt(token);
    if (!decoded) {
      return NextResponse.json({ error: '您没有权限执行此操作' }, { status: 403 });
    }
    
    // 检查是否有管理员或超级管理员角色
    const hasAdminRole = decoded.roles.some(role => role.type === 'admin' || role.type === 'superadmin');
    if (!hasAdminRole) {
      return NextResponse.json({ error: '您没有权限执行此操作' }, { status: 403 });
    }

    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }

    // 获取用户的所有活跃token
    const { data: tokens, error: tokensError } = await supabase
      .from('vw_tokens')
      .select('id, token')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (tokensError) {
      throw tokensError;
    }

    // 批量更新token状态为inactive并添加到黑名单
    if (tokens && tokens.length > 0) {
      const tokenIds = tokens.map(t => t.id);
      
      // 更新token状态
      const { error: updateError } = await supabase
        .from('vw_tokens')
        .update({ 
          status: 'inactive',
          expires_at: new Date().toISOString()
        })
        .in('id', tokenIds);

      if (updateError) {
        throw updateError;
      }

      // 不需要添加到黑名单，只更新状态即可
    }

    // 记录操作日志
    await createOperationLog('token:force_logout', '成功', `强制下线用户: ${userId}`, request.ip || 'unknown');

    return NextResponse.json({ success: true, message: '用户已被强制下线' });
  } catch (error) {
    console.error('强制下线用户错误:', error);
    return NextResponse.json({ error: '强制下线失败' }, { status: 500 });
  }
}
