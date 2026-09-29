import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { 
  Client as DiscordClient, 
  GatewayIntentBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  Events 
} from 'discord.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));

// ───────────────────────── AUTH HELPERS ─────────────────────────
// SESSION_SECRET: урт, санамсаргүй тэмдэгт мөр (.env / Vercel env-д тохируулна)
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) {
  console.warn('[auth] SESSION_SECRET тохируулаагүй тул restart хийх бүрт бүх session хүчингүй болно.');
}
// OWNER_DISCORD_ID: owner-ийн Discord ID (таслалаар тусгаарлаж хэд ч болно)
const OWNER_DISCORD_IDS = (process.env.OWNER_DISCORD_ID || '')
  .split(',').map((x) => x.trim()).filter(Boolean);
if (OWNER_DISCORD_IDS.length === 0) {
  console.warn('[auth] OWNER_DISCORD_ID тохируулаагүй тул owner нэвтрэх боломжгүй.');
}

interface Session { sub: string; name: string; role: 'owner' | 'user'; exp: number }

const b64url = (buf: Buffer | string) => Buffer.from(buf).toString('base64url');
const hmac = (data: string) => crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function signSession(data: Omit<Session, 'exp'>, ttlSec = 7 * 24 * 3600): string {
  const body = b64url(JSON.stringify({ ...data, exp: Math.floor(Date.now() / 1000) + ttlSec }));
  return `${body}.${hmac(body)}`;
}

function verifySession(token?: string): Session | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig || !safeEqual(sig, hmac(body))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as Session;
    return data.exp > Math.floor(Date.now() / 1000) ? data : null;
  } catch {
    return null;
  }
}

function getSession(req: Request): Session | null {
  const h = req.headers.authorization || '';
  return verifySession(h.startsWith('Bearer ') ? h.slice(7) : undefined);
}

function requireOwner(req: Request, res: Response, next: NextFunction): void {
  const session = getSession(req);
  if (!session || session.role !== 'owner') {
    res.status(403).json({ error: 'Зөвхөн owner хандах эрхтэй.' });
    return;
  }
  (req as any).session = session;
  next();
}

// Discord дахь Approve/Decline холбоос дээр тавих гарын үсэг
const signAction = (id: string, action: string) => hmac(`payment:${id}:${action}`);

function getBaseUrl(req: Request): string {
  const env = process.env.APP_URL;
  if (env && /^https?:\/\//.test(env)) return env.replace(/\/$/, '');
  const protocol = (req.headers['x-forwarded-proto'] as string) || (req.secure ? 'https' : 'http');
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'localhost:3000';
  return `${protocol}://${host}`;
}

function readCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

// Initialize Google GenAI client with required header
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to build tailored system prompt based on mode & subject
function getSystemInstruction(mode: string, subject?: string): string {
  const baseRules = `You are Gemini Mind, an ultra-advanced AI reasoning assistant, tutor, homework solver, and software builder inspired by Google Gemini.
You are fully fluent in both Mongolian (Монгол хэл) and English. When the user asks in Mongolian, respond primarily in natural, clear, accurate Mongolian, maintaining precise technical, scientific, and mathematical terms.
You excel at:
1. Solving complex math, physics, chemistry, and STEM problems step-by-step with clear formulas, givens, solution steps, and final verified answers.
2. Assisting with all school and university subjects (Biology, History, Mongolian Grammar & Literature, English/IELTS/TOEFL, Computer Science, Economics).
3. Utilizing Google Search grounding to retrieve real-time facts, recent news, social trends, scientific papers, and accurate references with citations.
4. Writing clean, production-ready code (HTML/Tailwind/JS, React, Python, C++, etc.) with explanations and interactive executable sandboxes.

Formatting instructions:
- Use clean Markdown formatting with clear headings, bullet points, bold key terms, and code blocks with language identifiers.
- For math formulas, use readable mathematical notation (e.g. LaTeX style $...$ or standard algebraic notation like E = mc^2, ∫ f(x)dx).
- Always be encouraging, intellectually rigorous, insightful, and concise yet thorough.`;

  if (mode === 'math') {
    return `${baseRules}
MODE FOCUS: MATHEMATICAL & STEM PROBLEM SOLVER.
When solving problems:
1. 🎯 **Өгөгдсөн нь (Given)**: List down all known variables, constants, and problem constraints.
2. ❓ **Олох нь (To Find)**: State what needs to be solved.
3. 📐 **Ашиглах томьёо (Formulas & Laws)**: State relevant mathematical theorems, physical laws, or chemical equations.
4. 📝 **Бодолт (Step-by-Step Solution)**: Show clear algebraic steps, substitutions, and calculations.
5. ✅ **Хариу & Шалгах (Final Answer & Verification)**: Highlight the final answer clearly with units (e.g., см, кг, м/с, моль, эсвэл x = 5) and briefly verify why it makes physical/mathematical sense.`;
  }

  if (mode === 'homework') {
    return `${baseRules}
MODE FOCUS: ALL SCHOOL SUBJECTS TUTOR (Бүх хичээлийн туслах).
Subject Context: ${subject || 'General Academic'}.
Provide structured academic guidance. Break down complex historical events, biology mechanisms, grammatical rules, essay outlines, or literature analysis. If providing an answer to a homework question, explain the underlying concept so the student learns the method, not just the raw answer.`;
  }

  if (mode === 'search') {
    return `${baseRules}
MODE FOCUS: REAL-TIME WEB & SOCIAL RESEARCH.
Ground your response with the latest accurate web facts and current information. Synthesize diverse viewpoints, provide factual dates, verified sources, and clear summaries.`;
  }

  if (mode === 'builder') {
    return `${baseRules}
MODE FOCUS: FULL-STACK AI BUILDER & CODE SANDBOX.
Provide clean, self-contained, runnable code (HTML, CSS, JavaScript/TypeScript, React, Python). When creating UI components, use modern Tailwind CSS classes and clean modern aesthetics. Always include interactive elements when asked to build tools.`;
  }

  return baseRules;
}

// Helper to get response stream with model fallback
async function getGenerateContentStream(contents: any[], config: any) {
  const models = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents,
        config,
      });
      return stream;
    } catch (err: any) {
      console.warn(`Model ${model} failed in stream:`, err.message);
      lastError = err;
    }
  }

  throw lastError;
}

