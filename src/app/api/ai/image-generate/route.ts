import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { prompt, style } = await request.json();
  
  const apiKey = process.env.COZE_API_KEY;
  const botId = process.env.COZE_BOT_ID;
  
  if (!apiKey || !botId) {
    return NextResponse.json({ error: 'AI API配置未设置' }, { status: 500 });
  }

  const styleMap: Record<string, string> = {
    realistic: '真实照片风格',
    photorealistic: '超写实风格',
    cartoon: 'Q版卡通风格',
  };

  const styledPrompt = `${prompt}\n图片风格：${styleMap[style] || '真实照片风格'}\n要求：专业美食摄影，色彩鲜艳，适合菜单展示`;

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
        query: styledPrompt,
        stream: false,
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('AI图片生成失败:', error);
    return NextResponse.json({ error: 'AI图片生成失败' }, { status: 500 });
  }
}