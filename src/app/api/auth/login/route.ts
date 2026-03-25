import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { signJwt, verifyJwt } from '@/lib/jwt';
import { createOperationLog } from '@/lib/operation-log';
import { verifyPassword } from '@/lib/password';

export async function POST(request: NextRequest) {
  try {
    // 检查是否在静态构建环境中
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
      return NextResponse.json({ error: 'API 路由在静态构建时不可用' }, { status: 503 });
    }

    const { identifier, password, remember } = await request.json();

    if (!identifier || !password) {
      return NextResponse.json({ error: '账号和密码不能为空' }, { status: 400 });
    }

    // 验证用户 - 支持usercode、用户名、邮箱或手机号
    let user;
    let authError;

    // 尝试通过usercode查找
    ({ data: user, error: authError } = await supabase
      .from('vw_users')
      .select('*')
      .eq('usercode', identifier)
      .single());

    // 如果usercode查找失败，尝试通过邮箱查找
    if (authError || !user) {
      ({ data: user, error: authError } = await supabase
        .from('vw_users')
        .select('*')
        .eq('email', identifier)
        .single());
    }

    // 如果邮箱查找失败，尝试通过手机号查找
    // if (authError || !user) {
    //   ({ data: user, error: authError } = await supabase
    //     .from('vw_users')
    //     .select('*')
    //     .eq('phone', identifier)
    //     .single());
    // }

    if (authError || !user) {
      // 记录登录失败日志
      await createOperationLog('login', '失败', identifier, request.ip || 'unknown');
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      // 记录登录失败日志
      await createOperationLog('login', '失败', identifier, request.ip || 'unknown');
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }

    // 获取用户角色信息
    const { data: userRoles, error: rolesError } = await supabase
      .from('vw_user_roles')
      .select('role_id')
      .eq('user_id', user.id);

    let roles: { id: string; name: string; type: string }[] = [];
    if (!rolesError && userRoles && userRoles.length > 0) {
      const roleIds = userRoles.map(ur => ur.role_id);
      const { data: rolesData } = await supabase
        .from('vw_roles')
        .select('id, name, type')
        .in('id', roleIds);
      if (rolesData) {
        roles = rolesData;
      }
    }

    // 生成JWT token
    const token = signJwt({ userId: user.id, email: user.email, roles: roles });

    // 计算token过期时间（7天）
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 存储token到数据库
    await supabase
      .from('vw_tokens')
      .insert({
        token,
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
        ip_address: request.ip || 'unknown',
        device_info: request.headers.get('user-agent') || 'unknown'
      });

    // 记录登录成功日志
    await createOperationLog('login', '成功', identifier, request.ip || 'unknown');

    // 更新最后登录时间
    await supabase
      .from('vw_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // 返回token和用户信息，由客户端存储到localStorage
    return NextResponse.json({ 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        roles: roles,
        status: user.status
      },
      token 
    });
  } catch (error) {
    console.error('登录错误:', error);
    return NextResponse.json({ error: '登录失败，请重试' }, { status: 500 });
  }
}

// 验证token是否有效
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

    // 验证token
    const decoded = verifyJwt(token);
    if (!decoded) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }

    // 获取用户信息
    const { data: user, error } = await supabase
      .from('vw_users')
      .select('*')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 });
    }

    // 获取用户角色信息
    const { data: userRoles, error: rolesError } = await supabase
      .from('vw_user_roles')
      .select('role_id')
      .eq('user_id', user.id);

    let roles: { id: string; name: string; type: string }[] = [];
    if (!rolesError && userRoles && userRoles.length > 0) {
      const roleIds = userRoles.map(ur => ur.role_id);
      const { data: rolesData } = await supabase
        .from('vw_roles')
        .select('id, name, type')
        .in('id', roleIds);
      if (rolesData) {
        roles = rolesData;
      }
    }

    return NextResponse.json({ 
      success: true, 
      user: { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        roles: roles,
        status: user.status
      }
    });
  } catch (error) {
    console.error('验证token错误:', error);
    return NextResponse.json({ error: '验证失败' }, { status: 500 });
  }
}
