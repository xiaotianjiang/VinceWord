import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * 获取游戏列表（可选）
 * GET /api/games/digits-collision/games
 */
export async function GET() {
  try {
    const { data: games, error } = await supabase
      .from('game_dc_games')
      .select('*')
      .eq('status', 'playing')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: '获取游戏列表失败' }, { status: 500 });
    }

    return NextResponse.json({ games: games || [] });
  } catch (error) {
    console.error('获取游戏列表异常:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * 创建游戏（手动创建，通常由准备逻辑自动触发）
 * POST /api/games/digits-collision/games
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      room_id,
      player1_id,
      player2_id,
      player1_target,
      player2_target,
      digit_count = 4,
    } = body;

    if (!room_id || !player1_id || !player2_id) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    // 创建游戏
    const { data: game, error } = await supabase
      .from('game_dc_games')
      .insert({
        room_id,
        player1_id,
        player2_id,
        player1_target: player1_target || generateTargetNumber(digit_count),
        player2_target: player2_target || generateTargetNumber(digit_count),
        current_turn: player1_id,
        status: 'playing',
        digit_count,
      })
      .select()
      .single();

    if (error) {
      console.error('创建游戏错误:', error);
      return NextResponse.json({ error: '创建游戏失败' }, { status: 500 });
    }

    // 更新房间状态
    await supabase
      .from('game_dc_rooms')
      .update({ status: 'playing' })
      .eq('id', room_id);

    // 广播游戏开始事件
    const { broadcastToRoom } = await import('../../../sse/route');
    await broadcastToRoom(room_id, 'game_started', { game });

    return NextResponse.json({ game });
  } catch (error) {
    console.error('创建游戏异常:', error);
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