// Helper for non-streaming generation with fallback
async function getGenerateContent(contents: any[], config: any) {
  const models = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });
      return response;
    } catch (err: any) {
      console.warn(`Model ${model} failed in chat:`, err.message);
      lastError = err;
    }
  }

  throw lastError;
}

// Streaming chat endpoint
app.post('/api/gemini/stream', async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages, mode = 'general', subject, webSearch = false } = req.body;

    if (!apiKey) {
      res.status(500).json({ error: 'GEMINI_API_KEY is not configured in the environment.' });
      return;
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required.' });
      return;
    }

    // Prepare contents
    const contents: any[] = messages
      .filter((m: any) => (m.content && m.content.trim()) || m.image)
      .map((m: any) => {
        const parts: any[] = [];
        if (m.image) {
          const base64Data = m.image.includes(';base64,') 
            ? m.image.split(';base64,')[1] 
            : m.image;
          parts.push({
            inlineData: {
              mimeType: m.mimeType || 'image/jpeg',
              data: base64Data,
            },
          });
        }
        if (m.content && m.content.trim()) {
          parts.push({ text: m.content });
        } else if (parts.length === 0) {
          parts.push({ text: ' ' });
        }
        return {
          role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
          parts,
        };
      });

    const systemInstruction = getSystemInstruction(mode, subject);

    const config: any = {
      systemInstruction,
    };

    // Enable Google Search tool if requested or in search mode
    if (webSearch || mode === 'search') {
      config.tools = [{ googleSearch: {} }];
    }

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const responseStream = await getGenerateContentStream(contents, config);

    let groundingMetadata: any = null;

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (chunk.candidates?.[0]?.groundingMetadata) {
        groundingMetadata = chunk.candidates[0].groundingMetadata;
      }
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    // If grounding was extracted, send it as final metadata event
    if (groundingMetadata) {
      const citations = groundingMetadata.groundingChunks?.map((chunk: any) => ({
        title: chunk.web?.title || 'Web Source',
        uri: chunk.web?.uri || '',
      })).filter((c: any) => c.uri) || [];

      const searchQueries = groundingMetadata.webSearchQueries || [];

      res.write(`data: ${JSON.stringify({ citations, searchQueries, done: true })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    }

    res.end();
  } catch (error: any) {
    console.error('Error in /api/gemini/stream:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'Internal AI generation error' });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message || 'Stream generation failed' })}\n\n`);
      res.end();
    }
  }
});

// Non-streaming chat / solve endpoint
app.post('/api/gemini/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages, mode = 'general', subject, webSearch = false } = req.body;

    if (!apiKey) {
      res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
      return;
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required.' });
      return;
    }

    const contents: any[] = messages
      .filter((m: any) => (m.content && m.content.trim()) || m.image)
      .map((m: any) => {
        const parts: any[] = [];
        if (m.image) {
          const base64Data = m.image.includes(';base64,') 
            ? m.image.split(';base64,')[1] 
            : m.image;
          parts.push({
            inlineData: {
              mimeType: m.mimeType || 'image/jpeg',
              data: base64Data,
            },
          });
        }
        if (m.content && m.content.trim()) {
          parts.push({ text: m.content });
        } else if (parts.length === 0) {
          parts.push({ text: ' ' });
        }
        return {
          role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
          parts,
        };
      });

    const systemInstruction = getSystemInstruction(mode, subject);
    const config: any = {
      systemInstruction,
    };

    if (webSearch || mode === 'search') {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await getGenerateContent(contents, config);

    const text = response.text || '';
    const grounding = response.candidates?.[0]?.groundingMetadata;
    const citations = grounding?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || 'Web Source',
      uri: chunk.web?.uri || '',
    })).filter((c: any) => c.uri) || [];
    const searchQueries = grounding?.webSearchQueries || [];

    res.json({
      text,
      citations,
      searchQueries,
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/chat:', error);
    res.status(500).json({ error: error.message || 'AI request failed' });
  }
});

