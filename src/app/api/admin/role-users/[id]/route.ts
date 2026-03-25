import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyJwt } from '@/lib/jwt';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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
    
    // 解析ID参数（格式：userId-roleId）
    const id = params.id;
    const [userId, roleId] = id.split('-');
    
    if (!userId || !roleId) {
      return NextResponse.json({ error: '无效的ID格式' }, { status: 400 });
    }
    
    // 删除角色用户关联
    const { error } = await supabase
      .from('vw_user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId);
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({
      success: true,
      message: '角色用户关联删除成功'
    });
  } catch (error) {
    console.error('删除角色用户关联错误:', error);
    return NextResponse.json({ error: '删除角色用户关联失败' }, { status: 500 });
  }
}
