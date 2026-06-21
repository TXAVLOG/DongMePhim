import * as net from 'net';
import * as tls from 'tls';

export interface SMTPConfig {
  host: string;
  port: number;
  secure: 'SSL' | 'TLS' | 'NONE';
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
}

export interface MailEnvelope {
  to: string;
  subject: string;
  html: string;
}

export interface UnifiedSocket {
  write(data: string): Promise<void>;
  read(): Promise<string>;
  close(): Promise<void>;
  startTls(): Promise<void>;
}

// Helper to convert UTF-8 string to Base64 in cross-platform way
function utf8ToBase64(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf8').toString('base64');
  }
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  return btoa(binary);
}

class NodeSocket implements UnifiedSocket {
  private socket: net.Socket | tls.TLSSocket;
  private readBuffer: string = '';
  private readResolve: ((value: string) => void) | null = null;
  private isClosed: boolean = false;

  constructor(socket: net.Socket | tls.TLSSocket) {
    this.socket = socket;
    this.socket.on('data', (chunk) => {
      const data = chunk.toString('utf8');
      if (this.readResolve) {
        const resolve = this.readResolve;
        this.readResolve = null;
        resolve(data);
      } else {
        this.readBuffer += data;
      }
    });
    this.socket.on('close', () => {
      this.isClosed = true;
      if (this.readResolve) {
        const resolve = this.readResolve;
        this.readResolve = null;
        resolve('');
      }
    });
    this.socket.on('error', () => {
      this.isClosed = true;
      if (this.readResolve) {
        const resolve = this.readResolve;
        this.readResolve = null;
        resolve('');
      }
    });
  }