// Quick solver for homework and math diagrams with vision
app.post('/api/gemini/solve-problem', async (req: Request, res: Response): Promise<void> => {
  try {
    const { problemText, image, mimeType, subject, gradeLevel } = req.body;

    if (!apiKey) {
      res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
      return;
    }

    const parts: any[] = [];
    if (image) {
      const base64Data = image.includes(';base64,') ? image.split(';base64,')[1] : image;
      parts.push({
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: base64Data,
        },
      });
    }

    const promptText = `Solve the following academic/homework problem with meticulous step-by-step logic in Mongolian (with English terms in brackets if useful).
Subject: ${subject || 'Auto-detect'}
Grade Level: ${gradeLevel || 'Secondary / High School / University'}
Problem: ${problemText || 'Analyze the provided image and solve the problem shown.'}

Structure your response with:
1. 📋 **Бодлогын нөхцөл (Problem Statement)**: Clear restatement of the question.
2. 🎯 **Өгөгдсөн ба олох утгууд (Given & Target)**: Variables, units, constants.
3. 📐 **Холбогдох томьёо, онол (Formulas & Concepts)**: Key equations.
4. 🧠 **Бодолтын алхам (Step-by-step Execution)**: Explicit mathematical/logical derivations.
5. 💡 **Эцсийн хариу (Final Answer)**: Distinctly boxed or bolded result with proper units.
6. 🔍 **Зөвлөгөө & Шалгалт (Tip & Sanity Check)**: Quick check why this result is correct.`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        systemInstruction: getSystemInstruction('math', subject),
      },
    });

    res.json({
      result: response.text || '',
    });
  } catch (error: any) {
    console.error('Error in /api/gemini/solve-problem:', error);
    res.status(500).json({ error: error.message || 'Problem solving failed' });
  }
});

// In-memory transactions cache with persistence
interface StoredTransaction {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  planId: string;
  planName: string;
  amount: number;
  tokensGranted: number;
  status: 'pending' | 'approved' | 'declined';
  accountNumber: string;
  receiptImage?: string;
  note?: string;
  createdAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
}

const transactionsMap = new Map<string, StoredTransaction>();

// Discord Webhook Notification Endpoint for Bank Payment Receipts
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

// Discord Bot & OAuth Configuration with File Persistence
interface DiscordConfig {
  botToken: string;
  clientId: string;
  clientSecret: string;
  channelId: string;
}

const DISCORD_CONFIG_FILE = path.join(__dirname, 'discord-config.json');

function loadDiscordConfig(): DiscordConfig {
  try {
    if (fs.existsSync(DISCORD_CONFIG_FILE)) {
      const data = JSON.parse(fs.readFileSync(DISCORD_CONFIG_FILE, 'utf-8'));
      return {
        botToken: data.botToken || process.env.DISCORD_BOT_TOKEN || '',
        clientId: data.clientId || process.env.DISCORD_CLIENT_ID || '',
        clientSecret: data.clientSecret || process.env.DISCORD_CLIENT_SECRET || '',
        channelId: data.channelId || process.env.DISCORD_CHANNEL_ID || '',
      };
    }
  } catch (e) {}
  return {
    botToken: process.env.DISCORD_BOT_TOKEN || '',
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    channelId: process.env.DISCORD_CHANNEL_ID || '',
  };
}

