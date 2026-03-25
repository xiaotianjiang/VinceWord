import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyJwt } from '@/lib/jwt';

// 从请求头获取用户信息
async function getUserFromRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const decoded = verifyJwt(token);
  if (!decoded) {
    return null;
  }

  // 获取用户信息
  const { data: user } = await supabase
    .from('vw_users')
    .select('*')
    .eq('id', decoded.userId)
    .single();

  if (!user) {
    return null;
  }

  // 获取用户角色
  const { data: userRoles } = await supabase
    .from('vw_user_roles')
    .select('role_id')
    .eq('user_id', user.id);

  if (userRoles) {
    const roleIds = userRoles.map(ur => ur.role_id);
    const { data: roles } = await supabase
      .from('vw_roles')
      .select('*')
      .in('id', roleIds);

    user.roles = roles || [];
  }

  return user;
}

// 创建日记本
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { name, permission } = await request.json();

    if (!name || !permission) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tool_datenote_diaries')
      .insert({
        user_id: user.id,
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
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 查询用户创建的日记本
    const { data: userDiaries, error: userDiariesError } = await supabase
      .from('tool_datenote_diaries')
      .select('*')
      .eq('user_id', user.id);

    if (userDiariesError) {
      console.error('查询用户日记本失败:', userDiariesError);
      return NextResponse.json({ error: '查询日记本失败' }, { status: 500 });
    }

    // 查询用户被邀请的日记本
    const { data: sharedDiaries, error: sharedDiariesError } = await supabase
      .from('tool_datenote_shares')
      .select('tool_datenote_diaries(*)')
      .eq('share_user_id', user.id)
      .eq('status', 'accepted');

    if (sharedDiariesError) {
      console.error('查询共享日记本失败:', sharedDiariesError);
      return NextResponse.json({ error: '查询日记本失败' }, { status: 500 });
    }

    const sharedDiaryList = sharedDiaries.map((share: any) => share.tool_datenote_diaries);
    const allDiaries = [...(userDiaries || []), ...sharedDiaryList];

    return NextResponse.json({ success: true, data: allDiaries });
  } catch (error) {
    console.error('获取日记本列表错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

// 删除日记本
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const diaryId = searchParams.get('diaryId');

    if (!diaryId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 验证用户是否是日记本的创建者
    const { data: diary, error: diaryError } = await supabase
      .from('tool_datenote_diaries')
      .select('*')
      .eq('id', diaryId)
      .single();

    if (diaryError) {
      console.error('查询日记本失败:', diaryError);
      return NextResponse.json({ error: '查询日记本失败' }, { status: 500 });
    }

    if (diary.user_id !== user.id) {
      return NextResponse.json({ error: '只有创建者可以删除日记本' }, { status: 403 });
    }

    // 开始事务
    const client = supabase;

    // 删除该日记本的所有共享记录
    const { error: shareError } = await client
      .from('tool_datenote_shares')
      .delete()
      .eq('diary_id', diaryId);

    if (shareError) {
      console.error('删除共享记录失败:', shareError);
      return NextResponse.json({ error: '删除共享记录失败' }, { status: 500 });
    }

    // 删除该日记本的所有日记
    const { error: entryError } = await client
      .from('tool_datenote_entries')
      .delete()
      .eq('diary_id', diaryId);

    if (entryError) {
      console.error('删除日记失败:', entryError);
      return NextResponse.json({ error: '删除日记失败' }, { status: 500 });
    }

    // 删除日记本
    const { error: deleteError } = await client
      .from('tool_datenote_diaries')
      .delete()
      .eq('id', diaryId);

    if (deleteError) {
      console.error('删除日记本失败:', deleteError);
      return NextResponse.json({ error: '删除日记本失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除日记本错误:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
