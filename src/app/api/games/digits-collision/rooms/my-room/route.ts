import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyJwt } from '@/lib/jwt';

// 告诉 Next.js 这个路由需要动态生成
export const dynamic = 'force-dynamic';

/**
 * 获取用户当前所在的房间
 * GET /api/games/digits-collision/rooms/my-room
 * 需要 Authorization header
 */
export async function GET(request: NextRequest) {
  try {
    // 从请求头中获取 token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    console.log('my-room API: 认证头:', authHeader);
    console.log('my-room API: 令牌:', token ? token.substring(0, 20) + '...' : '无');
    
    if (!token) {
      return NextResponse.json(
        { error: '未提供认证令牌' },
        { status: 401 }
      );
    }

    // 验证 token 并获取用户信息
    const decoded = verifyJwt(token);
    if (!decoded) {
      return NextResponse.json(
        { error: '无效的认证令牌' },
        { status: 401 }
      );
    }

    // 获取用户信息
    const { data: user } = await supabase
      .from('vw_users')
      .select('id, username')
      .eq('id', decoded.userId)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 401 }
      );
    }

    const playerId = user.id;
    console.log('my-room API: 玩家ID:', playerId);

    // 查询用户当前所在的房间（状态为 waiting 或 playing）
    // 查找玩家在游戏中的记录，不使用 single() 因为可能有多个记录
    const { data: playerRooms, error: playerError } = await supabase
      .from('game_dc_room_players')
      .select('room_id')
      .eq('player_id', playerId);

    console.log('my-room API: 玩家房间查询结果:', { playerRooms, playerError });

    if (playerError || !playerRooms || playerRooms.length === 0) {
      // 查询所有玩家房间记录，包括已离开的
      const { data: allPlayerRooms } = await supabase
        .from('game_dc_room_players')
        .select('*')
        .eq('player_id', playerId);
      
      console.log('my-room API: 所有玩家房间记录:', allPlayerRooms);
      
      // 用户不在任何房间中
      return NextResponse.json({ 
        inRoom: false,
        room: null 
      });
    }

    // 遍历所有房间记录，找到状态为 waiting 或 playing 的房间
    let foundRoom = null;
    for (const pr of playerRooms) {
      const { data: room, error: roomError } = await supabase
        .from('game_dc_rooms')
        .select('*')
        .eq('id', pr.room_id)
        .in('status', ['waiting', 'playing'])
        .single();
      
      if (!roomError && room) {
        foundRoom = room;
        break;
      }
    }

    if (!foundRoom) {
      console.log('my-room API: 未找到状态为 waiting 或 playing 的房间');
      return NextResponse.json({ 
        inRoom: false,
        room: null 
      });
    }

    console.log('my-room API: 找到的房间:', foundRoom);

    console.log('my-room API: 找到的房间ID:', foundRoom.id);

    // 获取房间详细信息，包括玩家数量
    const { data: room, error: roomError } = await supabase
      .from('game_dc_rooms')
      .select(`
        *,
        players:game_dc_room_players(count)
      `)
      .eq('id', foundRoom.id)
      .single();

    console.log('my-room API: 房间查询结果:', { room, roomError });

    if (roomError || !room) {
      // 房间不存在或已关闭
      return NextResponse.json({ 
        inRoom: false,
        room: null 
      });
    }

    console.log('my-room API: 找到的房间:', room);

    // 获取房主用户名
    const { data: hostUser } = await supabase
      .from('vw_user')
      .select('username')
      .eq('id', room.host_id)
      .single();

    // 获取房间内的所有玩家
    const { data: roomPlayers } = await supabase
      .from('game_dc_room_players')
      .select('*')
      .eq('room_id', room.id);

    // 获取玩家用户名
    const playerIds = roomPlayers?.map((p) => p.player_id) || [];
    const { data: users } = await supabase
      .from('vw_user')
      .select('id, username')
      .in('id', playerIds);

    const userMap = new Map(users?.map((u) => [u.id, u.username]) || []);

    // 格式化玩家数据
    const formattedPlayers = roomPlayers?.map((player) => ({
      ...player,
      username: userMap.get(player.player_id) || player.player_id,
    })) || [];

    // 格式化房间数据
    const formattedRoom = {
      ...room,
      player_count: room.players?.[0]?.count || 0,
      host_username: hostUser?.username || room.host_id,
    };

    return NextResponse.json({
      inRoom: true,
      room: formattedRoom,
      players: formattedPlayers,
    });
  } catch (error) {
    console.error('获取用户当前房间异常:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
