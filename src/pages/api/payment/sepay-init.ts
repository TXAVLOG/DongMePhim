import type { APIRoute } from 'astro';
import { apiResponse } from '@lib/api/response';
import { SettingService } from '@services/SettingService';

function generateSepaySignature(fields: Record<string, any>, secretKey: string): string {
  // Try using Node crypto if available
  try {
    const crypto = require('crypto');
    const signedKeys = [
      'merchant', 'env', 'operation', 'payment_method',
      'order_amount', 'currency', 'order_invoice_number',
      'order_description', 'customer_id', 'agreement_id',
      'agreement_name', 'agreement_type', 'agreement_payment_frequency',
      'agreement_amount_per_payment', 'success_url', 'error_url',
      'cancel_url', 'order_id'
    ];
    
    const signed: string[] = [];
    for (const key of signedKeys) {
      if (fields[key] !== undefined && fields[key] !== null) {
        signed.push(`${key}=${fields[key]}`);
      }
    }
    
    const signedStr = signed.join(',');
    return crypto.createHmac('sha256', secretKey).update(signedStr).digest('base64');
  } catch (e) {
    return '';
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as any;
    const { txid, totalAmount, packageTitle } = body;

    if (!txid || !totalAmount) {
      return apiResponse(null, 'error', 'Thiếu thông tin đơn hàng.', 400, request);
    }

    const settings = await SettingService.getSettings();
    const payments = settings.payments || {};
    const isSandbox = payments.sepay_sandbox_mode && payments.sepay_sandbox_merchant_id;
    
    const merchantId = (isSandbox ? payments.sepay_sandbox_merchant_id : payments.sepay_merchant_id) || payments.sepay_merchant_id || 'SP-LIVE-TX5B9345';
    const secretKey = (isSandbox ? payments.sepay_sandbox_secret_key : payments.sepay_secret_key) || payments.sepay_secret_key || 'spsk_live_xdFNcCKmERhi2Y3teu8YRN8bLKSbNQxQ';

    const siteUrl = settings.general?.site_url || 'https://dongmephim.online';
    const cleanSiteUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;

    const checkoutUrl = isSandbox ? 'https://pgapi-sandbox.sepay.vn/v1/checkout/init' : 'https://pay.sepay.vn/v1/checkout/init';

    const fields: Record<string, any> = {
      merchant: merchantId,
      operation: 'PURCHASE',
      order_invoice_number: String(txid),
      order_amount: Number(totalAmount),
      currency: 'VND',
      order_description: `Thanh toan don hang ${txid}`,
      success_url: `${cleanSiteUrl}/checkout/success?txid=${txid}&packageTitle=${encodeURIComponent(packageTitle || 'VIP')}`,
      error_url: `${cleanSiteUrl}/checkout/failed?txid=${txid}`,
      cancel_url: `${cleanSiteUrl}/checkout/failed?txid=${txid}`
    };

    fields.signature = generateSepaySignature(fields, secretKey);

    return apiResponse({ checkoutUrl, fields }, 'success', 'Khởi tạo cổng thanh toán SePay thành công', 200, request);
  } catch (err: any) {
    console.error('Error initiating SePay PG:', err);
    return apiResponse(null, 'error', err.message || 'Lỗi khởi tạo cổng thanh toán SePay', 500, request);
  }
};
