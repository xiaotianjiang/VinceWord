import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * 准备/取消准备
 * POST /api/games/digits-collision/rooms/[id]/ready
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = parseInt(params.id, 10);
    const body = await request.json();
    const { player_id, is_ready } = body;

    if (isNaN(roomId)) {
      return NextResponse.json({ error: '无效的房间ID' }, { status: 400 });
    }

    if (!player_id || typeof is_ready !== 'boolean') {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    // 更新玩家准备状态
    const { data: player, error } = await supabase
      .from('game_dc_room_players')
      .update({ is_ready })
      .eq('room_id', roomId)
      .eq('player_id', player_id)
      .is('left_at', null)
      .select()
      .single();

    if (error || !player) {
      return NextResponse.json({ error: '更新准备状态失败' }, { status: 500 });
    }

    // 获取玩家用户名
    const { data: user } = await supabase
      .from('vw_user')
      .select('username')
      .eq('id', player_id)
      .single();

    // 广播玩家准备事件
    const { broadcastToRoom } = await import('../../../../../sse/route');
    await broadcastToRoom(roomId, 'player_ready', {
      player: { ...player, username: user?.username || player_id },
      is_ready,
    });

    // 检查是否所有玩家都准备好
    const { data: players } = await supabase
      .from('game_dc_room_players')
      .select('*')
      .eq('room_id', roomId)
      .is('left_at', null);

    const seatedPlayers = players?.filter((p) => p.seat !== null) || [];
    const allReady = seatedPlayers.length === 2 && seatedPlayers.every((p) => p.is_ready);

    let game = null;

    // 如果所有玩家都准备好，自动开始游戏
    if (allReady) {
      // 生成目标数字
      const digitCount = 4; // 可以从房间配置获取
      const player1Target = generateTargetNumber(digitCount);
      const player2Target = generateTargetNumber(digitCount);

      // 创建游戏
      const { data: newGame, error: gameError } = await supabase
        .from('game_dc_games')
        .insert({
          room_id: roomId,
          player1_id: seatedPlayers[0].player_id,
          player2_id: seatedPlayers[1].player_id,
          player1_target: player1Target,
          player2_target: player2Target,
          current_turn: seatedPlayers[0].player_id, // 玩家1先开始
          status: 'playing',
          digit_count: digitCount,
        })
        .select()
        .single();

      if (gameError) {
        console.error('创建游戏失败:', gameError);
      } else {
        game = newGame;

        // 更新房间状态
        await supabase
          .from('game_dc_rooms')
          .update({ status: 'playing' })
          .eq('id', roomId);

        // 广播游戏开始事件
        await broadcastToRoom(roomId, 'game_started', { game });
      }
    }

    return NextResponse.json({
      player: { ...player, username: user?.username || player_id },
      allReady,
      game,
    });
  } catch (error) {
    console.error('准备游戏异常:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * 生成随机目标数字
 */
function generateTargetNumber(digitCount: number): string {
  const digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const result: string[] = [];
  for (let i = 0; i < digitCount; i++) {
    const randomIndex = Math.floor(Math.random() * digits.length);
    result.push(digits[randomIndex]);
    digits.splice(randomIndex, 1);
  }
  return result.join('');
}
