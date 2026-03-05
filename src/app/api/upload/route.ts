import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/prisma'; 
import OpenAI from 'openai';
import crypto from 'crypto';

// Fix for "no default export" and "require() forbidden"
import * as pdfParse from 'pdf-parse';

const s3 = new S3Client({
  region: 'us-east-1', 
  endpoint: `http://${process.env.S3_ENDPOINT || 'localhost'}:${process.env.S3_PORT || '9000'}`,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
  },
  forcePathStyle: true, 
});

const openai = new OpenAI({
  baseURL: 'http://192.168.192.199:1234/v1', 
  apiKey: 'not-needed', 
});

function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }
  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const userId = "test-user-id"; 
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const uniqueFileName = `${Date.now()}-${file.name}`;
    const bucketName = process.env.S3_BUCKET_NAME || 'ai-uploads';

    // Upload to MinIO
    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFileName,
      Body: buffer,
      ContentType: file.type,
    }));
    
    const s3Url = `http://${process.env.S3_ENDPOINT || 'localhost'}:${process.env.S3_PORT || '9000'}/${bucketName}/${uniqueFileName}`;

    // PDF Parsing Fix: Bypass TS check for the missing .default property
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parseFunction = (pdfParse as any).default || pdfParse;
    const pdfData = await parseFunction(buffer);
    const rawText = pdfData.text.replace(/\n/g, ' ');

    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email: "test@example.com" }
    });

    const document = await prisma.document.create({
      data: { userId, fileName: file.name, s3Url }
    });

    const chunks = chunkText(rawText);
    for (const chunkContent of chunks) {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-nomic', 
        input: chunkContent,
      });
      
      const vectorString = `[${embeddingResponse.data[0].embedding.join(',')}]`;
      
      await prisma.$executeRaw`
        INSERT INTO "DocumentChunk" ("id", "documentId", "content", "embedding") 
        VALUES (${crypto.randomUUID()}, ${document.id}, ${chunkContent}, ${vectorString}::vector)
      `;
    }

    return NextResponse.json({ success: true, documentId: document.id });
  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}