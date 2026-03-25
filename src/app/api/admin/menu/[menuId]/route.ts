import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createOperationLog } from '@/lib/operation-log';
import { verifyJwt } from '@/lib/jwt';

export async function PUT(request: NextRequest, { params }: { params: { menuId: string } }) {
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
    const { data: user } = await supabase
      .from('vw_users')
      .select('role')
      .eq('id', decoded.userId)
      .single();

    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: '您没有权限访问此功能' }, { status: 403 });
    }

    const menuId = params.menuId;
    if (!menuId) {
      return NextResponse.json({ error: '缺少菜单ID' }, { status: 400 });
    }

    const { name, path, icon, parent_id, sort, status, access_level } = await request.json();
    
    // 处理parent_id为空字符串的情况
    const processedParentId = parent_id === '' ? null : parent_id;

    if (!name || !path) {
      return NextResponse.json({ error: '请填写菜单名称和路径' }, { status: 400 });
    }

    // 检查菜单是否存在
    const { data: existingMenu } = await supabase
      .from('vw_menus')
      .select('*')
      .eq('id', menuId)
      .single();

    if (!existingMenu) {
      return NextResponse.json({ error: '菜单不存在' }, { status: 404 });
    }

    // 检查路径是否被其他菜单使用
    const { data: conflictingMenu } = await supabase
      .from('vw_menus')
      .select('*')
      .eq('path', path)
      .neq('id', menuId)
      .single();

    if (conflictingMenu) {
      return NextResponse.json({ error: '路径已被使用' }, { status: 400 });
    }

    // 准备更新数据
    const updateData: any = {
      name,
      path,
      icon,
      parent_id: processedParentId,
      "order": sort,
      status: status === 'active' ? 'enabled' : 'disabled',
      access_level,
      updated_at: new Date().toISOString()
    };

    // 更新菜单
    const { data: updatedMenu, error: updateError } = await supabase
      .from('vw_menus')
      .update(updateData)
      .eq('id', menuId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // 转换数据格式以匹配前端期望
    const formattedMenu = {
      ...updatedMenu,
      sort: updatedMenu.order, // 将数据库的order字段映射为前端的sort字段
      status: updatedMenu.status === 'enabled' ? 'active' : 'inactive' // 转换状态值
    };

    // 记录操作日志
    await createOperationLog('menu_update', '成功', name, request.ip || 'unknown');

    return NextResponse.json({
      success: true,
      menu: formattedMenu
    });
  } catch (error) {
    console.error('更新菜单错误:', error);
    return NextResponse.json({ error: '更新菜单失败' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { menuId: string } }) {
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
    const { data: user } = await supabase
      .from('vw_users')
      .select('role')
      .eq('id', decoded.userId)
      .single();

    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: '您没有权限访问此功能' }, { status: 403 });
    }

    const menuId = params.menuId;
    if (!menuId) {
      return NextResponse.json({ error: '缺少菜单ID' }, { status: 400 });
    }

    // 检查菜单是否存在
    const { data: existingMenu } = await supabase
      .from('vw_menus')
      .select('*')
      .eq('id', menuId)
      .single();

    if (!existingMenu) {
      return NextResponse.json({ error: '菜单不存在' }, { status: 404 });
    }

    // 检查是否有子菜单
    const { data: childMenus } = await supabase
      .from('vw_menus')
      .select('id')
      .eq('parent_id', menuId);

    if (childMenus && childMenus.length > 0) {
      return NextResponse.json({ error: '该菜单下有子菜单，无法删除' }, { status: 400 });
    }

    // 删除菜单
    const { error: deleteError } = await supabase
      .from('vw_menus')
      .delete()
      .eq('id', menuId);

    if (deleteError) {
      throw deleteError;
    }

    // 记录操作日志
    await createOperationLog('menu_delete', '成功', existingMenu.name, request.ip || 'unknown');

    return NextResponse.json({
      success: true,
      message: '菜单删除成功'
    });
  } catch (error) {
    console.error('删除菜单错误:', error);
    return NextResponse.json({ error: '删除菜单失败' }, { status: 500 });
  }
}
