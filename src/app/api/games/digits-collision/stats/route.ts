import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 告诉 Next.js 这个路由需要动态生成
export const dynamic = 'force-dynamic';

/**
 * 获取玩家统计
 * GET /api/games/digits-collision/stats?player_id=[id]
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const playerId = searchParams.get('player_id');

    if (!playerId) {
      return NextResponse.json(
        { error: '缺少 player_id 参数' },
        { status: 400 }
      );
    }

    // 查询玩家统计
    const { data: stats, error } = await supabase
      .from('game_dc_player_stats')
      .select('*')
      .eq('player_id', playerId)
      .single();

    if (error) {
      // 如果没有统计记录，创建一个新的
      if (error.code === 'PGRST116') {
        const { data: newStats, error: createError } = await supabase
          .from('game_dc_player_stats')
          .insert({
            player_id: playerId,
            total_games: 0,
            total_rounds: 0,
            wins: 0,
            escapes: 0,
            win_rate: 0,
          })
          .select()
          .single();

        if (createError) {
          console.error('创建统计记录错误:', createError);
          return NextResponse.json(
            { error: '获取统计失败' },
            { status: 500 }
          );
        }

        return NextResponse.json(newStats);
      }

      console.error('获取统计错误:', error);
      return NextResponse.json({ error: '获取统计失败' }, { status: 500 });
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('获取统计异常:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
