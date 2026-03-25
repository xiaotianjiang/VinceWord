import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyJwt } from '@/lib/jwt';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: roleId } = params;
    
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
  } catch (error) {
    console.error('获取角色权限错误:', error);
    return NextResponse.json({ error: '获取角色权限失败' }, { status: 500 });
  }
}