function saveDiscordConfig(cfg: DiscordConfig) {
  try {
    fs.writeFileSync(DISCORD_CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to save discord config file:', e);
  }
}

const discordConfig: DiscordConfig = loadDiscordConfig();

let discordBotClient: DiscordClient | null = null;
let isBotConnecting = false;

// Transaction helper to approve
function handleApproveTransaction(id: string, reviewer = 'Discord Action') {
  const tx = transactionsMap.get(id);
  if (tx) {
    tx.status = 'approved';
    tx.reviewedAt = Date.now();
    tx.reviewedBy = reviewer;
    transactionsMap.set(id, tx);
  } else {
    transactionsMap.set(id, {
      id,
      userId: 'user',
      userName: 'Хэрэглэгч',
      userEmail: 'хэрэглэгч',
      planId: 'pro',
      planName: 'Багц',
      amount: 25000,
      tokensGranted: 250000,
      status: 'approved',
      accountNumber: 'MN510050099106696285',
      createdAt: Date.now(),
      reviewedAt: Date.now(),
      reviewedBy: reviewer,
    });
  }
}

// Transaction helper to decline
function handleDeclineTransaction(id: string, reviewer = 'Discord Action') {
  const tx = transactionsMap.get(id);
  if (tx) {
    tx.status = 'declined';
    tx.reviewedAt = Date.now();
    tx.reviewedBy = reviewer;
    transactionsMap.set(id, tx);
  } else {
    transactionsMap.set(id, {
      id,
      userId: 'user',
      userName: 'Хэрэглэгч',
      userEmail: 'хэрэглэгч',
      planId: 'pro',
      planName: 'Багц',
      amount: 25000,
      tokensGranted: 250000,
      status: 'declined',
      accountNumber: 'MN510050099106696285',
      createdAt: Date.now(),
      reviewedAt: Date.now(),
      reviewedBy: reviewer,
    });
  }
}

// Initialize Discord Bot if token available
async function startDiscordBot(token: string) {
  if (!token || isBotConnecting) return;
  try {
    isBotConnecting = true;
    if (discordBotClient) {
      await discordBotClient.destroy();
    }
    discordBotClient = new DiscordClient({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    discordBotClient.on(Events.ClientReady, () => {
      console.log(`🤖 Discord Bot logged in as ${discordBotClient?.user?.tag}`);
    });

    // Handle button clicks in Discord (100% inside Discord, NO Google 403!)
    discordBotClient.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isButton()) return;
      const [action, txId] = interaction.customId.split(':');
      if (action === 'approve' && txId) {
        handleApproveTransaction(txId, `Discord Button (@${interaction.user.tag})`);
        await interaction.reply({
          content: `✅ **ТӨЛБӨР БАТАЛГААЖЛАА!** ID: \`${txId}\` амжилттай зөвшөөрөгдөж, хэрэглэгчийн токен идэвхжлээ. (Шалгасан: ${interaction.user.tag})`,
        });
      } else if (action === 'decline' && txId) {
        handleDeclineTransaction(txId, `Discord Button (@${interaction.user.tag})`);
        await interaction.reply({
          content: `❌ **ТӨЛБӨР ТАТГАЛЗАГДЛАА!** ID: \`${txId}\` цуцлагдлаа. (Шалгасан: ${interaction.user.tag})`,
        });
      }
    });

    // Handle chat commands in Discord channel (!approve GM-... / !decline GM-...)
    discordBotClient.on(Events.MessageCreate, async (msg) => {
      if (msg.author.bot) return;
      const content = msg.content.trim();
      if (content.startsWith('!approve ') || content.startsWith('/approve ')) {
        const txId = content.split(' ')[1]?.trim();
        if (txId) {
          handleApproveTransaction(txId, `Discord Chat (@${msg.author.tag})`);
          await msg.reply(`✅ **ТӨЛБӨР БАТАЛГААЖЛАА!** \`${txId}\` зөвшөөрөгдөж, хэрэглэгчийн эрх нээгдлээ.`);
        }
      } else if (content.startsWith('!decline ') || content.startsWith('/decline ')) {
        const txId = content.split(' ')[1]?.trim();
        if (txId) {
          handleDeclineTransaction(txId, `Discord Chat (@${msg.author.tag})`);
          await msg.reply(`❌ **ТӨЛБӨР ТАТГАЛЗАГДЛАА!** \`${txId}\` цуцлагдлаа.`);
        }
      }
    });

    await discordBotClient.login(token);
    discordConfig.botToken = token;
  } catch (err: any) {
    console.warn('Discord bot login warning:', err.message);
  } finally {
    isBotConnecting = false;
  }
}

if (discordConfig.botToken) {
  startDiscordBot(discordConfig.botToken);
}

// Helper to notify Discord webhook
async function sendDiscordNotification(payload: any) {
  if (!DISCORD_WEBHOOK_URL) {
    console.warn('DISCORD_WEBHOOK_URL тохируулаагүй тул мэдэгдэл илгээгдсэнгүй.');
    return;
  }
  try {
    const res = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn('Discord webhook notice:', res.status, await res.text());
    }
  } catch (e) {
    console.error('Discord webhook error:', e);
  }
}

