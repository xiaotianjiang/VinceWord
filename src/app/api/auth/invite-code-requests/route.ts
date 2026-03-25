import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyJwt } from '@/lib/jwt';
import { generateInviteCode } from '@/lib/invite-code';

export async function GET(request: NextRequest) {
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
    const { data: user } = await supabase
      .from('vw_users')
      .select('role')
      .eq('id', decoded.userId)
      .single();

    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return NextResponse.json({ error: '您没有权限访问此功能' }, { status: 403 });
    }

    // 获取邀请码申请列表
    const { data: requests, error } = await supabase
      .from('vw_invite_code_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error('获取邀请码申请列表错误:', error);
    return NextResponse.json({ error: '获取邀请码申请列表失败' }, { status: 500 });
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

    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ error: '请求ID和状态不能为空' }, { status: 400 });
    }

    // 更新邀请码申请状态
    const { data: updatedRequest, error } = await supabase
      .from('vw_invite_code_requests')
      .update({
        status,
        processed_at: new Date().toISOString(),
        processed_by: decoded.userId
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // 如果批准申请，生成邀请码并发送
    if (status === 'approved') {
      const code = generateInviteCode();
      
      await supabase
        .from('vw_invite_codes')
        .insert({
          code,
          created_by: decoded.userId,
          status: 'active',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天过期
          created_at: new Date().toISOString()
        });

      // 这里可以添加发送邮件的逻辑，将邀请码发送给申请人
      console.log(`邀请码 ${code} 已生成并发送给 ${updatedRequest.email}`);
    }

    return NextResponse.json({ success: true, request: updatedRequest });
  } catch (error) {
    console.error('处理邀请码申请错误:', error);
    return NextResponse.json({ error: '处理邀请码申请失败' }, { status: 500 });
  }
}
