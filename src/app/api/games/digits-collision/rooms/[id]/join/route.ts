import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * 加入房间
 * POST /api/games/digits-collision/rooms/[id]/join
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = parseInt(params.id, 10);
    const body = await request.json();
    const { player_id, seat } = body;

    if (isNaN(roomId)) {
      return NextResponse.json(
        { error: '无效的房间ID' },
        { status: 400 }
      );
    }

    if (!player_id) {
      return NextResponse.json(
        { error: '缺少 player_id' },
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

    // 检查房间状态
    if (room.status === 'closed') {
      return NextResponse.json(
        { error: '房间已关闭' },
        { status: 400 }
      );
    }

    // 检查玩家是否已经在房间中
    const { data: existingPlayer } = await supabase
      .from('game_dc_room_players')
      .select('*')
      .eq('room_id', roomId)
      .eq('player_id', player_id)
      .is('left_at', null)
      .maybeSingle();

    if (existingPlayer) {
      return NextResponse.json(
        { error: '你已经在房间中' },
        { status: 400 }
      );
    }

    // 查询当前房间内的玩家
    const { data: currentPlayers } = await supabase
      .from('game_dc_room_players')
      .select('*')
      .eq('room_id', roomId)
      .is('left_at', null);

    // 判断是加入游戏还是观战
    const seatedPlayers = currentPlayers?.filter((p) => p.seat !== null) || [];
    const isRoomFull = seatedPlayers.length >= 2;

    let playerSeat = seat;
    let isSpectator = false;

    if (isRoomFull) {
      // 房间已满，作为观众加入
      playerSeat = null;
      isSpectator = true;
    } else {
      // 房间未满，检查座位是否可用
      if (playerSeat !== undefined && playerSeat !== null) {
        const isSeatTaken = seatedPlayers.some((p) => p.seat === playerSeat);
        if (isSeatTaken) {
          // 座位被占用，自动分配另一个座位
          const availableSeat = [1, 2].find(
            (s) => !seatedPlayers.some((p) => p.seat === s)
          );
          if (availableSeat) {
            playerSeat = availableSeat;
          } else {
            playerSeat = null;
            isSpectator = true;
          }
        }
      } else {
        // 自动分配座位
        const availableSeat = [1, 2].find(
          (s) => !seatedPlayers.some((p) => p.seat === s)
        );
        if (availableSeat) {
          playerSeat = availableSeat;
        } else {
          playerSeat = null;
          isSpectator = true;
        }
      }
    }

    // 检查是否允许观战
    if (isSpectator && !room.can_spectate) {
      return NextResponse.json(
        { error: '该房间不允许观战' },
        { status: 400 }
      );
    }

    // 插入玩家记录
    const { data: player, error: playerError } = await supabase
      .from('game_dc_room_players')
      .insert({
        room_id: roomId,
        player_id,
        seat: playerSeat,
        is_ready: false,
      })
      .select()
      .single();

    if (playerError) {
      console.error('加入房间错误:', playerError);
      return NextResponse.json(
        { error: '加入房间失败' },
        { status: 500 }
      );
    }

    // 获取玩家用户名
    const { data: user } = await supabase
      .from('vw_user')
      .select('username')
      .eq('id', player_id)
      .single();

    // 广播玩家加入事件
    const { broadcastToRoom } = await import('../../../../../sse/route');
    await broadcastToRoom(roomId, 'player_joined', {
      player: {
        ...player,
        username: user?.username || player_id,
      },
      isSpectator,
    });

    return NextResponse.json({
      player: {
        ...player,
        username: user?.username || player_id,
      },
      success: true,
      isSpectator,
    });
  } catch (error) {
    console.error('加入房间异常:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
