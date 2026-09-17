import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  downloadMediaMessage,
  normalizeMessageContent,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import pino from "pino";
import axios from "axios";
import fs from "fs";

import { config } from "./config.js";

class WhatsAppService {
  private sock: WASocket | null = null;
  private qr: string | null = null;
  private isConnecting = false;

  public isConnected(): boolean {
    return Boolean(this.sock && this.sock.user);
  }

  public getQr(): string | null {
    return this.isConnected() ? null : this.qr;
  }

  public getUser() {
    if (!this.sock?.user) return null;
    return {
      id: this.sock.user.id,
      phone: this.sock.user.id?.split(":")?.[0] || this.sock.user.id,
      name: this.sock.user.name || null,
    };
  }

  public async init(): Promise<void> {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      const { state, saveCreds } = await useMultiFileAuthState(config.authDir);

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }) as any,
      });

      this.sock.ev.on("creds.update", saveCreds);

      this.sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qr = qr;
          console.log("\nScan this QR code to connect WhatsApp:\n");
          qrcode.generate(qr, { small: true });
        }

        if (connection === "open") {
          this.qr = null;
          this.isConnecting = false;
          console.log("WhatsApp connection established successfully!");
        }

        if (connection === "close") {
          this.isConnecting = false;
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(
            `Connection closed. Status: ${statusCode}. Reconnecting: ${shouldReconnect}`
          );

          if (statusCode === DisconnectReason.loggedOut) {
            console.log("Session logged out. Clearing auth directory...");
            try {
              fs.rmSync(config.authDir, { recursive: true, force: true });
            } catch (err) {
              console.error("Error clearing auth directory:", err);
            }
          }

          setTimeout(() => this.init(), shouldReconnect ? 5000 : 3000);
        }
      });

      this.sock.ev.on("messages.upsert", async ({ messages }) => {
        for (const msg of messages) {
          await this.handleInboundMessage(msg);
        }
      });
    } catch (error) {
      this.isConnecting = false;
      this.sock = null;
      console.error("Failed to initialize WhatsApp connection:", error);
      setTimeout(() => this.init(), 5000);
    }
  }

  private async handleInboundMessage(msg: any): Promise<void> {
    try {
      if (!msg.message || msg.key.fromMe) return;

      const remoteJid = msg.key.remoteJid || "";

      // 1-on-1 direct messaging only: ignore groups & status broadcasts
      if (remoteJid.endsWith("@g.us") || remoteJid.includes("broadcast")) return;

      const rawMessage = msg.message;
      const message = normalizeMessageContent(rawMessage) || rawMessage;

      // Unpack viewOnce or ephemeral containers if present
      const unpacked =
        message.viewOnceMessage?.message ||
        message.viewOnceMessageV2?.message ||
        message.viewOnceMessageV2Extension?.message ||
        message.ephemeralMessage?.message ||
        message.documentWithCaptionMessage?.message ||
        message;

      const imageMsg = unpacked.imageMessage || message.imageMessage;
      const audioMsg = unpacked.audioMessage || message.audioMessage || unpacked.voiceMessage;
      const videoMsg = unpacked.videoMessage || message.videoMessage;
      const locationMsg =
        unpacked.locationMessage ||
        message.locationMessage ||
        unpacked.liveLocationMessage ||
        message.liveLocationMessage;

      const text =
        unpacked.conversation ||
        unpacked.extendedTextMessage?.text ||
        imageMsg?.caption ||
        videoMsg?.caption ||
        message.conversation ||
        message.extendedTextMessage?.text ||
        "";

      const phone = remoteJid.replace("@s.whatsapp.net", "");

      if (locationMsg) {
        console.log(`Location received from ${phone}: lat=${locationMsg.degreesLatitude}, lng=${locationMsg.degreesLongitude}`);
      } else if (!text && !imageMsg && !audioMsg && !videoMsg) {
        console.log(`Message from ${phone} has no text/image/audio/video/location. Raw keys:`, Object.keys(unpacked));
      }

      let mediaBase64: string | null = null;
      let mediaType: string | null = null;

      // Extract image or audio media attachment
      const hasImage = Boolean(imageMsg);
      const hasAudio = Boolean(audioMsg);

      if (hasImage || hasAudio) {
        try {
          console.log(`Downloading inbound ${hasImage ? "image" : "audio"} attachment from ${phone}...`);
          const buffer = (await downloadMediaMessage(
            msg,
            "buffer",
            {},
            {
              logger: pino({ level: "silent" }) as any,
              reuploadRequest: this.sock?.updateMediaMessage.bind(this.sock) as any,
            }
          )) as Buffer;

          if (buffer && buffer.length > 0) {
            mediaBase64 = buffer.toString("base64");
            mediaType = hasImage
              ? imageMsg?.mimetype || "image/jpeg"
              : audioMsg?.mimetype || "audio/ogg";
            console.log(`Successfully downloaded media: ${(buffer.length / 1024).toFixed(1)} KB (mimetype: ${mediaType})`);
          }
        } catch (mediaErr: any) {
          console.warn(`Could not download media from WhatsApp message: ${mediaErr?.message || mediaErr}`);
        }
      }

      const payload = {
        from: phone,
        jid: remoteJid,
        senderName: msg.pushName || null,
        text,
        media_base64: mediaBase64,
        location: locationMsg
          ? { lat: locationMsg.degreesLatitude, lng: locationMsg.degreesLongitude }
          : null,
        media_type: mediaType,
        messageId: msg.key.id,
        timestamp: Number(msg.messageTimestamp),
      };

      console.log(`Inbound message from ${phone}: "${text.slice(0, 60)}" (media: ${mediaType || "none"})`);

      await axios.post(config.mainServiceInboundUrl, payload, { timeout: 15000 });
    } catch (error: any) {
      if (error.config?.url) {
        console.error(
          `Failed to dispatch inbound message to ${config.mainServiceInboundUrl}:`,
          error.message
        );
      } else {
        console.error("Error processing inbound message:", error);
      }
    }
  }

  public async sendMessage(
    to: string,
    message: string
  ): Promise<{ messageId: string | null; to: string }> {
    if (!this.sock || !this.sock.user) {
      const err: any = new Error("WhatsApp is not connected or authenticated.");
      err.statusCode = 503;
      throw err;
    }

    const digits = to.replace(/[^0-9]/g, "");
    if (!digits) {
      const err: any = new Error("Invalid phone number provided.");
      err.statusCode = 400;
      throw err;
    }

    const jid = to.includes("@") ? to : `${digits}@s.whatsapp.net`;
    const result = await this.sock.sendMessage(jid, { text: message });

    console.log(`Outbound message sent to ${digits} (ID: ${result?.key?.id})`);

    return {
      messageId: result?.key?.id || null,
      to: digits,
    };
  }
}

export const whatsapp = new WhatsAppService();
