import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyJwt } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    // 从请求头获取token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '缺少认证令牌' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
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
      .select('type')
      .in('id', roleIds);

    if (!roles || !roles.some(role => role.type === 'admin' || role.type === 'superadmin')) {
      return NextResponse.json({ error: '您没有权限访问此功能' }, { status: 403 });
    }

    const { roleId, menuIds } = await request.json();

    if (!roleId || !Array.isArray(menuIds)) {
      return NextResponse.json({ error: '角色ID和菜单ID列表不能为空' }, { status: 400 });
    }

    // 先删除角色的所有菜单授权
    await supabase
      .from('vw_role_menus')
      .delete()
      .eq('role_id', roleId);

    // 重新授权菜单
    if (menuIds.length > 0) {
      const roleMenuData = menuIds.map((menuId: string) => ({
        role_id: roleId,
        menu_id: menuId
      }));

      const { error } = await supabase
        .from('vw_role_menus')
        .insert(roleMenuData);

      if (error) {
        throw error;
      }
    }

    return NextResponse.json({ success: true, message: '菜单授权成功' });
  } catch (error) {
    console.error('保存角色菜单错误:', error);
    return NextResponse.json({ error: '保存角色菜单失败' }, { status: 500 });
  }
}
