import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyJwt } from '@/lib/jwt';

// 验证用户并获取用户ID
async function verifyUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const decoded = verifyJwt(token);
  if (!decoded) {
    return null;
  }

  // 只需要验证用户是否存在，不需要获取完整信息
  const { data: user } = await supabase
    .from('vw_users')
    .select('id')
    .eq('id', decoded.userId)
    .single();

  return user?.id;
}

// 邀请用户
export async function POST(request: NextRequest) {
  try {
    const userId = await verifyUser(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { diaryId, userId: shareUserId } = await request.json();

    if (!diaryId || !shareUserId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 并行执行验证操作
    const [diaryResult, existingShareResult] = await Promise.all([
      // 验证日记本是否存在且属于当前用户（只查询必要字段）
      supabase
        .from('tool_datenote_diaries')
        .select('id')
        .eq('id', diaryId)
        .eq('user_id', userId)
        .single(),
      
      // 检查是否已经邀请过该用户（只检查待处理或已接受的邀请）
      supabase
        .from('tool_datenote_shares')
        .select('id')
        .eq('diary_id', diaryId)
        .eq('share_user_id', shareUserId)
        .in('status', ['pending', 'accepted'])
        .single()
    ]);

    if (diaryResult.error || !diaryResult.data) {
      return NextResponse.json({ error: '日记本不存在或您没有权限' }, { status: 403 });
    }

    if (!existingShareResult.error && existingShareResult.data) {
      return NextResponse.json({ error: '已经邀请过该用户' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tool_datenote_shares')
      .insert({
        diary_id: diaryId,
        user_id: userId,
        share_user_id: shareUserId,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('邀请用户失败:', error);
      return NextResponse.json({ error: '邀请用户失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('邀请用户错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 获取邀请列表
export async function GET(request: NextRequest) {
  try {
    const userId = await verifyUser(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const diaryId = searchParams.get('diaryId');

    // 明确指定关系，避免多关系冲突
    let query = supabase
      .from('tool_datenote_shares')
      .select(`
        id,
        diary_id,
        user_id,
        share_user_id,
        status,
        created_at,
        updated_at,
        tool_datenote_diaries(name),
        inviter:vw_users!tool_datenote_shares_user_id_fkey(username),
        share_user:vw_users!tool_datenote_shares_share_user_id_fkey(username)
      `);

    if (diaryId) {
      // 验证日记本是否属于当前用户（只查询必要字段）
      const { data: diary, error: diaryError } = await supabase
        .from('tool_datenote_diaries')
        .select('id')
        .eq('id', diaryId)
        .eq('user_id', userId)
        .single();

      if (diaryError || !diary) {
        return NextResponse.json({ error: '日记本不存在或您没有权限' }, { status: 403 });
      }

      // 获取该日记本的所有邀请
      query = query.eq('diary_id', diaryId);
    } else {
      // 获取用户收到的邀请
      query = query.eq('share_user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('查询邀请失败:', error);
      return NextResponse.json({ error: '查询邀请失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('获取邀请列表错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 处理邀请（接受/拒绝）
export async function PUT(request: NextRequest) {
  try {
    const userId = await verifyUser(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { inviteId, status } = await request.json();

    if (!inviteId || !status) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    if (!['accepted', 'rejected'].includes(status)) {
      return NextResponse.json({ error: '无效的状态' }, { status: 400 });
    }

    // 验证邀请是否存在且属于当前用户（只查询必要字段）
    const { data: invite, error: inviteError } = await supabase
      .from('tool_datenote_shares')
      .select('status')
      .eq('id', inviteId)
      .eq('share_user_id', userId)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: '邀请不存在或您没有权限' }, { status: 403 });
    }

    // 验证邀请是否为待处理状态
    if (invite.status !== 'pending') {
      return NextResponse.json({ error: '邀请已处理' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tool_datenote_shares')
      .update({ status })
      .eq('id', inviteId)
      .select()
      .single();

    if (error) {
      console.error('处理邀请失败:', error);
      return NextResponse.json({ error: '处理邀请失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('处理邀请错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 取消邀请（更新状态为cancel）
export async function DELETE(request: NextRequest) {
  try {
    const userId = await verifyUser(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get('inviteId');

    if (!inviteId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 验证邀请是否存在且当前用户是邀请人（只查询必要字段）
    const { data: invite, error: inviteError } = await supabase
      .from('tool_datenote_shares')
      .select('status')
      .eq('id', inviteId)
      .eq('user_id', userId)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: '邀请不存在或您没有权限' }, { status: 403 });
    }

    // 验证邀请是否为待处理状态
    if (invite.status !== 'pending') {
      return NextResponse.json({ error: '只能取消待处理的邀请' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tool_datenote_shares')
      .update({ status: 'cancel' })
      .eq('id', inviteId)
      .select()
      .single();

    if (error) {
      console.error('取消邀请失败:', error);
      return NextResponse.json({ error: '取消邀请失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('取消邀请错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
