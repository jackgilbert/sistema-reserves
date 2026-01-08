import { BadRequestException, Injectable } from '@nestjs/common';
import crypto from 'crypto';

type RedsysConfig = {
  environment: 'test' | 'production';
  merchantCode: string;
  terminal: string;
  secretKeyBase64: string;
  currencyNumeric: string;
  actionUrl: string;
};

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function base64Encode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64');
}

function base64DecodeToJson(input: string): any {
  const json = Buffer.from(input, 'base64').toString('utf8');
  return JSON.parse(json);
}

function padTo8(buffer: Buffer): Buffer {
  const pad = buffer.length % 8 === 0 ? 0 : 8 - (buffer.length % 8);
  if (pad === 0) return buffer;
  return Buffer.concat([buffer, Buffer.alloc(pad, 0)]);
}

function encrypt3DES(order: string, key: Buffer): Buffer {
  // Redsys: 3DES CBC con IV=0, sin autoPadding, order padded con \0 hasta múltiplo de 8.
  const iv = Buffer.alloc(8, 0);
  const cipher = crypto.createCipheriv('des-ede3-cbc', key, iv);
  cipher.setAutoPadding(false);

  const msg = padTo8(Buffer.from(order, 'utf8'));
  return Buffer.concat([cipher.update(msg), cipher.final()]);
}

@Injectable()
export class RedsysService {
  generateOrder(): string {
    // Redsys requiere un order de 4-12 caracteres (habitualmente numérico).
    // Debe ser altamente único para evitar colisiones entre tenants/checkouts.
    // Usamos epoch ms + 2 dígitos aleatorios y nos quedamos con los últimos 12 dígitos.
    const rand2 = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, '0');
    const raw = `${Date.now()}${rand2}`;
    return raw.slice(-12);
  }

  private getConfig(): RedsysConfig {
    const environment = (getEnv('REDSYS_ENV') || 'test') as 'test' | 'production';

    const merchantCode = getEnv('REDSYS_MERCHANT_CODE');
    const terminal = getEnv('REDSYS_TERMINAL') || '1';
    const secretKeyBase64 = getEnv('REDSYS_SECRET_KEY_BASE64');

    if (!merchantCode || !secretKeyBase64) {
      throw new BadRequestException(
        'Redsys no está configurado. Define REDSYS_MERCHANT_CODE y REDSYS_SECRET_KEY_BASE64.',
      );
    }

    const currencyNumeric = getEnv('REDSYS_CURRENCY_NUMERIC') || '978'; // EUR

    const actionUrl =
      environment === 'production'
        ? 'https://sis.redsys.es/sis/realizarPago'
        : 'https://sis-t.redsys.es:25443/sis/realizarPago';

    return {
      environment,
      merchantCode,
      terminal,
      secretKeyBase64,
      currencyNumeric,
      actionUrl,
    };
  }

  decodeMerchantParameters(merchantParametersBase64: string): any {
    try {
      return base64DecodeToJson(merchantParametersBase64);
    } catch {
      throw new BadRequestException('Ds_MerchantParameters inválido');
    }
  }

  signMerchantParameters(params: {
    merchantParameters: string;
    order: string;
  }): string {
    const config = this.getConfig();

    const key = Buffer.from(config.secretKeyBase64, 'base64');
    if (key.length !== 24) {
      throw new BadRequestException(
        'REDSYS_SECRET_KEY_BASE64 debe decodificar a 24 bytes (clave 3DES)',
      );
    }

    const key3DES = encrypt3DES(params.order, key);

    const hmac = crypto.createHmac('sha256', key3DES);
    hmac.update(params.merchantParameters, 'utf8');

    return hmac.digest('base64');
  }

  buildPaymentRequest(input: {
    amount: number;
    currency: string;
    order: string;
    merchantData: string;
    description?: string;
    customerName?: string;
    origin?: string;
  }): {
    actionUrl: string;
    signatureVersion: string;
    merchantParameters: string;
    signature: string;
  } {
    const config = this.getConfig();

    const publicBaseUrl =
      getEnv('PUBLIC_BASE_URL') ||
      input.origin ||
      'http://localhost:3000';

    const notifyUrl = `${publicBaseUrl.replace(/\/$/, '')}/api/payments/redsys/notify`;
    const okUrl = `${publicBaseUrl.replace(/\/$/, '')}/payments/redsys/ok`;
    const koUrl = `${publicBaseUrl.replace(/\/$/, '')}/payments/redsys/ko`;

    // Nota: Redsys espera amount en céntimos (string), currency numérica.
    const payload: Record<string, any> = {
      Ds_Merchant_Amount: String(input.amount),
      Ds_Merchant_Order: input.order,
      Ds_Merchant_MerchantCode: config.merchantCode,
      Ds_Merchant_Currency: config.currencyNumeric,
      Ds_Merchant_TransactionType: '0',
      Ds_Merchant_Terminal: config.terminal,
      Ds_Merchant_MerchantURL: notifyUrl,
      Ds_Merchant_UrlOK: okUrl,
      Ds_Merchant_UrlKO: koUrl,
      Ds_Merchant_MerchantData: input.merchantData,
    };

    if (input.description) payload.Ds_Merchant_ProductDescription = input.description;
    if (input.customerName) payload.Ds_Merchant_Titular = input.customerName;

    const merchantParameters = base64Encode(JSON.stringify(payload));
    const signatureVersion = 'HMAC_SHA256_V1';
    const signature = this.signMerchantParameters({
      merchantParameters,
      order: input.order,
    });

    return {
      actionUrl: config.actionUrl,
      signatureVersion,
      merchantParameters,
      signature,
    };
  }
}
