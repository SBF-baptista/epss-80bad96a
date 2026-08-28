// Cliente SMTP mínimo compatível com servidores Postal (respostas multi-linha não padrão)
const enc = new TextEncoder();
const dec = new TextDecoder();

export interface SmtpOptions {
  hostname: string;
  port: number;
  username: string;
  password: string;
  from: string;
  to: string;
  subject: string;
  text: string;
}

function b64(s: string) {
  return btoa(String.fromCharCode(...enc.encode(s)));
}

function mimeSubject(s: string) {
  return /^[\x00-\x7F]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`;
}

class Conn {
  constructor(private conn: Deno.Conn) {}

  async read(): Promise<string> {
    for (let i = 0; i < 20; i++) {
      const buf = new Uint8Array(8192);
      const n = await this.conn.read(buf);
      if (n === null) throw new Error("Conexão SMTP encerrada");
      const chunk = dec.decode(buf.subarray(0, n));
      if (chunk.trim().length > 0) return chunk;
    }
    throw new Error("Sem resposta do servidor SMTP");
  }

  async write(cmd: string) {
    await this.conn.write(enc.encode(cmd + "\r\n"));
  }

  async cmd(command: string, expect: string[]): Promise<string> {
    await this.write(command);
    const res = await this.read();
    const code = res.slice(0, 3);
    if (!expect.includes(code)) {
      throw new Error(`SMTP "${command.split(" ")[0]}" -> ${res.trim().slice(0, 200)}`);
    }
    return res;
  }

  raw() {
    return this.conn;
  }

  close() {
    try {
      this.conn.close();
    } catch (_) {
      // ignore
    }
  }
}

export async function sendMail(o: SmtpOptions): Promise<void> {
  let tcp = await Deno.connect({ hostname: o.hostname, port: o.port });
  let c = new Conn(tcp);
  try {
    const banner = await c.read();
    if (!banner.startsWith("220")) throw new Error(`Banner inesperado: ${banner.trim()}`);

    await c.cmd(`EHLO opm.segsat.com`, ["250"]);
    await c.cmd("STARTTLS", ["220"]);

    const tls = await Deno.startTls(tcp, { hostname: o.hostname });
    c = new Conn(tls);

    await c.cmd(`EHLO opm.segsat.com`, ["250"]);
    await c.cmd("AUTH LOGIN", ["334"]);
    await c.cmd(b64(o.username), ["334"]);
    await c.cmd(b64(o.password), ["235"]);

    await c.cmd(`MAIL FROM:<${o.from}>`, ["250"]);
    await c.cmd(`RCPT TO:<${o.to}>`, ["250", "251"]);
    await c.cmd("DATA", ["354"]);

    const body = o.text.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
    const message = [
      `From: ${o.from}`,
      `To: ${o.to}`,
      `Subject: ${mimeSubject(o.subject)}`,
      `Date: ${new Date().toUTCString()}`,
      "MIME-Version: 1.0",
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: 8bit",
      "",
      body,
      ".",
    ].join("\r\n");

    await c.cmd(message, ["250"]);
    await c.cmd("QUIT", ["221", "250"]).catch(() => {});
  } finally {
    c.close();
  }
}