// 1. Submit Payment Receipt -> Discord Notification with Approve / Decline links
app.post('/api/payment/notify-discord', async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      userId = 'guest',
      userName = 'Хэрэглэгч', 
      userEmail = 'тодорхойгүй', 
      planId = 'pro',
      planName = 'Сурагч Standard', 
      amount = 25000, 
      accountNumber = 'MN510050099106696285', 
      transactionRef = 'GM-PAY',
      tokensGranted = 250000,
      receiptImage,
      note
    } = req.body;

    const id = transactionRef;
    const protocol = (req.headers['x-forwarded-proto'] as string) || (req.secure ? 'https' : 'http');
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    const approveUrl = `${baseUrl}/api/payment/action?id=${encodeURIComponent(id)}&action=approve&sig=${signAction(id, 'approve')}`;
    const declineUrl = `${baseUrl}/api/payment/action?id=${encodeURIComponent(id)}&action=decline&sig=${signAction(id, 'decline')}`;

    const tx: StoredTransaction = {
      id,
      userId,
      userName,
      userEmail,
      planId,
      planName,
      amount: Number(amount),
      tokensGranted: Number(tokensGranted),
      status: 'pending', // Starts as pending verification
      accountNumber,
      receiptImage,
      note,
      createdAt: Date.now(),
    };

    transactionsMap.set(id, tx);

    // If Discord Bot is connected, send real in-Discord buttons (100% inside Discord, no 403!)
    if (discordBotClient && discordBotClient.isReady()) {
      try {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`approve:${id}`)
            .setLabel('ЗӨВШӨӨРӨХ (APPROVE)')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
          new ButtonBuilder()
            .setCustomId(`decline:${id}`)
            .setLabel('ТАТГАЛЗАХ (DECLINE)')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
        );

        let targetChannel: any = null;
        if (discordConfig.channelId) {
          targetChannel = await discordBotClient.channels.fetch(discordConfig.channelId);
        } else {
          for (const guild of discordBotClient.guilds.cache.values()) {
            const ch = guild.channels.cache.find((c: any) => c.isTextBased() && c.permissionsFor(guild.members.me!)?.has('SendMessages'));
            if (ch) {
              targetChannel = ch;
              break;
            }
          }
        }

        if (targetChannel && targetChannel.isTextBased()) {
          await targetChannel.send({
            content: `🔔 **Шинэ төлбөрийн баримт ирлээ!**\nХэрэглэгч: **${userName}** (${userEmail})\nБагц: **${planName}** · Дүн: **${Number(amount).toLocaleString()} ₮**\nКод: \`${id}\`\n*(Доорх товчийг дарж Discord дотроосоо шууд зөвшөөрөх эсвэл \`!approve ${id}\` гэж бичнэ үү)*`,
            components: [row],
          });
        }
      } catch (botSendErr) {
        console.warn('Bot send interactive button notice:', botSendErr);
      }
    }

    const embedFields = [
      { name: '👤 Хэрэглэгч', value: `**${userName}**\n\`${userEmail}\``, inline: true },
      { name: '📦 Сонгосон Багц', value: `**${planName}**`, inline: true },
      { name: '💰 Төлбөрийн Дүн', value: `**${Number(amount).toLocaleString()} ₮**`, inline: true },
      { name: '🏦 Хүлээн Авсан Данс', value: `\`${accountNumber}\``, inline: true },
      { name: '📝 Гүйлгээний Утга / Код', value: `\`${transactionRef}\``, inline: true },
      { name: '⚡ Олгогдох Токен', value: `**+${Number(tokensGranted).toLocaleString()} токен**`, inline: true },
      { name: '⏳ Төлөв', value: '🟡 **Шалгалт хүлээгдэж байна (Pending)**', inline: true },
      { name: '⏰ Хугацаа', value: new Date().toLocaleString('mn-MN', { timeZone: 'Asia/Ulaanbaatar' }), inline: true },
      {
        name: '⚡ ҮЙЛДЭЛ СОНГОХ (APPROVE / DECLINE)',
        value: `👉 [✅ **ЗӨВШӨӨРӨХ (APPROVE)**](${approveUrl})\n👉 [❌ **ТАТГАЛЗАХ (DECLINE)**](${declineUrl})\n\n💡 *Зөвлөмж: Хэрэв Discord-оос дарахад Google 403 заавал [Gemini Mind Вэб Апп](${baseUrl}) руугаа ороход дэлгэцийн дээр **Шууд Approve** товч гарч ирнэ.*`,
        inline: false
      }
    ];

    if (note) {
      embedFields.push({ name: '💬 Тэмдэглэл / Утас', value: String(note), inline: false });
    }

    const discordPayload: any = {
      username: 'Gemini Mind Billing Bot',
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=geminimind-billing&backgroundColor=1e293b',
      content: `🔔 **Шинэ төлбөрийн баримт ирлээ! Баталгаажуулна уу.**\nХэрэглэгч **${userName}** (${userEmail}) **${Number(amount).toLocaleString()} ₮** шилжүүлэв.`,
      embeds: [
        {
          title: '💳 Шинэ Төлбөрийн Баримт (Баталгаажуулах шаардлагатай)',
          color: 0xf59e0b, // Amber yellow for pending
          description: `Төлбөрийг шалгаад доорх **APPROVE** эсвэл **DECLINE** дээр дарна уу:`,
          fields: embedFields,
          footer: {
            text: `Gemini Mind · Төлбөрийн Систем · ID: ${id}`,
          },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    if (receiptImage && typeof receiptImage === 'string' && receiptImage.startsWith('http')) {
      discordPayload.embeds[0].image = { url: receiptImage };
    }

    await sendDiscordNotification(discordPayload);

    res.json({
      success: true,
      id,
      status: 'pending',
      message: 'Төлбөрийн баримт илгээгдлээ. Discord-оор баталгаажуулах хүсэлт очлоо.',
    });
  } catch (error: any) {
    console.error('Error submitting payment:', error);
    res.status(500).json({ error: error.message || 'Төлбөр бүртгэхэд алдаа гарлаа' });
  }
});

