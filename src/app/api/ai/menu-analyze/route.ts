import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { prompt } = await request.json();
  
  const apiKey = process.env.COZE_API_KEY;
  const botId = process.env.COZE_BOT_ID;
  
  if (!apiKey || !botId) {
    return NextResponse.json({ error: 'AI API配置未设置' }, { status: 500 });
  }

  try {
    const response = await fetch('https://api.coze.cn/v3/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bot_id: botId,
        user_id: 'menu-creator-user',
        query: prompt,
        stream: false,
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('AI API调用失败:', error);
    return NextResponse.json({ error: 'AI API调用失败' }, { status: 500 });
  }
}