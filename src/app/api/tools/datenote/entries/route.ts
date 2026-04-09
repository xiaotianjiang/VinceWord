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

// 创建日记
export async function POST(request: NextRequest) {
  try {
    const userId = await verifyUser(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { diaryId, description, startTime, endTime, icon, color } = await request.json();

    if (!diaryId || !startTime || !icon || !color) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 验证时间段是否超过24小时
    if (endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      if (diffHours > 24) {
        return NextResponse.json({ error: '时间段不能超过24小时' }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from('tool_datenote_entries')
      .insert({
        diary_id: diaryId,
        user_id: userId,
        description,
        start_time: startTime,
        end_time: endTime,
        icon,
        color
      })
      .select()
      .single();

    if (error) {
      console.error('创建日记失败:', error);
      return NextResponse.json({ error: '创建日记失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('创建日记错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 获取日记列表
export async function GET(request: NextRequest) {
  try {
    const userId = await verifyUser(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const diaryId = searchParams.get('diaryId');

    let query = supabase
      .from('tool_datenote_entries')
      .select('*');

    if (diaryId) {
      query = query.eq('diary_id', diaryId);
    } else {
      // 并行查询用户有权访问的所有日记ID
      const [userDiariesResult, sharedDiariesResult] = await Promise.all([
        // 查询用户自己创建的日记本
        supabase
          .from('tool_datenote_diaries')
          .select('id')
          .eq('user_id', userId),
        
        // 查询用户被邀请的日记本
        supabase
          .from('tool_datenote_shares')
          .select('diary_id')
          .eq('share_user_id', userId)
          .eq('status', 'accepted')
      ]);

      if (userDiariesResult.error) {
        console.error('查询用户日记本失败:', userDiariesResult.error);
        return NextResponse.json({ error: '查询日记失败' }, { status: 500 });
      }

      if (sharedDiariesResult.error) {
        console.error('查询共享日记本失败:', sharedDiariesResult.error);
        return NextResponse.json({ error: '查询日记失败' }, { status: 500 });
      }

      const userDiaryIds = (userDiariesResult.data || []).map((diary: any) => diary.id);
      const sharedDiaryIds = (sharedDiariesResult.data || []).map((share: any) => share.diary_id);
      const allDiaryIds = [...userDiaryIds, ...sharedDiaryIds];

      if (allDiaryIds.length > 0) {
        query = query.in('diary_id', allDiaryIds);
      } else {
        return NextResponse.json({ success: true, data: [] });
      }
    }

    const { data, error } = await query.order('start_time', { ascending: false });

    if (error) {
      console.error('查询日记失败:', error);
      return NextResponse.json({ error: '查询日记失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('获取日记列表错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 删除日记
export async function DELETE(request: NextRequest) {
  try {
    const userId = await verifyUser(request);
    if (!userId) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get('entryId');

    if (!entryId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 验证用户是否是日记的创建者（只查询必要字段）
    const { data: entry, error: entryError } = await supabase
      .from('tool_datenote_entries')
      .select('user_id')
      .eq('id', entryId)
      .single();

    if (entryError) {
      console.error('查询日记失败:', entryError);
      return NextResponse.json({ error: '查询日记失败' }, { status: 500 });
    }

    if (entry.user_id !== userId) {
      return NextResponse.json({ error: '只有创建者可以删除日记' }, { status: 403 });
    }

    // 删除日记
    const { error: deleteError } = await supabase
      .from('tool_datenote_entries')
      .delete()
      .eq('id', entryId);

    if (deleteError) {
      console.error('删除日记失败:', deleteError);
      return NextResponse.json({ error: '删除日记失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除日记错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