// 2. Action Endpoint (Clicked directly from Discord Webhook by Owner)
app.get('/api/payment/action', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, action, sig } = req.query;
    if (!id || typeof id !== 'string') {
      res.status(400).send('Гүйлгээний ID байхгүй байна.');
      return;
    }
    if (typeof action !== 'string' || typeof sig !== 'string' || !safeEqual(sig, signAction(id, action))) {
      res.status(403).send('Холбоос хүчингүй эсвэл гарын үсэг таарахгүй байна.');
      return;
    }

    const tx = transactionsMap.get(id);
    const newStatus = action === 'approve' ? 'approved' : action === 'decline' ? 'declined' : null;

    if (!newStatus) {
      res.status(400).send('Хүчингүй үйлдэл. Зөвхөн approve эсвэл decline зөвшөөрөгдөнө.');
      return;
    }

    if (tx) {
      tx.status = newStatus;
      tx.reviewedAt = Date.now();
      tx.reviewedBy = 'Discord Owner Action';
      transactionsMap.set(id, tx);
    } else {
      // Create record if not in memory
      transactionsMap.set(id, {
        id,
        userId: 'user',
        userName: 'Хэрэглэгч',
        userEmail: 'хэрэглэгч',
        planId: 'pro',
        planName: 'Багц',
        amount: 25000,
        tokensGranted: 250000,
        status: newStatus,
        accountNumber: 'MN510050099106696285',
        createdAt: Date.now(),
        reviewedAt: Date.now(),
        reviewedBy: 'Discord Owner Action',
      });
    }

    const currentTx = transactionsMap.get(id)!;
    const isApproved = newStatus === 'approved';

    // Send updated confirmation to Discord
    await sendDiscordNotification({
      username: 'Gemini Mind Billing Bot',
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=geminimind-billing&backgroundColor=1e293b',
      content: isApproved
        ? `✅ **ТӨЛБӨР БАТАЛГААЖЛАА!** ID: \`${id}\` амжилттай ЗӨВШӨӨРӨГДӨЖ, хэрэглэгчийн дансанд **+${currentTx.tokensGranted.toLocaleString()} токен** орлоо.`
        : `❌ **ТӨЛБӨР ТАТГАЛЗАГДЛАА!** ID: \`${id}\` цуцлагдлаа. Хэрэглэгчид багц олгогдоогүй.`,
      embeds: [
        {
          title: isApproved ? '🟢 Төлбөр Баталгаажсан (Approved)' : '🔴 Төлбөр Татгалзсан (Declined)',
          color: isApproved ? 0x10b981 : 0xef4444,
          fields: [
            { name: 'Гүйлгээний ID', value: `\`${id}\``, inline: true },
            { name: 'Хэрэглэгч', value: `${currentTx.userName} (${currentTx.userEmail})`, inline: true },
            { name: 'Төлөв', value: isApproved ? '✅ Зөвшөөрсөн' : '❌ Татгалзсан', inline: true },
            { name: 'Шалгасан цаг', value: new Date().toLocaleString('mn-MN', { timeZone: 'Asia/Ulaanbaatar' }), inline: true },
          ],
          footer: { text: 'Gemini Mind Billing System' },
          timestamp: new Date().toISOString(),
        }
      ]
    });

    // Return polished status page to Owner
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`
      <!DOCTYPE html>
      <html lang="mn">
      <head>
        <meta charset="utf-8">
        <title>${isApproved ? 'Төлбөр Зөвшөөрөгдлөө' : 'Төлбөр Татгалзагдлаа'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
          .card { background: #1e293b; border-radius: 24px; padding: 32px; max-width: 440px; width: 100%; text-align: center; border: 1px solid ${isApproved ? '#10b981' : '#ef4444'}; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
          .icon { width: 64px; height: 64px; border-radius: 50%; background: ${isApproved ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}; color: ${isApproved ? '#10b981' : '#ef4444'}; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 16px; }
          h2 { margin: 0 0 8px; font-size: 22px; font-weight: 800; }
          p { color: #94a3b8; font-size: 14px; line-height: 1.5; margin: 0 0 20px; }
          .badge { display: inline-block; padding: 6px 16px; border-radius: 999px; font-weight: 700; font-size: 13px; background: ${isApproved ? '#10b981' : '#ef4444'}; color: #0f172a; margin-bottom: 20px; }
          .btn { display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 14px; transition: opacity 0.2s; }
          .btn:hover { opacity: 0.9; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">${isApproved ? '✓' : '✕'}</div>
          <div class="badge">${isApproved ? 'АМЖИЛТТАЙ ЗӨВШӨӨРӨГДЛӨӨ' : 'ТАТГАЛЗАГДЛАА'}</div>
          <h2>Гүйлгээ: ${id}</h2>
          <p>${isApproved ? 'Хэрэглэгчийн багц ба токен систем дээр шууд идэвхжлээ. Discord-д баталгаажуулалт тэмдэглэгдсэн.' : 'Энэхүү төлбөрийн баримтыг татгалзлаа. Хэрэглэгчийн дэлгэцэнд цуцлагдсан төлөв харагдана.'}</p>
          <a href="/" class="btn">Апп руу буцах</a>
        </div>
      </body>
      </html>
    `);
  } catch (error: any) {
    console.error('Error handling payment action:', error);
    res.status(500).send('Алдаа гарлаа: ' + error.message);
  }
});

