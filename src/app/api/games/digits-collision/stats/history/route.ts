import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 告诉 Next.js 这个路由需要动态生成
export const dynamic = 'force-dynamic';

/**
 * 获取游戏历史记录
 * GET /api/games/digits-collision/stats/history?player_id=[id]
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

    // 查询玩家参与的游戏
    const { data: games, error: gamesError } = await supabase
      .from('game_dc_games')
      .select('*')
      .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50);

    if (gamesError) {
      console.error('获取游戏历史错误:', gamesError);
      return NextResponse.json(
        { error: '获取历史记录失败' },
        { status: 500 }
      );
    }

    // 获取对手用户名
    const opponentIds = games?.map((game) =>
      game.player1_id === playerId ? game.player2_id : game.player1_id
    ) || [];

    const { data: users } = await supabase
      .from('vw_user')
      .select('id, username')
      .in('id', opponentIds);

    const userMap = new Map(users?.map((u) => [u.id, u.username]) || []);

    // 获取每局游戏的回合数
    const gameIds = games?.map((g) => g.id) || [];
    let guessCountMap = new Map<number, number>();
    
    if (gameIds.length > 0) {
      const { data: guessCounts, error: guessError } = await supabase.rpc(
        'get_guess_counts_by_games',
        { game_ids: gameIds }
      );
      
      if (!guessError && guessCounts) {
        guessCountMap = new Map(
          guessCounts.map((g: { game_id: number; count: number }) => [g.game_id, g.count])
        );
      }
    }

    // 格式化历史记录
    const history = games?.map((game) => {
      const isPlayer1 = game.player1_id === playerId;
      const opponentId = isPlayer1 ? game.player2_id : game.player1_id;
      const isWinner = game.winner_id === playerId;
      const isEscape = game.winner_id !== playerId && game.winner_id !== null;

      let result: '胜利' | '失败' | '逃跑';
      if (isWinner) {
        result = '胜利';
      } else if (isEscape) {
        result = '失败';
      } else {
        result = '逃跑';
      }

      return {
        game_id: game.id,
        opponent_id: opponentId,
        opponent_username: userMap.get(opponentId) || opponentId,
        digit_count: game.digit_count,
        result,
        round_count: Math.ceil((guessCountMap.get(game.id) || 0) / 2),
        created_at: game.created_at,
      };
    });

    return NextResponse.json({ history: history || [] });
  } catch (error) {
    console.error('获取历史记录异常:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
