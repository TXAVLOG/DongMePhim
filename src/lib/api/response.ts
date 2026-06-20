import { txaEncrypt } from './crypto';
import { SettingService } from '../../services/SettingService';

export async function apiResponse(
    data: any, 
    status: 'success' | 'error' = 'success', 
    message: string = '', 
    code: number = 200,
    request?: Request
) {
    // If data already matches the envelope, don't wrap it again (for direct mocks matching the spec exactly)
    let rawPayload = data;
    
    // Auto wrap if it's not already wrapped with "data" property and we didn't explicitly pass a raw envelope
    if (data && typeof data === 'object' && !('data' in data) && !('status' in data)) {
        rawPayload = {
            status,
            data,
            message,
            code
        };
    } else if (data === null || data === undefined) {
        rawPayload = {
            status,
            data: {},
            message,
            code
        };
    }

    let isApp = true; // Mặc định là app (không mã hóa) để đảm bảo an toàn cho app mobile
    if (request) {
        try {
            const url = new URL(request.url);
            if (!url.pathname.startsWith('/api/app/')) {
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
