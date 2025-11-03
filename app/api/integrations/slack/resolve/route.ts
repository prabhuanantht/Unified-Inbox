import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    try {
      const { SlackIntegration } = await import('@/lib/integrations/slack');
      const slack = new SlackIntegration();

      // Determine if user or channel and fetch name
      const looksLikeChannel = id.startsWith('C') || id.startsWith('G');
      if (looksLikeChannel && slack.getChannelInfo) {
        const info = await slack.getChannelInfo(id);
        if (info?.name) return NextResponse.json({ name: info.name, type: 'channel' });
      }
      const userInfo = await slack.getUserInfo(id);
      if (userInfo?.name) return NextResponse.json({ name: userInfo.name, type: 'user' });
    } catch (e) {
      // fallthrough to default
    }

    return NextResponse.json({ name: `Slack ${id}`, type: 'unknown' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to resolve Slack id' }, { status: 500 });
  }
}