// 3. Poll Status for user's PaymentReceiptModal
app.get('/api/payment/status/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const tx = transactionsMap.get(id);
  if (!tx) {
    res.json({ status: 'pending', id });
    return;
  }
  res.json({
    id: tx.id,
    status: tx.status,
    planId: tx.planId,
    tokensGranted: tx.tokensGranted,
    reviewedAt: tx.reviewedAt,
  });
});

// 4. Get all transactions (for Owner Admin Console)
app.get('/api/payment/all', requireOwner, (_req: Request, res: Response): void => {
  const list = Array.from(transactionsMap.values()).reverse();
  res.json({ transactions: list });
});

// 5. In-app Owner review endpoint (Approve/Decline from Owner Console)
app.post('/api/payment/review', requireOwner, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, action } = req.body;
    const reviewer = (req as any).session?.name || 'Owner Console';
    if (!id || !action) {
      res.status(400).json({ error: 'id and action required' });
      return;
    }

    const tx = transactionsMap.get(id);
    const newStatus = action === 'approve' ? 'approved' : 'declined';

    if (tx) {
      tx.status = newStatus;
      tx.reviewedAt = Date.now();
      tx.reviewedBy = reviewer;
      transactionsMap.set(id, tx);
    } else {
      transactionsMap.set(id, {
        id,
        userId: 'user',
        userName: 'Хэрэглэгч',
        userEmail: 'хэрэглэгч',
        planId: 'pro',
        planName: 'Багц',
        amount: 25000,
        tokensGranted: 250000,
        status: newStatus,
        accountNumber: 'MN510050099106696285',
        createdAt: Date.now(),
        reviewedAt: Date.now(),
        reviewedBy: reviewer,
      });
    }

    const currentTx = transactionsMap.get(id)!;
    const isApproved = newStatus === 'approved';

    await sendDiscordNotification({
      username: 'Gemini Mind Billing Bot',
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=geminimind-billing&backgroundColor=1e293b',
      content: isApproved
        ? `✅ **ТӨЛБӨР БАТАЛГААЖЛАА!** ID: \`${id}\` Owner Консолоос ЗӨВШӨӨРӨГДӨВ.`
        : `❌ **ТӨЛБӨР ТАТГАЛЗАГДЛАА!** ID: \`${id}\` Owner Консолоос цуцлагдав.`,
    });

    res.json({ success: true, status: newStatus });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Discord Bot & OAuth Configuration Get/Set
app.get('/api/discord/config', requireOwner, (_req: Request, res: Response) => {
  res.json({
    hasBotToken: !!discordConfig.botToken,
    clientId: discordConfig.clientId,
    hasClientSecret: !!discordConfig.clientSecret,
    channelId: discordConfig.channelId,
    botUsername: discordBotClient?.user?.tag || null,
    isBotOnline: !!discordBotClient?.isReady(),
  });
});

