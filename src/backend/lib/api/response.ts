import { txaEncrypt } from './crypto';
import { SettingService } from '@services/SettingService';

export async function apiResponse(
    data: any, 
    status: 'success' | 'error' = 'success', 
    message: string = '', 
    code: number = 200,
    request?: Request,
    raw: boolean = false
) {
    // If data already matches the envelope, don't wrap it again (for direct mocks matching the spec exactly)
    let rawPayload = data;
    
    // Auto wrap if it's not already wrapped with "data" property and we didn't explicitly pass a raw envelope
    if (!raw && data && typeof data === 'object' && !('data' in data && 'status' in data)) {
        rawPayload = {
            status,
            success: status === 'success',
            data,
            message,
            code
        };
    } else if (!raw && (data === null || data === undefined)) {
        rawPayload = {
            status,
            success: status === 'success',
            data: {},
            message,
            code
        };
    }

    let isApp = true; // Mặc định là app (không mã hóa) để đảm bảo an toàn cho app mobile
    if (request) {
        try {
            const url = new URL(request.url);
            
            // Check headers from Flutter app
            const appHeader = request.headers.get('x-txc-client') || request.headers.get('X-TXC-Client');
            const appKeyHeader = request.headers.get('x-txa-api-key') || request.headers.get('X-TXA-API-KEY');
            const userAgent = request.headers.get('user-agent') || '';
            const isMobileClient = appHeader === 'TPhimX-App' || appKeyHeader === 'tphimx-mobile-2026-secure' || userAgent.startsWith('TPhimX-App');

            if (!isMobileClient && !url.pathname.startsWith('/api/app/') && !url.pathname.startsWith('/api/auth/zalo-') && !url.pathname.startsWith('/api/payment') && !url.pathname.startsWith('/api/user/payments')) {
                isApp = false;
            }
        } catch (e) {
            isApp = false;
        }
    }

    if (!isApp) {
        let enableEncryption = false;
        let passphrase = 'tphimx';
        try {
            const settings = await SettingService.getSettings();
            enableEncryption = settings.general?.api_encrypt_enable ?? false;
            passphrase = settings.general?.api_encrypt_pass || passphrase;
        } catch (e) {
            console.error("Failed to load encryption settings:", e);
        }

        if (enableEncryption) {
            try {
                const encryptedText = await txaEncrypt(JSON.stringify(rawPayload), passphrase);
                return new Response(JSON.stringify({
                    d: encryptedText,
                    v: 1
                }), {
                    status: code,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-TXA-Encrypted': '1'
                    }
                });
            } catch (e) {
                console.error("Encryption failed:", e);
                return new Response(JSON.stringify({ status: 'error', message: 'Encryption Failed', code: 500 }), { 
                    status: 500, 
                    headers: { 'Content-Type': 'application/json' } 
                });
            }
        }
    }

    return new Response(JSON.stringify(rawPayload), {
        status: code,
        headers: {
            'Content-Type': 'application/json'
        }
    });
}
