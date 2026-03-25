import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyJwt } from '@/lib/jwt';

export async function GET(request: NextRequest, { params }: { params: { roleId: string } }) {
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

    const roleId = params.roleId;
    if (!roleId) {
      return NextResponse.json({ error: '角色ID不能为空' }, { status: 400 });
    }

    // 获取角色授权的菜单
    const { data: roleMenus, error } = await supabase
      .from('vw_role_menus')
      .select('menu_id')
      .eq('role_id', roleId);

    if (error) {
      throw error;
    }

    const menuIds = roleMenus.map((rm: any) => rm.menu_id);

    return NextResponse.json({ success: true, data: menuIds });
  } catch (error) {
    console.error('获取角色菜单错误:', error);
    return NextResponse.json({ error: '获取角色菜单失败' }, { status: 500 });
  }
}