app.post('/api/discord/config', requireOwner, async (req: Request, res: Response) => {
  try {
    const { botToken, clientId, clientSecret, channelId } = req.body;
    const botTokenChanged = botToken !== undefined && String(botToken).trim() !== discordConfig.botToken;
    if (clientId !== undefined) discordConfig.clientId = String(clientId).trim();
    if (clientSecret !== undefined) discordConfig.clientSecret = String(clientSecret).trim();
    if (channelId !== undefined) discordConfig.channelId = String(channelId).trim();
    if (botToken !== undefined) discordConfig.botToken = String(botToken).trim();

    saveDiscordConfig(discordConfig);

    if (botTokenChanged && discordConfig.botToken) {
      await startDiscordBot(discordConfig.botToken);
    }

    res.json({
      success: true,
      hasBotToken: !!discordConfig.botToken,
      hasClientId: !!discordConfig.clientId,
      clientId: discordConfig.clientId,
      hasClientSecret: !!discordConfig.clientSecret,
      botUsername: discordBotClient?.user?.tag || null,
      isBotOnline: !!discordBotClient?.isReady(),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Discord OAuth 2.0: нэвтрэх URL үүсгэх (CSRF хамгаалалттай `state`-тэй)
app.get('/api/auth/discord/url', (req: Request, res: Response): void => {
  const redirectUri = `${getBaseUrl(req)}/api/auth/discord/callback`;

  const clientId = discordConfig.clientId;
  if (!clientId) {
    res.status(400).json({
      error: 'NO_CLIENT_ID',
      message: 'Discord Application Client ID тохируулаагүй байна.',
      redirectUri,
    });
    return;
  }

  const state = crypto.randomBytes(16).toString('hex');
  res.cookie('oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: redirectUri.startsWith('https'),
    maxAge: 10 * 60 * 1000,
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email',
    state,
  });

  res.json({ url: `https://discord.com/oauth2/authorize?${params.toString()}`, redirectUri, clientId });
});

const escapeJson = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');

function oauthResultPage(opts: { ok: boolean; origin: string; profile?: any; message?: string }): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Discord Login</title>
    <style>
      body { background: #0f172a; color: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
      .box { text-align: center; background: #1e293b; padding: 32px; border-radius: 20px; border: 1px solid ${opts.ok ? '#5865f2' : '#ef4444'}; max-width: 360px; }
      h3 { color: ${opts.ok ? '#5865f2' : '#ef4444'}; margin: 0 0 8px; }
      p { font-size: 13px; color: #94a3b8; }
    </style>
  </head>
  <body>
    <div class="box">
      <h3>${opts.ok ? '✓ Discord-оор амжилттай нэвтэрлээ!' : 'Нэвтрэх амжилтгүй боллоо'}</h3>
      <p>${opts.ok ? 'Цонх автоматаар хаагдана...' : (opts.message || 'Дахин оролдоно уу.')}</p>
    </div>
    <script>
      try {
        if (window.opener && ${opts.ok}) {
          window.opener.postMessage({
            type: 'OAUTH_AUTH_SUCCESS',
            provider: 'discord',
            profile: ${escapeJson(opts.profile || null)}
          }, ${escapeJson(opts.origin)});
          setTimeout(() => window.close(), 600);
        } else if (${opts.ok}) {
          window.location.href = '/';
        }
      } catch (e) {
        window.location.href = '/';
      }
    </script>
  </body>
</html>`;
}

// Discord OAuth 2.0 callback
app.get('/api/auth/discord/callback', async (req: Request, res: Response): Promise<void> => {
  const origin = getBaseUrl(req);
  const fail = (status: number, message: string) => {
    res.status(status).send(oauthResultPage({ ok: false, origin, message }));
  };

  try {
    const { code, state } = req.query;
    if (!code || typeof code !== 'string') return fail(400, 'Authorization code байхгүй байна.');

    // CSRF шалгалт
    const cookieState = readCookie(req, 'oauth_state');
    if (!cookieState || typeof state !== 'string' || !safeEqual(cookieState, state)) {
      return fail(400, 'Нэвтрэх хүсэлт хүчингүй (state таарахгүй). Дахин оролдоно уу.');
    }
    res.clearCookie('oauth_state');

    if (!discordConfig.clientId || !discordConfig.clientSecret) {
      return fail(500, 'Discord Client ID / Secret серверт тохируулаагүй байна.');
    }

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: discordConfig.clientId,
        client_secret: discordConfig.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${origin}/api/auth/discord/callback`,
      }),
    });
    if (!tokenRes.ok) return fail(502, 'Discord-оос token авч чадсангүй.');

    const tokenData = await tokenRes.json();
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userRes.ok) return fail(502, 'Discord хэрэглэгчийн мэдээллийг авч чадсангүй.');
    const userData: any = await userRes.json();

    // Owner нь ЗӨВХӨН Discord ID-аар тодорхойлогдоно (нэр, имэйл хуурч болно)
    const isOwner = OWNER_DISCORD_IDS.includes(String(userData.id));
    const displayName = userData.global_name || userData.username;

    const avatarUrl = userData.avatar
      ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
      : `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userData.username)}&backgroundColor=5865F2`;

    const userProfile = {
      id: 'discord_' + userData.id,
      name: displayName,
      email: userData.email || `${userData.username}@discord.gg`,
      avatar: avatarUrl,
      provider: 'discord',
      discordId: userData.id,
      discordUsername: userData.username,
      role: isOwner ? 'owner' : 'user',
      plan: isOwner ? 'owner' : 'free',
      tokenBalance: isOwner ? -1 : 25000,
      tokensUsedTotal: 0,
      streakDays: 5,
      solvedCount: 12,
      // Owner endpoint-уудад `Authorization: Bearer <token>` гэж явуулна
      token: signSession({ sub: 'discord_' + userData.id, name: displayName, role: isOwner ? 'owner' : 'user' }),
    };

    res.send(oauthResultPage({ ok: true, origin, profile: userProfile }));
  } catch (err: any) {
    console.error('Discord OAuth error:', err);
    fail(500, 'Discord OAuth алдаа гарлаа.');
  }
});

// Одоогийн session-ийг шалгах (frontend owner эсэхийг серверээс лавлана)
app.get('/api/auth/me', (req: Request, res: Response): void => {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: 'Нэвтэрээгүй байна.' });
    return;
  }
  res.json({ id: session.sub, name: session.name, role: session.role });
});

// Хуучин "1-click direct login" нь хэн ч owner болох боломжтой байсан тул устгасан.
app.post('/api/auth/discord/direct', (_req: Request, res: Response): void => {
  res.status(410).json({ error: 'Энэ нэвтрэх арга устгагдсан. Discord OAuth ашиглана уу.' });
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', model: 'gemini-3.8-flash', timestamp: new Date().toISOString() });
});

// Setup Vite middlewares in development or static serve in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, () => {
    console.log(`Gemini Mind server running at http://localhost:${port}`);
  });
}

startServer();
