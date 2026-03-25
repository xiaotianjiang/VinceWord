import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyJwt } from '@/lib/jwt';

export async function GET(request: NextRequest) {
  try {
    // 验证token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    
    const decoded = verifyJwt(token);
    if (!decoded) {
      return NextResponse.json({ error: '无效的token' }, { status: 401 });
    }
    
    // 获取用户角色信息
    const { data: userRoles } = await supabase
      .from('vw_user_roles')
      .select('role_id')
      .eq('user_id', decoded.userId);
    
    if (!userRoles || userRoles.length === 0) {
      return NextResponse.json({ error: '您没有权限访问此功能' }, { status: 403 });
    }
    
    // 获取角色信息
    const roleIds = userRoles.map(ur => ur.role_id);
    const { data: userRolesData } = await supabase
      .from('vw_roles')
      .select('name, type')
      .in('id', roleIds);
    
    if (!userRolesData || !userRolesData.some(role => role.type === 'admin' || role.type === 'superadmin')) {
      return NextResponse.json({ error: '您没有权限访问此功能' }, { status: 403 });
    }
    
    // 保存用户角色信息，用于后续权限判断
    const userRoleTypes = userRolesData.map(role => role.type);
    
    // 获取查询参数
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const search = url.searchParams.get('search') || '';
    
    // 计算偏移量
    const offset = (page - 1) * limit;
    
    // 构建查询
    let query = supabase
      .from('vw_user_roles')
      .select(`
        *,
        vw_users(id, usercode, username, email, phone, role, status, last_login, created_at),
        vw_roles(id, name, description, is_system, type, parent_id)
      `)
      .order('created_at', { ascending: false });
    
    // 根据用户角色类型过滤角色用户列表
    if (userRoleTypes.includes('superadmin')) {
      // superadmin可以看到所有角色用户
    } else if (userRoleTypes.includes('admin')) {
      // admin可以看到角色id是自己和角色parent_id是自己的角色用户
      // 首先获取当前用户所拥有的admin角色的id
      const { data: adminRoles } = await supabase
        .from('vw_roles')
        .select('id')
        .in('id', roleIds)
        .eq('type', 'admin');
      
      if (adminRoles && adminRoles.length > 0) {
        // 获取所有相关的角色ID（包括admin角色本身和其子角色）
        const adminRoleIds = adminRoles.map(role => role.id);
        
        // 获取所有parent_id是admin角色的角色
        const { data: childRoles } = await supabase
          .from('vw_roles')
          .select('id')
          .in('parent_id', adminRoleIds);
        
        // 合并所有相关角色ID
        const allRoleIds = [...adminRoleIds];
        if (childRoles && childRoles.length > 0) {
          childRoles.forEach(role => allRoleIds.push(role.id));
        }
        
        // 构建查询条件
        if (allRoleIds.length > 0) {
          query = query.in('role_id', allRoleIds);
        }
      }
    }
    
    // 如果有搜索参数，添加搜索条件
    if (search) {
      query = query.or(`
        vw_users.username.ilike.%${search}%,
        vw_users.email.ilike.%${search}%,
        vw_roles.name.ilike.%${search}%
      `);
    }
    
    // 添加分页
    query = query.range(offset, offset + limit - 1);
    
    // 执行查询
    const { data: roleUsers, error, count } = await query;
    
    if (error) {
      throw error;
    }
    
    // 转换数据格式
    const formattedRoleUsers = roleUsers.map((ru: any) => ({
      id: `${ru.user_id}-${ru.role_id}`, // 组合ID
      user_id: ru.user_id,
      role_id: ru.role_id,
      user: ru.vw_users,
      role: ru.vw_roles,
      created_at: ru.created_at
    }));
    
    // 计算总页数
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);
    
    return NextResponse.json({
      success: true,
      data: formattedRoleUsers,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    });
  } catch (error) {
    console.error('获取角色用户列表错误:', error);
    return NextResponse.json({ error: '获取角色用户列表失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // 验证token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    
    const decoded = verifyJwt(token);
    if (!decoded) {
      return NextResponse.json({ error: '无效的token' }, { status: 401 });
    }
    
    // 解析请求体
    const body = await request.json();
    const { roleId, userId } = body;
    
    if (!roleId || !userId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }
    
    // 检查是否已存在
    const { data: existing } = await supabase
      .from('vw_user_roles')
      .select('*')
      .eq('user_id', userId)
      .eq('role_id', roleId)
      .single();
    
    if (existing) {
      return NextResponse.json({ error: '角色用户关联已存在' }, { status: 400 });
    }
    
    // 创建角色用户关联
    const { error } = await supabase
      .from('vw_user_roles')
      .insert({
        user_id: userId,
        role_id: roleId
      });
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      success: true,
      message: '角色用户关联创建成功'
    });
  } catch (error) {
    console.error('创建角色用户关联错误:', error);
    return NextResponse.json({ error: '创建角色用户关联失败' }, { status: 500 });
  }
}
