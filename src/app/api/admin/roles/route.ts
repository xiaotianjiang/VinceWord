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
    const userRoleNames = userRolesData.map(role => role.name);

    const urlParts = request.url.split('/');
    const lastPart = urlParts[urlParts.length - 1];

    // 检查是否是获取角色权限的请求
    if (lastPart === 'permissions') {
      const roleId = urlParts[urlParts.length - 2];
      
      if (!roleId) {
        return NextResponse.json({ error: '缺少角色ID' }, { status: 400 });
      }

      // 获取角色权限
      const { data: rolePermissions, error } = await supabase
        .from('vw_role_permissions')
        .select('permission_id')
        .eq('role_id', roleId);

      if (error) {
        throw error;
      }

      // 提取权限ID数组
      const permissionIds = rolePermissions.map((rp: any) => rp.permission_id);

      return NextResponse.json({
        success: true,
        data: permissionIds
      });
    }

    // 原有的获取角色列表逻辑
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    const search = searchParams.get('search') || '';

    let query = supabase
      .from('vw_roles')
      .select('*', { count: 'exact' });

    // 根据用户角色类型过滤角色列表
    if (userRoleTypes.includes('superadmin')) {
      // superadmin可以看到所有角色
    } else if (userRoleTypes.includes('admin')) {
      // admin可以看到自己和自己创建的角色
      // 首先获取当前用户所拥有的admin角色的id
      const { data: adminRoles } = await supabase
        .from('vw_roles')
        .select('id')
        .in('id', roleIds)
        .eq('type', 'admin');
      
      if (adminRoles && adminRoles.length > 0) {
        // 构建OR条件，包含所有admin角色的id和它们创建的角色
        // 对于每个admin角色，添加两个条件：id等于角色id，parent_id等于角色id
        let conditions = '';
        adminRoles.forEach((role, index) => {
          if (index > 0) {
            conditions += ',';
          }
          conditions += `id.eq.${role.id},parent_id.eq.${role.id}`;
        });
        query = query.or(conditions);
      }
    } else {
      // user只能看到自己的角色
      // 首先获取当前用户所拥有的user角色的id
      const { data: userRoles } = await supabase
        .from('vw_roles')
        .select('id')
        .in('id', roleIds)
        .eq('type', 'user');
      
      if (userRoles && userRoles.length > 0) {
        // 构建OR条件，包含所有user角色的id
        const conditions = userRoles.map(role => `id.eq.${role.id}`).join(',');
        query = query.or(conditions);
      }
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }

    const { data: roles, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    // 构建树状结构
    const buildRoleTree = (roles: any[]) => {
      const roleMap: Record<string, any> = {};
      const rootRoles: any[] = [];

      // 先创建所有角色的映射
      roles.forEach(role => {
        roleMap[role.id] = { ...role, children: [] };
      });

      // 构建树状结构
      roles.forEach(role => {
        if (role.parent_id === null) {
          rootRoles.push(roleMap[role.id]);
        } else if (roleMap[role.parent_id]) {
          roleMap[role.parent_id].children.push(roleMap[role.id]);
        } else {
          // 如果parent_id不存在于映射中，将其作为根角色处理
          rootRoles.push(roleMap[role.id]);
        }
      });

      return rootRoles;
    };

    const roleTree = buildRoleTree(roles);

    return NextResponse.json({
      success: true,
      data: roleTree,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('获取角色列表错误:', error);
    return NextResponse.json({ error: '获取角色列表失败' }, { status: 500 });
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
    const { data: userRolesData } = await supabase
      .from('vw_roles')
      .select('name, type')
      .in('id', roleIds);

    if (!userRolesData || !userRolesData.some(role => role.type === 'admin' || role.type === 'superadmin')) {
      return NextResponse.json({ error: '您没有权限访问此功能' }, { status: 403 });
    }

    // 保存用户角色信息，用于后续权限判断
    const userRoleTypes = userRolesData.map(role => role.type);
    const userRoleNames = userRolesData.map(role => role.name);

    const { name, code, description, permissions, type } = await request.json();

    if (!name || !code) {
      return NextResponse.json({ error: '请填写角色名称和代码' }, { status: 400 });
    }

    // 检查角色是否已存在
    const { data: existingRole } = await supabase
      .from('vw_roles')
      .select('*')
      .or(`code.eq.${code},name.eq.${name}`)
      .single();

    if (existingRole) {
      return NextResponse.json({ error: '角色已存在' }, { status: 400 });
    }

    // 根据用户角色类型设置创建角色的type和parent_id
    let roleType = type || 'user';
    let parentId: string | null = null;

    if (userRoleTypes.includes('superadmin')) {
      // superadmin可以创建admin和user类型的角色
      if (roleType !== 'admin' && roleType !== 'user') {
        roleType = 'user';
      }
      // 获取superadmin角色的id作为parent_id
      const { data: superadminRole } = await supabase
        .from('vw_roles')
        .select('id')
        .eq('type', 'superadmin')
        .single();
      if (superadminRole) {
        parentId = superadminRole.id;
      }
    } else if (userRoleTypes.includes('admin')) {
      // admin只能创建user类型的角色
      roleType = 'user';
      // 获取admin角色的id作为parent_id
      const { data: adminRole } = await supabase
        .from('vw_roles')
        .select('id')
        .eq('type', 'admin')
        .single();
      if (adminRole) {
        parentId = adminRole.id;
      }
    } else {
      // user角色不能创建角色
      return NextResponse.json({ error: '您没有权限创建角色' }, { status: 403 });
    }

    // 创建角色
    const { data: newRole, error: insertError } = await supabase
      .from('vw_roles')
      .insert({
        name,
        code,
        description,
        type: roleType,
        parent_id: parentId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // 关联权限
    if (permissions && permissions.length > 0) {
      const rolePermissions = permissions.map((permissionId: string) => ({
        role_id: newRole.id,
        permission_id: permissionId
      }));

      await supabase
        .from('vw_role_permissions')
        .insert(rolePermissions);
    }

    // 记录操作日志
    await createOperationLog('role_create', '成功', name, request.ip || 'unknown');

    return NextResponse.json({
      success: true,
      role: newRole
    });
  } catch (error) {
    console.error('创建角色错误:', error);
    return NextResponse.json({ error: '创建角色失败' }, { status: 500 });
  }
}

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
    const { data: userRolesData } = await supabase
      .from('vw_roles')
      .select('name, type')
      .in('id', roleIds);

    if (!userRolesData || !userRolesData.some(role => role.type === 'admin' || role.type === 'superadmin')) {
      return NextResponse.json({ error: '您没有权限访问此功能' }, { status: 403 });
    }

    // 保存用户角色信息，用于后续权限判断
    const userRoleTypes = userRolesData.map(role => role.type);
    const userRoleNames = userRolesData.map(role => role.name);

    const { name, code, description, permissions } = await request.json();
    const roleId = request.url.split('/').pop();

    if (!roleId) {
      return NextResponse.json({ error: '缺少角色ID' }, { status: 400 });
    }

    if (!name || !code) {
      return NextResponse.json({ error: '请填写角色名称和代码' }, { status: 400 });
    }

    // 检查角色是否存在
    const { data: existingRole } = await supabase
      .from('vw_roles')
      .select('*')
      .eq('id', roleId)
      .single();

    if (!existingRole) {
      return NextResponse.json({ error: '角色不存在' }, { status: 404 });
    }

    // 检查用户是否有权限编辑该角色
    if (!userRoleTypes.includes('superadmin')) {
      if (userRoleTypes.includes('admin')) {
        // admin只能编辑自己创建的角色和user类型的角色
        // 获取当前用户所拥有的admin角色的id
        const { data: adminRoles } = await supabase
          .from('vw_roles')
          .select('id')
          .in('id', roleIds)
          .eq('type', 'admin');
        
        if (adminRoles && adminRoles.length > 0) {
          // 检查角色是否是admin自己或admin创建的角色，且类型为user
          const isAdminRole = adminRoles.some(role => role.id === existingRole.id);
          const isAdminCreatedRole = adminRoles.some(role => role.id === existingRole.parent_id);
          
          if (!isAdminRole && (!isAdminCreatedRole || existingRole.type !== 'user')) {
            return NextResponse.json({ error: '您没有权限编辑该角色' }, { status: 403 });
          }
        } else {
          return NextResponse.json({ error: '您没有权限编辑该角色' }, { status: 403 });
        }
      } else {
        // user角色不能编辑角色
        return NextResponse.json({ error: '您没有权限编辑角色' }, { status: 403 });
      }
    }

    // 检查角色名称和代码是否与其他角色冲突
    const { data: conflictRole } = await supabase
      .from('vw_roles')
      .select('*')
      .or(`code.eq.${code},name.eq.${name}`)
      .neq('id', roleId)
      .single();

    if (conflictRole) {
      return NextResponse.json({ error: '角色名称或代码已被使用' }, { status: 400 });
    }

    // 更新角色
    const { data: updatedRole, error: updateError } = await supabase
      .from('vw_roles')
      .update({
        name,
        code,
        description
      })
      .eq('id', roleId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // 更新权限关联
    if (permissions !== undefined) {
      // 删除原有关联
      await supabase
        .from('vw_role_permissions')
        .delete()
        .eq('role_id', roleId);

      // 添加新关联
      if (permissions.length > 0) {
        const rolePermissions = permissions.map((permissionId: string) => ({
          role_id: roleId,
          permission_id: permissionId
        }));

        await supabase
          .from('vw_role_permissions')
          .insert(rolePermissions);
      }
    }

    // 记录操作日志
    await createOperationLog('role_update', '成功', name, request.ip || 'unknown');

    return NextResponse.json({
      success: true,
      role: updatedRole
    });
  } catch (error) {
    console.error('编辑角色错误:', error);
    return NextResponse.json({ error: '编辑角色失败' }, { status: 500 });
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
    const { data: userRolesData } = await supabase
      .from('vw_roles')
      .select('name, type')
      .in('id', roleIds);

    if (!userRolesData || !userRolesData.some(role => role.type === 'admin' || role.type === 'superadmin')) {
      return NextResponse.json({ error: '您没有权限访问此功能' }, { status: 403 });
    }

    // 保存用户角色信息，用于后续权限判断
    const userRoleTypes = userRolesData.map(role => role.type);
    const userRoleNames = userRolesData.map(role => role.name);

    const roleId = request.url.split('/').pop();

    if (!roleId) {
      return NextResponse.json({ error: '缺少角色ID' }, { status: 400 });
    }

    // 检查角色是否存在
    const { data: existingRole } = await supabase
      .from('vw_roles')
      .select('name, type, parent_id')
      .eq('id', roleId)
      .single();

    if (!existingRole) {
      return NextResponse.json({ error: '角色不存在' }, { status: 404 });
    }

    // 检查用户是否有权限删除该角色
    if (!userRoleTypes.includes('superadmin')) {
      if (userRoleTypes.includes('admin')) {
        // admin只能删除自己创建的角色和user类型的角色
        // 获取当前用户所拥有的admin角色的id
        const { data: adminRoles } = await supabase
          .from('vw_roles')
          .select('id')
          .in('id', roleIds)
          .eq('type', 'admin');
        
        if (adminRoles && adminRoles.length > 0) {
          // 检查角色是否是admin创建的角色，且类型为user
          const isAdminCreatedRole = adminRoles.some(role => role.id === existingRole.parent_id);
          
          if (!isAdminCreatedRole || existingRole.type !== 'user') {
            return NextResponse.json({ error: '您没有权限删除该角色' }, { status: 403 });
          }
        } else {
          return NextResponse.json({ error: '您没有权限删除该角色' }, { status: 403 });
        }
      } else {
        // user角色不能删除角色
        return NextResponse.json({ error: '您没有权限删除角色' }, { status: 403 });
      }
    }

    // 删除角色关联的权限
    await supabase
      .from('vw_role_permissions')
      .delete()
      .eq('role_id', roleId);

    // 删除角色
    const { error: deleteError } = await supabase
      .from('vw_roles')
      .delete()
      .eq('id', roleId);

    if (deleteError) {
      throw deleteError;
    }

    // 记录操作日志
    await createOperationLog('role_delete', '成功', existingRole.name, request.ip || 'unknown');

    return NextResponse.json({
      success: true,
      message: '角色删除成功'
    });
  } catch (error) {
    console.error('删除角色错误:', error);
    return NextResponse.json({ error: '删除角色失败' }, { status: 500 });
  }
}

