import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * 获取房间详情
 * GET /api/games/digits-collision/rooms/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = parseInt(params.id, 10);

    if (isNaN(roomId)) {
      return NextResponse.json(
        { error: '无效的房间ID' },
        { status: 400 }
      );
    }

    // 查询房间信息
    const { data: room, error: roomError } = await supabase
      .from('game_dc_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: '房间不存在' },
        { status: 404 }
      );
    }

    // 查询房间内的玩家
    const { data: players, error: playersError } = await supabase
      .from('game_dc_room_players')
      .select('*')
      .eq('room_id', roomId)
      .is('left_at', null)
      .order('seat', { ascending: true });

    if (playersError) {
      console.error('获取玩家列表错误:', playersError);
      return NextResponse.json(
        { error: '获取玩家列表失败' },
        { status: 500 }
      );
    }

    // 获取玩家用户名
    const playerIds = players?.map((p) => p.player_id) || [];
    const { data: users } = await supabase
      .from('vw_user')
      .select('id, username')
      .in('id', playerIds);

    const userMap = new Map(users?.map((u) => [u.id, u.username]) || []);

    // 格式化玩家数据
    const formattedPlayers = players?.map((player) => ({
      ...player,
      username: userMap.get(player.player_id) || player.player_id,
    }));

    // 查询当前游戏（如果有）
    const { data: game } = await supabase
      .from('game_dc_games')
      .select('*')
      .eq('room_id', roomId)
      .eq('status', 'playing')
      .maybeSingle();

    return NextResponse.json({
      room,
      players: formattedPlayers || [],
      game,
    });
  } catch (error) {
    console.error('获取房间详情异常:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
