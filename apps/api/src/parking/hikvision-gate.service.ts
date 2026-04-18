import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as http from 'http';
import { GateProvider } from './gate.service';

/**
 * Hikvision DS-TMG52X barrier gate integration via ISAPI HTTP Digest Auth.
 *
 * Environment variables:
 *   HIKVISION_HOST     – IP or hostname of the gate controller (required)
 *   HIKVISION_PORT     – HTTP port (default: 80)
 *   HIKVISION_USER     – Username (default: admin)
 *   HIKVISION_PASSWORD – Device password (required)
 *
 * Gate-ID → door-number mapping:
 *   The `gateId` string passed from ParkingService is mapped to an integer
 *   door number using the HIKVISION_GATE_MAP env var (JSON object), e.g.:
 *     HIKVISION_GATE_MAP={"entrada-principal":1,"salida-principal":2}
 *   If no map is provided every gateId falls back to door 1.
 *
 * ISAPI endpoint used:
 *   PUT http://<host>:<port>/ISAPI/AccessControl/RemoteControl/door/<doorNo>
 *   Body: XML RemoteControlDoor with controlType "open"
 */
@Injectable()
export class HikvisionGateService implements GateProvider {
  private readonly logger = new Logger(HikvisionGateService.name);

  private readonly host: string;
  private readonly port: number;
  private readonly user: string;
  private readonly password: string;
  private readonly gateMap: Record<string, number>;

  constructor(private readonly config: ConfigService) {
    this.host = this.config.getOrThrow<string>('HIKVISION_HOST');
    this.port = parseInt(this.config.get<string>('HIKVISION_PORT', '80'), 10);
    this.user = this.config.get<string>('HIKVISION_USER', 'admin');
    this.password = this.config.getOrThrow<string>('HIKVISION_PASSWORD');

    const rawMap = this.config.get<string>('HIKVISION_GATE_MAP', '{}');
    try {
      this.gateMap = JSON.parse(rawMap);
    } catch {
      this.logger.warn(
        'HIKVISION_GATE_MAP is not valid JSON; defaulting all gates to door 1',
      );
      this.gateMap = {};
    }
  }

  async openGate(gateId: string): Promise<void> {
    const doorNo = this.gateMap[gateId] ?? 1;
    const path = `/ISAPI/AccessControl/RemoteControl/door/${doorNo}`;
    const body = this.buildOpenXml(doorNo);

    this.logger.log(
      `[HIKVISION] Opening gate=${gateId} → door=${doorNo} on ${this.host}:${this.port}`,
    );

    await this.isapiPut(path, body);

    this.logger.log(`[HIKVISION] Gate ${gateId} (door ${doorNo}) opened OK`);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildOpenXml(doorNo: number): string {
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<RemoteControlDoor version="2.0" xmlns="urn:psialliance-org">',
      `  <doorNo>${doorNo}</doorNo>`,
      '  <controlType>open</controlType>',
      '</RemoteControlDoor>',
    ].join('\n');
  }

  /**
   * Executes an HTTP PUT with Digest Authentication (RFC 2617 / MD5).
   * Sends an initial unauthenticated request to obtain the WWW-Authenticate
   * challenge, then retries with the computed Digest header.
   */
  private isapiPut(path: string, body: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // First request — expect 401 with WWW-Authenticate
      const initialReq = http.request(
        {
          hostname: this.host,
          port: this.port,
          path,
          method: 'PUT',
          headers: {
            'Content-Type': 'application/xml',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          // Consume the body so the socket is freed
          res.resume();

          if (res.statusCode === 200 || res.statusCode === 204) {
            // Device accepted without auth challenge (unusual but possible)
            return resolve();
          }

          if (res.statusCode !== 401) {
            return reject(
              new Error(
                `ISAPI unexpected status ${res.statusCode} on first request to ${path}`,
              ),
            );
          }

          const wwwAuth = res.headers['www-authenticate'];
          if (!wwwAuth) {
            return reject(new Error('ISAPI 401 but no WWW-Authenticate header'));
          }

          let authHeader: string;
          try {
            authHeader = this.buildDigestHeader(wwwAuth, 'PUT', path);
          } catch (err) {
            return reject(err);
          }

          // Second request — with Digest credentials
          const authenticatedReq = http.request(
            {
              hostname: this.host,
              port: this.port,
              path,
              method: 'PUT',
              headers: {
                'Content-Type': 'application/xml',
                'Content-Length': Buffer.byteLength(body),
                Authorization: authHeader,
              },
            },
            (authRes) => {
              authRes.resume();
              if (authRes.statusCode === 200 || authRes.statusCode === 204) {
                resolve();
              } else {
                reject(
                  new Error(
                    `ISAPI authentication failed, status=${authRes.statusCode}`,
                  ),
                );
              }
            },
          );

          authenticatedReq.on('error', reject);
          authenticatedReq.write(body);
          authenticatedReq.end();
        },
      );

      initialReq.on('error', reject);
      initialReq.write(body);
      initialReq.end();
    });
  }

  /**
   * Builds an HTTP Digest Authorization header value.
   * Supports algorithm=MD5 (the Hikvision default).
   */
  private buildDigestHeader(
    wwwAuthenticate: string,
    method: string,
    uri: string,
  ): string {
    const realm = this.extractParam(wwwAuthenticate, 'realm');
    const nonce = this.extractParam(wwwAuthenticate, 'nonce');
    const opaque = this.extractParam(wwwAuthenticate, 'opaque');
    const qop = this.extractParam(wwwAuthenticate, 'qop'); // may be undefined

    if (!realm || !nonce) {
      throw new Error(
        `ISAPI Digest challenge missing realm or nonce: ${wwwAuthenticate}`,
      );
    }

    const nc = '00000001';
    const cnonce = crypto.randomBytes(8).toString('hex');

    const ha1 = md5(`${this.user}:${realm}:${this.password}`);
    const ha2 = md5(`${method}:${uri}`);

    let response: string;
    if (qop === 'auth' || qop === 'auth-int') {
      response = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
    } else {
      response = md5(`${ha1}:${nonce}:${ha2}`);
    }

    const parts = [
      `Digest username="${this.user}"`,
      `realm="${realm}"`,
      `nonce="${nonce}"`,
      `uri="${uri}"`,
      `response="${response}"`,
    ];

    if (qop) {
      parts.push(`qop=${qop}`, `nc=${nc}`, `cnonce="${cnonce}"`);
    }
    if (opaque) {
      parts.push(`opaque="${opaque}"`);
    }

    return parts.join(', ');
  }

  private extractParam(header: string, param: string): string | undefined {
    const match = header.match(new RegExp(`${param}="([^"]*)"`));
    return match?.[1];
  }
}

function md5(data: string): string {
  return crypto.createHash('md5').update(data).digest('hex');
}
