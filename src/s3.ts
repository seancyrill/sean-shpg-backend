import "dotenv/config";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const s3Client = new S3Client({
  region: process.env.AWS_BUCKET_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

//const allowedFileTypes = ["image/jpeg", "image/png"];

//const maxFileSize = 1048576 * 10; // 1 MB

export async function getSignedURL(
  relevantId: number,
  relevantTable: string,
  rounds: number
) {
  let loop: string[] = [];

  for (let i = 0; i < rounds; i++) {
    const randomId = crypto.randomBytes(32).toString("hex");
    const Key = `${relevantTable}/${relevantId}-${randomId}`;

    const putObjectCommand = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key,
    });

    const url = await getSignedUrl(
      s3Client,
      putObjectCommand,
      { expiresIn: 60 } // seconds
    );

    loop.push(url);
  }

  const result = await Promise.all(loop);
  return result;
}

export async function deleteImgS3(
  img_url: string,
  folder: "items" | "users" | "shops"
) {
  const splitUrl = img_url.split("/").slice(-1)[0];
  const Key = `${folder}/${splitUrl}`;

  await Promise.all([
    s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key,
      })
    ),
    s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_THUMBNAIL_BUCKET_NAME,
        Key,
      })
    ),
  ]);
}
