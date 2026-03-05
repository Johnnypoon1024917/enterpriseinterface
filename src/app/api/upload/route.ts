import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import crypto from 'crypto';

// TypeScript workaround for the older pdf-parse library
const pdfParse = require('pdf-parse');

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize S3 Client (MinIO)
const s3 = new S3Client({
  region: 'us-east-1', 
  endpoint: `http://${process.env.S3_ENDPOINT || 'localhost'}:${process.env.S3_PORT || '9000'}`,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
  },
  forcePathStyle: true, 
});

// Initialize OpenAI (Local Server)
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

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uniqueFileName = `${Date.now()}-${file.name}`;
    const bucketName = process.env.S3_BUCKET_NAME || 'ai-uploads';

    // 1. Upload to MinIO
    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: uniqueFileName,
      Body: buffer,
      ContentType: file.type,
    }));
    
    const s3Url = `http://${process.env.S3_ENDPOINT || 'localhost'}:${process.env.S3_PORT || '9000'}/${bucketName}/${uniqueFileName}`;

    // 2. Parse PDF Text
    const pdfData = await pdfParse(buffer);
    const rawText = pdfData.text.replace(/\n/g, ' ');

    // 3. Ensure User exists and create Document record
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email: "test@example.com" }
    });

    const document = await prisma.document.create({
      data: {
        userId: userId,
        fileName: file.name,
        s3Url: s3Url,
      }
    });

    // 4. Chunk and Vectorize
    const chunks = chunkText(rawText);
    
    for (const chunkContent of chunks) {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-nomic', 
        input: chunkContent,
      });
      
      const vector = embeddingResponse.data[0].embedding;
      const vectorString = `[${vector.join(',')}]`;
      const chunkId = crypto.randomUUID();

      // Insert directly into pgvector
      await prisma.$executeRaw`
        INSERT INTO "DocumentChunk" ("id", "documentId", "content", "embedding") 
        VALUES (${chunkId}, ${document.id}, ${chunkContent}, ${vectorString}::vector)
      `;
    }

    return NextResponse.json({ 
      success: true, 
      documentId: document.id,
      message: `Successfully processed ${chunks.length} chunks.`
    });

  } catch (error) {
    console.error("Upload Pipeline Error:", error);
    return NextResponse.json({ error: "Internal Server Error processing document" }, { status: 500 });
  }
}