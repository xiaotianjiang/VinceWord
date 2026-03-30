import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * 提交猜测
 * POST /api/games/digits-collision/games/[id]/guess
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const gameId = parseInt(params.id, 10);
    const body = await request.json();
    const { guesser_id, guess } = body;

    if (isNaN(gameId)) {
      return NextResponse.json({ error: '无效的游戏ID' }, { status: 400 });
    }

    if (!guesser_id || !guess) {
      return NextResponse.json({ error: '缺少必填字段' }, { status: 400 });
    }

    // 查询游戏信息
    const { data: game, error: gameError } = await supabase
      .from('game_dc_games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      return NextResponse.json({ error: '游戏不存在' }, { status: 404 });
    }

    // 检查游戏状态
    if (game.status !== 'playing') {
      return NextResponse.json({ error: '游戏已结束' }, { status: 400 });
    }

    // 检查是否是当前玩家的回合
    if (game.current_turn !== guesser_id) {
      return NextResponse.json({ error: '不是你的回合' }, { status: 400 });
    }

    // 验证猜测格式
    if (!/^\d+$/.test(guess)) {
      return NextResponse.json({ error: '猜测必须是数字' }, { status: 400 });
    }

    if (guess.length !== game.digit_count) {
      return NextResponse.json(
        { error: `猜测必须是${game.digit_count}位数字` },
        { status: 400 }
      );
    }

    // 检查数字是否重复
    const hasDuplicates = new Set(guess.split('')).size !== guess.length;
    if (hasDuplicates) {
      return NextResponse.json({ error: '数字不能重复' }, { status: 400 });
    }

    // 确定目标数字
    const isPlayer1 = guesser_id === game.player1_id;
    const targetOwnerId = isPlayer1 ? game.player2_id : game.player1_id;
    const targetNumber = isPlayer1 ? game.player2_target : game.player1_target;

    // 计算撞对数
    const hitCount = calculateHitCount(guess, targetNumber);

    // 计算回合数
    const { data: previousGuesses } = await supabase
      .from('game_dc_guesses')
      .select('*')
      .eq('game_id', gameId);

    const round = Math.floor((previousGuesses?.length || 0) / 2) + 1;

    // 保存猜测记录
    const { data: guessRecord, error: guessError } = await supabase
      .from('game_dc_guesses')
      .insert({
        game_id: gameId,
        round,
        guesser_id,
        guess,
        target_owner_id: targetOwnerId,
        hit_count: hitCount,
      })
      .select()
      .single();

    if (guessError) {
      console.error('保存猜测记录错误:', guessError);
      return NextResponse.json({ error: '保存猜测失败' }, { status: 500 });
    }

    // 检查是否猜中
    const isCorrect = hitCount === game.digit_count;
    let gameStatus = 'playing';
    let winnerId = null;

    if (isCorrect) {
      // 猜中了，游戏结束
      gameStatus = 'completed';
      winnerId = guesser_id;

      // 更新游戏状态
      await supabase
        .from('game_dc_games')
        .update({
          status: 'completed',
          winner_id: winnerId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', gameId);

      // 更新房间状态
      await supabase
        .from('game_dc_rooms')
        .update({ status: 'waiting' })
        .eq('id', game.room_id);

      // 更新玩家统计
      await supabase.rpc('increment_wins', { player_id: winnerId });
      await supabase.rpc('increment_games', {
        player_id: game.player1_id,
        rounds: round,
      });
      await supabase.rpc('increment_games', {
        player_id: game.player2_id,
        rounds: round,
      });

      // 广播游戏结束事件
      const { broadcastToRoom } = await import('../../../../../sse/route');
      await broadcastToRoom(game.room_id, 'game_ended', {
        game_id: gameId,
        winner_id: winnerId,
        guess: guessRecord,
        reason: 'correct_guess',
      });
    } else {
      // 没猜中，切换回合
      const nextTurn = isPlayer1 ? game.player2_id : game.player1_id;

      await supabase
        .from('game_dc_games')
        .update({ current_turn: nextTurn })
        .eq('id', gameId);

      // 广播猜测提交事件
      const { broadcastToRoom } = await import('../../../../../sse/route');
      await broadcastToRoom(game.room_id, 'guess_submitted', {
        guess: guessRecord,
        next_turn: nextTurn,
      });
    }

    return NextResponse.json({
      guess: guessRecord,
      gameStatus,
      winner_id: winnerId,
      isCorrect,
    });
  } catch (error) {
    console.error('提交猜测异常:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * 计算撞对数
 */
function calculateHitCount(guess: string, target: string): number {
  let hitCount = 0;
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === target[i]) {
      hitCount++;
    }
  }
  return hitCount;
}
