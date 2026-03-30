import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * 获取房间列表
 * GET /api/games/digits-collision/rooms
 */
export async function GET() {
  try {
    // 查询房间列表，包括玩家数量
    const { data: rooms, error } = await supabase
      .from('game_dc_rooms')
      .select(`
        *,
        players:game_dc_room_players(count)
      `)
      .in('status', ['waiting', 'playing'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取房间列表错误:', error);
      return NextResponse.json(
        { error: '获取房间列表失败' },
        { status: 500 }
      );
    }

    // 获取房主用户名
    const hostIds = rooms?.map((room) => room.host_id) || [];
    const { data: users } = await supabase
      .from('vw_user')
      .select('id, username')
      .in('id', hostIds);

    const userMap = new Map(users?.map((u) => [u.id, u.username]) || []);

    // 格式化房间数据
    const formattedRooms = rooms?.map((room) => ({
      ...room,
      player_count: room.players?.[0]?.count || 0,
      host_username: userMap.get(room.host_id) || room.host_id,
    }));

    return NextResponse.json({ rooms: formattedRooms || [] });
  } catch (error) {
    console.error('获取房间列表异常:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

/**
 * 创建房间
 * POST /api/games/digits-collision/rooms
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, host_id, digit_count = 4, can_spectate = true } = body;

    // 验证必填字段
    if (!name || !host_id) {
      return NextResponse.json(
        { error: '缺少必填字段: name, host_id' },
        { status: 400 }
      );
    }

    // 验证房间名称
    if (name.length > 50) {
      return NextResponse.json(
        { error: '房间名称不能超过50个字符' },
        { status: 400 }
      );
    }

    const validRoomNamePattern = /^[a-zA-Z0-9\u4e00-\u9fa5\s_\-]+$/;
    if (!validRoomNamePattern.test(name)) {
      return NextResponse.json(
        { error: '房间名称只能包含字母、数字、中文、空格、下划线和连字符' },
        { status: 400 }
      );
    }

    // 验证数字位数
    if (![4, 5, 6].includes(digit_count)) {
      return NextResponse.json(
        { error: '数字位数必须是4、5或6' },
        { status: 400 }
      );
    }

    // 开始事务：创建房间并添加房主
    const { data: room, error: roomError } = await supabase
      .from('game_dc_rooms')
      .insert({
        name: name.trim(),
        host_id,
        status: 'waiting',
        digit_count,
        can_spectate,
      })
      .select()
      .single();

    if (roomError) {
      console.error('创建房间错误:', roomError);
      return NextResponse.json(
        { error: '创建房间失败' },
        { status: 500 }
      );
    }

    // 添加房主到房间玩家表
    const { error: playerError } = await supabase
      .from('game_dc_room_players')
      .insert({
        room_id: room.id,
        player_id: host_id,
        seat: 1,
        is_ready: false,
      });

    if (playerError) {
      console.error('添加房主错误:', playerError);
      // 回滚：删除刚创建的房间
      await supabase.from('game_dc_rooms').delete().eq('id', room.id);
      return NextResponse.json(
        { error: '添加房主失败' },
        { status: 500 }
      );
    }

    // 广播房间更新事件
    const { broadcastToRoom } = await import('../../../sse/route');
    await broadcastToRoom(room.id, 'room_updated', {
      type: 'room_created',
      room,
    });

    return NextResponse.json({ room });
  } catch (error) {
    console.error('创建房间异常:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
