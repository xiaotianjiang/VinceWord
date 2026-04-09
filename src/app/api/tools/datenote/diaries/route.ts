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

// 创建日记本
export async function POST(request: NextRequest) {
  try {
    const userId = await verifyUser(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { name, permission } = await request.json();

    if (!name || !permission) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tool_datenote_diaries')
      .insert({
        user_id: userId,
        name,
        permission
      })
      .select()
      .single();

    if (error) {
      console.error('创建日记本失败:', error);
      return NextResponse.json({ error: '创建日记本失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('创建日记本错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 获取日记本列表
export async function GET(request: NextRequest) {
  try {
    const userId = await verifyUser(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 并行查询用户创建的和共享的日记本
    const [userDiariesResult, sharedDiariesResult] = await Promise.all([
      // 查询用户创建的日记本
      supabase
        .from('tool_datenote_diaries')
        .select('*')
        .eq('user_id', userId),
      
      // 查询用户被邀请的日记本
      supabase
        .from('tool_datenote_shares')
        .select('tool_datenote_diaries(*)')
        .eq('share_user_id', userId)
        .eq('status', 'accepted')
    ]);

    if (userDiariesResult.error) {
      console.error('查询用户日记本失败:', userDiariesResult.error);
      return NextResponse.json({ error: '查询日记本失败' }, { status: 500 });
    }

    if (sharedDiariesResult.error) {
      console.error('查询共享日记本失败:', sharedDiariesResult.error);
      return NextResponse.json({ error: '查询日记本失败' }, { status: 500 });
    }

    const sharedDiaryList = (sharedDiariesResult.data || []).map((share: any) => share.tool_datenote_diaries);
    const allDiaries = [...(userDiariesResult.data || []), ...sharedDiaryList];

    return NextResponse.json({ success: true, data: allDiaries });
  } catch (error) {
    console.error('获取日记本列表错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 删除日记本
export async function DELETE(request: NextRequest) {
  try {
    const userId = await verifyUser(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const diaryId = searchParams.get('diaryId');

    if (!diaryId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 验证用户是否是日记本的创建者（只查询必要字段）
    const { data: diary, error: diaryError } = await supabase
      .from('tool_datenote_diaries')
      .select('user_id')
      .eq('id', diaryId)
      .single();

    if (diaryError) {
      console.error('查询日记本失败:', diaryError);
      return NextResponse.json({ error: '查询日记本失败' }, { status: 500 });
    }

    if (diary.user_id !== userId) {
      return NextResponse.json({ error: '只有创建者可以删除日记本' }, { status: 403 });
    }

    // 并行执行删除操作
    const [shareResult, entryResult, diaryResult] = await Promise.all([
      // 删除该日记本的所有共享记录
      supabase
        .from('tool_datenote_shares')
        .delete()
        .eq('diary_id', diaryId),
      
      // 删除该日记本的所有日记
      supabase
        .from('tool_datenote_entries')
        .delete()
        .eq('diary_id', diaryId),
      
      // 删除日记本
      supabase
        .from('tool_datenote_diaries')
        .delete()
        .eq('id', diaryId)
    ]);

    if (shareResult.error) {
      console.error('删除共享记录失败:', shareResult.error);
      return NextResponse.json({ error: '删除共享记录失败' }, { status: 500 });
    }

    if (entryResult.error) {
      console.error('删除日记失败:', entryResult.error);
      return NextResponse.json({ error: '删除日记失败' }, { status: 500 });
    }

    if (diaryResult.error) {
      console.error('删除日记本失败:', diaryResult.error);
      return NextResponse.json({ error: '删除日记本失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除日记本错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
