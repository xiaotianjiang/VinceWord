import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createOperationLog } from '@/lib/operation-log';
import { verifyJwt } from '@/lib/jwt';
import { hashPassword } from '@/lib/password';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    const userId = params.id;
    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }

    const { usercode, username, email, phone, password, status } = await request.json();

    if (!usercode || !username || !email) {
      return NextResponse.json({ error: '请填写完整的用户信息' }, { status: 400 });
    }

    // 检查用户是否存在
    const { data: existingUser } = await supabase
      .from('vw_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 检查账号和邮箱是否被其他用户使用
    const { data: conflictingUser } = await supabase
      .from('vw_users')
      .select('*')
      .or(`usercode.eq.${usercode},email.eq.${email}`)
      .neq('id', userId)
      .single();

    if (conflictingUser) {
      return NextResponse.json({ error: '账号或邮箱已被使用' }, { status: 400 });
    }

    // 准备更新数据
    const updateData: any = {
      usercode,
      username,
      email,
      phone: phone || null,
      status: status || 'active',
      updated_at: new Date().toISOString()
    };

    // 如果提供了密码，则加密并更新
    if (password) {
      updateData.password_hash = await hashPassword(password);
    }

    // 更新用户
    const { data: updatedUser, error: updateError } = await supabase
      .from('vw_users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // 记录操作日志
    await createOperationLog('user_update', '成功', email, request.ip || 'unknown');

    return NextResponse.json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('更新用户错误:', error);
    return NextResponse.json({ error: '更新用户失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    const userId = params.id;
    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }

    // 检查用户是否存在
    const { data: existingUser } = await supabase
      .from('vw_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!existingUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 不允许删除自己
    if (userId === decoded.userId) {
      return NextResponse.json({ error: '不能删除自己' }, { status: 400 });
    }

    // 删除用户
    const { error: deleteError } = await supabase
      .from('vw_users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      throw deleteError;
    }

    // 记录操作日志
    await createOperationLog('user_delete', '成功', existingUser.email, request.ip || 'unknown');

    return NextResponse.json({
      success: true,
      message: '用户删除成功'
    });
  } catch (error) {
    console.error('删除用户错误:', error);
    return NextResponse.json({ error: '删除用户失败' }, { status: 500 });
  }
}
