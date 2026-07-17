import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { SettingService } from '@services/SettingService';
import { TxaActivityCalculator } from '@services/TxaActivityCalculator';

async function verifyBotRequest(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.substring(7);
  const settings = await SettingService.getSettings();
  const configuredApiKey = settings.discord?.api_key || 'txa-discord-secure-key-2026';
  return token === configuredApiKey;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    if (!(await verifyBotRequest(request))) {
      return apiResponse(null, 'error', 'Unauthorized', 401, request);
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    const { discordId } = body;
    if (!discordId) {
      return apiResponse(null, 'error', 'Thiếu tham số discordId', 400, request);
    }

    // Tích lũy điểm chat
    await TxaActivityCalculator.incrementDiscordChat(discordId);

    return apiResponse({ success: true }, 'success', 'Tăng điểm chat thành công!', 200, request);
  } catch (err: any) {
    return apiResponse(null, 'error', err.message || 'Lỗi hệ thống', 500, request);
  }
};