  async write(data: string): Promise<void> {
    if (this.isClosed) throw new Error('Socket is closed');
    return new Promise((resolve, reject) => {
      this.socket.write(data, 'utf8', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async read(): Promise<string> {
    if (this.readBuffer) {
      const data = this.readBuffer;
      this.readBuffer = '';
      return data;
    }
    if (this.isClosed) return '';
    return new Promise((resolve) => {
      this.readResolve = resolve;
    });
  }

  async close(): Promise<void> {
    this.isClosed = true;
    this.socket.end();
    this.socket.destroy();
  }

  async startTls(): Promise<void> {
    if (this.isClosed) throw new Error('Socket is closed');
    return new Promise((resolve, reject) => {
      const secureSocket = tls.connect({
        socket: this.socket,
        rejectUnauthorized: false
      }, () => {
        this.socket.removeAllListeners('data');
        this.socket = secureSocket;
        this.socket.on('data', (chunk) => {
          const data = chunk.toString('utf8');
          if (this.readResolve) {
            const resolve = this.readResolve;
            this.readResolve = null;
            resolve(data);
          } else {
            this.readBuffer += data;
          }
        });
        resolve();
      });
      secureSocket.on('error', (err) => reject(err));
    });
  }
}

class CloudflareSocket implements UnifiedSocket {
  private socket: any;
  private reader: any = null;
  private writer: any = null;
  private decoder = new TextDecoder();
  private encoder = new TextEncoder();
  private isClosed: boolean = false;

  constructor(socket: any) {
    this.socket = socket;
    this.reader = socket.readable.getReader();
    this.writer = socket.writable.getWriter();
  }

  async write(data: string): Promise<void> {
    if (this.isClosed) throw new Error('Socket is closed');
    await this.writer.write(this.encoder.encode(data));
  }

  async read(): Promise<string> {
    if (this.isClosed) return '';
    try {
      const { value, done } = await this.reader.read();
      if (done || !value) {
        this.isClosed = true;
        return '';
      }
      return this.decoder.decode(value);
    } catch (e) {
      this.isClosed = true;
      return '';
    }
  }

  async close(): Promise<void> {
    if (this.isClosed) return;
    this.isClosed = true;
    try {
      this.reader.releaseLock();
      this.writer.releaseLock();
      await this.socket.close();
    } catch (e) {}
  }

  async startTls(): Promise<void> {
    if (this.isClosed) throw new Error('Socket is closed');
    try {
      this.reader.releaseLock();
      this.writer.releaseLock();
      const secureSocket = this.socket.startTls();
      this.socket = secureSocket;
      this.reader = secureSocket.readable.getReader();
      this.writer = secureSocket.writable.getWriter();
    } catch (e: any) {
      throw new Error(`Failed to upgrade STARTTLS: ${e.message}`);
    }
  }
}

async function connectSocket(host: string, port: number, secure: 'SSL' | 'TLS' | 'NONE'): Promise<UnifiedSocket> {
  const isCloudflare = typeof (globalThis as any).WebSocketPair !== 'undefined' || typeof (globalThis as any).caches !== 'undefined';
  
  if (isCloudflare) {
    try {
      const moduleName = 'cloudflare:sockets';
      const { connect } = await import(/* @vite-ignore */ moduleName);
      
      let secureTransport: 'on' | 'off' | 'starttls' = 'off';
      if (secure === 'SSL') {
        secureTransport = 'on';
      } else if (secure === 'TLS') {
        secureTransport = 'starttls';
      }
      
      const socket = connect(`${host}:${port}`, { secureTransport });
      return new CloudflareSocket(socket);
    } catch (err: any) {
      throw new Error(`Cloudflare socket connection failed: ${err.message}`);
    }
  } else {
    // Node.js fallback
    if (secure === 'SSL') {
      return new Promise((resolve, reject) => {
        const socket = tls.connect({
          host,
          port,
          rejectUnauthorized: false
        }, () => {
          resolve(new NodeSocket(socket));
        });
        socket.on('error', (err) => reject(new Error(`Node SSL connection failed: ${err.message}`)));
      });
    } else {
      return new Promise((resolve, reject) => {
        const socket = net.connect({
          host,
          port
        }, () => {
          resolve(new NodeSocket(socket));
        });
        socket.on('error', (err) => reject(new Error(`Node TCP connection failed: ${err.message}`)));
      });
    }
  }
}

async function readSMTPResponse(socket: UnifiedSocket): Promise<string> {
  let response = '';
  const timeout = 10000; // 10s timeout
  const startTime = Date.now();
  
  while (true) {
    if (Date.now() - startTime > timeout) {
      throw new Error('SMTP Error: Response timeout.');
    }
    const chunk = await socket.read();
    if (!chunk) {
      if (response) return response;
      throw new Error('SMTP Error: Connection closed by remote host.');
    }
    response += chunk;
    
    // Check if the response ends with a line starting with 3-digit status code followed by a space
    const lines = response.split('\r\n');
    if (lines.length >= 2) {
      const lastLine = lines[lines.length - 2];
      if (/^\d{3} /.test(lastLine)) {
        break;
      }
    }
  }
  return response;
}

async function executeSMTPCommand(socket: UnifiedSocket, command: string, expectedCodes: string[]): Promise<string> {
  if (command) {
    await socket.write(command + '\r\n');
  }
  const response = await readSMTPResponse(socket);
  const lines = response.split('\r\n');
  // Get the last non-empty line of the response to determine the SMTP status code
  const lastLine = lines[lines.length - 2] || '';
  const code = lastLine.substring(0, 3);
  
  if (!expectedCodes.includes(code)) {
    throw new Error(`SMTP Server Error: Expected one of [${expectedCodes.join(', ')}], got: "${lastLine}"`);
  }
  return response;
}

export class SmtpClient {
  static async sendMail(config: SMTPConfig, mail: MailEnvelope): Promise<{ success: boolean; responseCode: string }> {
    let socket: UnifiedSocket | null = null;
    try {
      socket = await connectSocket(config.host, config.port, config.secure);
      
      // 1. Read Greeting
      const greeting = await executeSMTPCommand(socket, '', ['220']);
      let lastResponse = greeting;

      // 2. EHLO
      lastResponse = await executeSMTPCommand(socket, `EHLO ${config.host}`, ['250']);
      
      // 3. STARTTLS Upgrade if using TLS (port 587 usually)
      if (config.secure === 'TLS') {
        await executeSMTPCommand(socket, 'STARTTLS', ['220']);
        await socket.startTls();
        // Send EHLO again after upgrading TLS
        lastResponse = await executeSMTPCommand(socket, `EHLO ${config.host}`, ['250']);
      }
      
      // 4. Authentication if credentials are provided
      if (config.user && config.pass) {
        await executeSMTPCommand(socket, 'AUTH LOGIN', ['334']);
        const base64User = utf8ToBase64(config.user);
        await executeSMTPCommand(socket, base64User, ['334']);
        const base64Pass = utf8ToBase64(config.pass);
        lastResponse = await executeSMTPCommand(socket, base64Pass, ['235']);
      }
      
      // 5. MAIL FROM
      await executeSMTPCommand(socket, `MAIL FROM:<${config.fromEmail}>`, ['250']);
      
      // 6. RCPT TO
      await executeSMTPCommand(socket, `RCPT TO:<${mail.to}>`, ['250']);
      
      // 7. DATA
      await executeSMTPCommand(socket, 'DATA', ['354']);
      
      // 8. Headers & Body
      const subjectBase64 = utf8ToBase64(mail.subject);
      const fromNameBase64 = utf8ToBase64(config.fromName);
      
      const messageContent = [
        `From: =?UTF-8?B?${fromNameBase64}?= <${config.fromEmail}>`,
        `To: <${mail.to}>`,
        `Subject: =?UTF-8?B?${subjectBase64}?=`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=utf-8',
        'Content-Transfer-Encoding: base64',
        '',
        // Chunk body in base64 to avoid long lines SMTP limitations
        utf8ToBase64(mail.html).match(/.{1,76}/g)?.join('\r\n') || '',
        '.'
      ].join('\r\n');
      
      lastResponse = await executeSMTPCommand(socket, messageContent, ['250']);
      
      // 9. QUIT
      try {
        await executeSMTPCommand(socket, 'QUIT', ['221']);
      } catch (e) {}
      
      const lines = lastResponse.split('\r\n');
      const responseCode = lines[lines.length - 2] || '250 OK';
      
      return { success: true, responseCode };
    } catch (err: any) {
      throw err;
    } finally {
      if (socket) {
        try {
          await socket.close();
        } catch (e) {}
      }
    }
  }
}
