import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createOperationLog } from '@/lib/operation-log';
import { verifyJwt } from '@/lib/jwt';
import { hashPassword } from '@/lib/password';

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
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }

    // 检查用户权限
    const { data: userRoles } = await supabase
      .from('vw_user_roles')
      .select('role_id')
      .eq('user_id', decoded.userId);

    if (!userRoles || userRoles.length === 0) {
      return NextResponse.json({ error: '您没有权限访问此功能' }, { status: 403 });
    }

    // 获取角色信息
    const roleIds = userRoles.map(ur => ur.role_id);
    const { data: roles } = await supabase
      .from('vw_roles')
      .select('name')
      .in('id', roleIds);

    if (!roles || !roles.some(role => role.name === 'admin' || role.name === 'superadmin')) {
      return NextResponse.json({ error: '您没有权限访问此功能' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    const search = searchParams.get('search') || '';

    let query = supabase
      .from('vw_users')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`usercode.ilike.%${search}%,username.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: users, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: users,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    return NextResponse.json({ error: '获取用户列表失败' }, { status: 500 });
  }
}

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
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 });
    }

    // 检查用户权限
    const { data: userRoles } = await supabase
      .from('vw_user_roles')
      .select('role_id')
      .eq('user_id', decoded.userId);

    if (!userRoles || userRoles.length === 0) {
      return NextResponse.json({ error: '您没有权限访问此功能' }, { status: 403 });
    }

    // 获取角色信息
    const roleIds = userRoles.map(ur => ur.role_id);
    const { data: roles } = await supabase
      .from('vw_roles')
      .select('name, type')
      .in('id', roleIds);

    if (!roles || !roles.some(role => role.type === 'admin' || role.type === 'superadmin')) {
      return NextResponse.json({ error: '您没有权限访问此功能' }, { status: 403 });
    }

    // 确定当前用户的最高角色类型
    let currentUserType = 'user';
    if (roles.some(role => role.type === 'superadmin')) {
      currentUserType = 'superadmin';
    } else if (roles.some(role => role.type === 'admin')) {
      currentUserType = 'admin';
    }

    const { usercode, username, email, phone, password, status } = await request.json();

    if (!usercode || !username || !email || !password) {
      return NextResponse.json({ error: '请填写完整的用户信息' }, { status: 400 });
    }

    // 检查用户是否已存在
    const { data: existingUser } = await supabase
      .from('vw_users')
      .select('*')
      .or(`usercode.eq.${usercode},email.eq.${email}`)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: '用户已存在' }, { status: 400 });
    }

    // 加密密码
    const hashedPassword = await hashPassword(password);

    // 创建用户
    const { data: newUser, error: insertError } = await supabase
      .from('vw_users')
      .insert({
        usercode,
        username,
        email,
        phone: phone || null,
        password_hash: hashedPassword,
        status: status || 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // 更新source字段
    let sourceValue = '管理员';
    if (currentUserType === 'superadmin') {
      sourceValue = '超级管理员';
    }
    
    const { error: updateError } = await supabase
      .from('vw_users')
      .update({ source: sourceValue })
      .eq('id', newUser.id);

    if (updateError) {
      console.error('更新source字段错误:', updateError);
      // 继续执行，不中断流程
    }

    // 为新用户分配user角色
    const { data: userRole } = await supabase
      .from('vw_roles')
      .select('id')
      .eq('type', 'user')
      .single();

    if (userRole) {
      await supabase
        .from('vw_user_roles')
        .insert({
          user_id: newUser.id,
          role_id: userRole.id
        });
    }

    // 记录操作日志
    await createOperationLog('user_create', '成功', email, request.ip || 'unknown');

    return NextResponse.json({
      success: true,
      user: newUser
    });
  } catch (error) {
    console.error('创建用户错误:', error);
    return NextResponse.json({ error: '创建用户失败' }, { status: 500 });
  }
}

