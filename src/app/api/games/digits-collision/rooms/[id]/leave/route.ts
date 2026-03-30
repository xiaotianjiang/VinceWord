import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * 离开房间
 * POST /api/games/digits-collision/rooms/[id]/leave
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = parseInt(params.id, 10);
    const body = await request.json();
    const { player_id } = body;

    if (isNaN(roomId)) {
      return NextResponse.json({ error: '无效的房间ID' }, { status: 400 });
    }

    if (!player_id) {
      return NextResponse.json({ error: '缺少 player_id' }, { status: 400 });
    }

    // 查询玩家当前状态
    const { data: player, error: playerError } = await supabase
      .from('game_dc_room_players')
      .select('*')
      .eq('room_id', roomId)
      .eq('player_id', player_id)
      .is('left_at', null)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: '玩家不在房间中' }, { status: 404 });
    }

    // 更新离开时间
    const { error: updateError } = await supabase
      .from('game_dc_room_players')
      .update({ left_at: new Date().toISOString() })
      .eq('id', player.id);

    if (updateError) {
      return NextResponse.json({ error: '离开房间失败' }, { status: 500 });
    }

    // 检查是否有正在进行的游戏
    const { data: game } = await supabase
      .from('game_dc_games')
      .select('*')
      .eq('room_id', roomId)
      .eq('status', 'playing')
      .single();

    if (game && player.seat !== null) {
      // 如果是游戏中离开，判定为逃跑，对方获胜
      const winnerId =
        game.player1_id === player_id ? game.player2_id : game.player1_id;

      // 更新游戏状态
      await supabase
        .from('game_dc_games')
        .update({
          status: 'completed',
          winner_id: winnerId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', game.id);

      // 更新逃跑次数
      await supabase.rpc('increment_escapes', { player_id });

      // 更新获胜次数
      await supabase.rpc('increment_wins', { player_id: winnerId });

      // 广播游戏结束事件
      const { broadcastToRoom } = await import('../../../../../sse/route');
      await broadcastToRoom(roomId, 'game_ended', {
        game_id: game.id,
        winner_id: winnerId,
        reason: 'opponent_left',
      });
    }

    // 检查房间内是否还有玩家
    const { data: remainingPlayers } = await supabase
      .from('game_dc_room_players')
      .select('*')
      .eq('room_id', roomId)
      .is('left_at', null);

    // 如果所有玩家都离开了，关闭房间
    if (!remainingPlayers || remainingPlayers.length === 0) {
      await supabase
        .from('game_dc_rooms')
        .update({ status: 'closed' })
        .eq('id', roomId);
    }

    // 广播玩家离开事件
    const { broadcastToRoom } = await import('../../../../../sse/route');
    await broadcastToRoom(roomId, 'player_left', {
      player_id,
      seat: player.seat,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('离开房间异常:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
