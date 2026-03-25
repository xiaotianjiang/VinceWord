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
    const type = searchParams.get('type');

    // 如果是获取下拉选项
    if (type === 'options') {
      // 获取所有菜单
      const { data: menus, error } = await supabase
        .from('vw_menus')
        .select('id, name, parent_id')
        .order('order', { ascending: true });

      if (error) {
        throw error;
      }

      // 转换数据格式
      const menuOptions = menus.map(menu => ({
        value: menu.id,
        label: menu.name
      }));

      // 获取所有权限
      const { data: permissions, error: permError } = await supabase
        .from('vw_permissions')
        .select('code, name')
        .order('created_at', { ascending: true });

      if (permError) {
        throw permError;
      }

      const permissionOptions = permissions.map(perm => ({
        value: perm.code,
        label: perm.name
      }));

      return NextResponse.json({
        success: true,
        menuOptions,
        permissionOptions
      });
    }

    // 原有逻辑：获取菜单列表
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    const search = searchParams.get('search') || '';

    let query = supabase
      .from('vw_menus')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,path.ilike.%${search}%`);
    }

    const { data: menus, error, count } = await query
      .order('order', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // 转换数据格式以匹配前端期望
    const formattedMenus = menus.map(menu => ({
      ...menu,
      sort: menu.order, // 将数据库的order字段映射为前端的sort字段
      status: menu.status === 'enabled' ? 'active' : 'inactive' // 转换状态值
    }));

    return NextResponse.json({
      success: true,
      data: formattedMenus,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('获取菜单列表错误:', error);
    return NextResponse.json({ error: '获取菜单列表失败' }, { status: 500 });
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
    const { data: user } = await supabase
      .from('vw_users')
      .select('role')
      .eq('id', decoded.userId)
      .single();

    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: '您没有权限访问此功能' }, { status: 403 });
    }

    const { name, path, icon, parent_id, sort, status, access_level } = await request.json();
    
    // 处理parent_id为空字符串的情况
    const processedParentId = parent_id === '' ? null : parent_id;

    if (!name || !path) {
      return NextResponse.json({ error: '请填写菜单名称和路径' }, { status: 400 });
    }

    // 检查菜单是否已存在
    const { data: existingMenu } = await supabase
      .from('vw_menus')
      .select('*')
      .eq('path', path)
      .single();

    if (existingMenu) {
      return NextResponse.json({ error: '菜单已存在' }, { status: 400 });
    }

    // 创建菜单
    const { data: newMenu, error: insertError } = await supabase
      .from('vw_menus')
      .insert({
        name,
        path,
        icon,
        parent_id: processedParentId,
        "order": sort,
        status: status || 'enabled',
        access_level: access_level || 'use',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // 转换数据格式以匹配前端期望
    const formattedMenu = {
      ...newMenu,
      sort: newMenu.order, // 将数据库的order字段映射为前端的sort字段
      status: newMenu.status === 'enabled' ? 'active' : 'inactive' // 转换状态值
    };

    // 记录操作日志
    await createOperationLog('menu_create', '成功', name, request.ip || 'unknown');

    return NextResponse.json({
      success: true,
      menu: formattedMenu
    });
  } catch (error) {
    console.error('创建菜单错误:', error);
    return NextResponse.json({ error: '创建菜单失败' }, { status: 500 });
  }
}


