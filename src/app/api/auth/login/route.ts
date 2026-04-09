import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { signJwt, verifyJwt } from '@/lib/jwt';
import { createOperationLog } from '@/lib/operation-log';
import { verifyPassword } from '@/lib/password';

export async function POST(request: NextRequest) {
  try {
    console.log('Login API called');
    console.log('Environment check - SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'not set');
    
    const body = await request.json();
    console.log('Request body received:', { identifier: body.identifier, hasPassword: !!body.password });
    
    const { identifier, password, remember } = body;

    if (!identifier || !password) {
      return NextResponse.json({ error: '账号和密码不能为空' }, { status: 400 });
    }

    // 验证用户 - 支持usercode、用户名、邮箱或手机号
    let user;
    let authError;

    console.log('Searching user by usercode or email:', identifier);
    // 使用OR条件一次查询，减少数据库请求
    ({ data: user, error: authError } = await supabase
      .from('vw_users')
      .select('*')
      .or(`usercode.eq.${identifier},email.eq.${identifier}`)
      .single());

    console.log('User search result:', { found: !!user, error: authError?.message });

    if (authError || !user) {
      console.log('User not found');
      // 记录登录失败日志
      await createOperationLog('login', '失败', identifier, request.ip || 'unknown');
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }

    console.log('User found, verifying password');
    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    console.log('Password verification result:', isPasswordValid);
    
    if (!isPasswordValid) {
      // 记录登录失败日志
      await createOperationLog('login', '失败', identifier, request.ip || 'unknown');
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }

    console.log('Getting user roles');
    // 使用JOIN查询一次获取用户角色信息，减少数据库请求
    const { data: userWithRoles, error: rolesError } = await supabase
      .from('vw_user_roles')
      .select(`
        vw_roles (
          id,
          name,
          type
        )
      `)
      .eq('user_id', user.id);

    let roles: { id: string; name: string; type: string }[] = [];
    if (!rolesError && userWithRoles && userWithRoles.length > 0) {
      roles = userWithRoles
        .map(ur => ur.vw_roles)
        .filter((role): role is { id: string; name: string; type: string } => role !== null);
    }
    console.log('User roles:', roles.length);

    console.log('Generating JWT token');
    // 生成JWT token
    const token = signJwt({ userId: user.id, email: user.email, roles: roles });

    // 计算token过期时间（7天）
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const now = new Date().toISOString();
    const ipAddress = request.ip || 'unknown';

    console.log('Performing batch database operations');
    // 并行执行多个数据库操作，减少等待时间
    await Promise.all([
      // 存储token到数据库
      supabase
        .from('vw_tokens')
        .insert({
          token,
          user_id: user.id,
          expires_at: expiresAt.toISOString(),
          ip_address: ipAddress,
          device_info: request.headers.get('user-agent') || 'unknown'
        }),
      
      // 记录登录成功日志
      createOperationLog('login', '成功', identifier, ipAddress),
      
      // 更新最后登录时间
      supabase
        .from('vw_users')
        .update({ last_login: now })
        .eq('id', user.id)
    ]);

    console.log('Login successful, returning response');
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
    console.error('Login error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json({ error: '登录失败，请重试', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// 验证token是否有效
export async function GET(request: NextRequest) {
  try {
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

    // 并行执行用户信息和角色查询
    const [userResult, rolesResult] = await Promise.all([
      // 获取用户信息（只查询需要的字段）
      supabase
        .from('vw_users')
        .select('id, username, email, status')
        .eq('id', decoded.userId)
        .single(),
      
      // 使用JOIN查询一次获取用户角色信息
      supabase
        .from('vw_user_roles')
        .select(`
          vw_roles (
            id,
            name,
            type
          )
        `)
        .eq('user_id', decoded.userId)
    ]);

    const { data: user, error } = userResult;
    if (error || !user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 });
    }

    // 处理角色数据
    const { data: userWithRoles, error: rolesError } = rolesResult;
    let roles: { id: string; name: string; type: string }[] = [];
    if (!rolesError && userWithRoles && userWithRoles.length > 0) {
      roles = userWithRoles
        .map(ur => ur.vw_roles)
        .filter((role): role is { id: string; name: string; type: string } => role !== null);
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
