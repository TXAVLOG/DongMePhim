import { txaEncrypt } from './crypto';

// In a real scenario, this comes from Supabase settings.
const MOCK_API_PASSPHRASE = 'tphimx-mobile-2026-secure';
// Can be toggled for testing encryption vs plain json.
const ENABLE_ENCRYPTION = false; 

export async function apiResponse(data: any, status: 'success' | 'error' = 'success', message: string = '', code: number = 200) {
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

    if (ENABLE_ENCRYPTION) {
        try {
            const encryptedText = await txaEncrypt(JSON.stringify(rawPayload), MOCK_API_PASSPHRASE);
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

    return new Response(JSON.stringify(rawPayload), {
        status: code,
        headers: {
            'Content-Type': 'application/json'
        }
    });
}
