import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createOperationLog } from '@/lib/operation-log';
import { verifyJwt } from '@/lib/jwt';

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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    const search = searchParams.get('search') || '';

    let query = supabase
      .from('vw_permissions')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }

    const { data: permissions, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: permissions,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('获取权限列表错误:', error);
    return NextResponse.json({ error: '获取权限列表失败' }, { status: 500 });
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
    const { data: user } = await supabase
      .from('vw_users')
      .select('role')
      .eq('id', decoded.userId)
      .single();

    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: '您没有权限访问此功能' }, { status: 403 });
    }

    const { name, code, description, module, action } = await request.json();

    if (!name || !code || !module || !action) {
      return NextResponse.json({ error: '请填写完整的权限信息' }, { status: 400 });
    }

    // 检查权限是否已存在
    const { data: existingPermission } = await supabase
      .from('vw_permissions')
      .select('*')
      .eq('code', code)
      .single();

    if (existingPermission) {
      return NextResponse.json({ error: '权限已存在' }, { status: 400 });
    }

    // 创建权限
    const { data: newPermission, error: insertError } = await supabase
      .from('vw_permissions')
      .insert({
        name,
        code,
        description,
        module,
        action,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // 记录操作日志
    await createOperationLog('permission_create', '成功', name, request.ip || 'unknown');

    return NextResponse.json({
      success: true,
      permission: newPermission
    });
  } catch (error) {
    console.error('创建权限错误:', error);
    return NextResponse.json({ error: '创建权限失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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
    const { data: user } = await supabase
      .from('vw_users')
      .select('role')
      .eq('id', decoded.userId)
      .single();

    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: '您没有权限访问此功能' }, { status: 403 });
    }

    // 从URL获取权限ID
    const url = new URL(request.url);
    const permissionId = url.pathname.split('/').pop();
    if (!permissionId) {
      return NextResponse.json({ error: '缺少权限ID' }, { status: 400 });
    }

    const { name, code, description, module, action } = await request.json();

    if (!name || !code || !module || !action) {
      return NextResponse.json({ error: '请填写完整的权限信息' }, { status: 400 });
    }

    // 检查权限是否存在
    const { data: existingPermission } = await supabase
      .from('vw_permissions')
      .select('*')
      .eq('id', permissionId)
      .single();

    if (!existingPermission) {
      return NextResponse.json({ error: '权限不存在' }, { status: 404 });
    }

    // 检查权限代码是否被其他权限使用
    const { data: conflictingPermission } = await supabase
      .from('vw_permissions')
      .select('*')
      .eq('code', code)
      .neq('id', permissionId)
      .single();

    if (conflictingPermission) {
      return NextResponse.json({ error: '权限代码已被使用' }, { status: 400 });
    }

    // 更新权限
    const { data: updatedPermission, error: updateError } = await supabase
      .from('vw_permissions')
      .update({
        name,
        code,
        description,
        module,
        action,
        updated_at: new Date().toISOString()
      })
      .eq('id', permissionId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // 记录操作日志
    await createOperationLog('permission_update', '成功', name, request.ip || 'unknown');

    return NextResponse.json({
      success: true,
      permission: updatedPermission
    });
  } catch (error) {
    console.error('更新权限错误:', error);
    return NextResponse.json({ error: '更新权限失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
    const { data: user } = await supabase
      .from('vw_users')
      .select('role')
      .eq('id', decoded.userId)
      .single();

    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: '您没有权限访问此功能' }, { status: 403 });
    }

    // 从URL获取权限ID
    const url = new URL(request.url);
    const permissionId = url.pathname.split('/').pop();
    if (!permissionId) {
      return NextResponse.json({ error: '缺少权限ID' }, { status: 400 });
    }

    // 检查权限是否存在
    const { data: existingPermission } = await supabase
      .from('vw_permissions')
      .select('*')
      .eq('id', permissionId)
      .single();

    if (!existingPermission) {
      return NextResponse.json({ error: '权限不存在' }, { status: 404 });
    }

    // 删除权限
    const { error: deleteError } = await supabase
      .from('vw_permissions')
      .delete()
      .eq('id', permissionId);

    if (deleteError) {
      throw deleteError;
    }

    // 记录操作日志
    await createOperationLog('permission_delete', '成功', existingPermission.name, request.ip || 'unknown');

    return NextResponse.json({
      success: true,
      message: '权限删除成功'
    });
  } catch (error) {
    console.error('删除权限错误:', error);
    return NextResponse.json({ error: '删除权限失败' }, { status: 500 });
  }
}