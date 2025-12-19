import "server-only";
import * as Minio from "minio";
import type {
  FileMetadata,
  FileStorage,
  UploadOptions,
  UploadUrl,
  UploadUrlOptions,
} from "./file-storage.interface";
import {
  resolveStoragePrefix,
  sanitizeFilename,
  toBuffer,
} from "./storage-utils";
import { FileNotFoundError } from "lib/errors";
import { generateUUID } from "lib/utils";
import logger from "logger";

const STORAGE_PREFIX = resolveStoragePrefix();

// Default MINIO credentials
const DEFAULT_ENDPOINT = "http://localhost:9000";
const DEFAULT_ACCESS_KEY = "minioadmin";
const DEFAULT_SECRET_KEY = "minioadmin";
const DEFAULT_REGION = "us-east-1";
const DEFAULT_USE_SSL = false;

// Helper function to get environment variable with default
const getEnvWithDefault = (name: string, defaultValue: string): string => {
  return process.env[name]?.trim() || defaultValue;
};

// Helper function to get boolean environment variable
const getEnvBoolean = (name: string, defaultValue: boolean): boolean => {
  const value = process.env[name]?.trim().toLowerCase();
  if (value === undefined || value === "") return defaultValue;
  return value === "1" || value === "true";
};

const buildKey = (filename: string): string => {
  const safeName = sanitizeFilename(filename || "file");
  const id = generateUUID();
  const prefix = STORAGE_PREFIX ? `${STORAGE_PREFIX}/` : "";
  return `${prefix}${id}-${safeName}`;
};

const buildPublicUrl = (
  endpoint: string,
  bucket: string,
  key: string,
  useSSL: boolean,
): string => {
  // http://192.168.1.7:9001/api/v1/buckets/uploads/objects/download?preview=true&prefix=uploads/55c8e659-4535-434c-9010-8e96ef0e8791-004.txt&version_id=null
  const protocol = useSSL ? "https" : "http";
  const baseUrl = endpoint.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `${protocol}://${baseUrl}/api/v1/buckets/${bucket}/objects/download?preview=true&prefix=${key}&version_id=null`;
};

// Retry helper
const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
): Promise<T> => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error;
      }

      const isNetworkError =
        error instanceof Error &&
        (error.message.includes("ECONNREFUSED") ||
          error.message.includes("timeout") ||
          error.message.includes("network"));

      if (isNetworkError) {
        logger.warn(
          `MINIO operation failed (attempt ${attempt + 1}/${maxRetries}), retrying...`,
          {
            error: error.message,
          },
        );
        await new Promise((resolve) =>
          setTimeout(resolve, delayMs * (attempt + 1)),
        );
      } else {
        throw error; // Don't retry non-network errors
      }
    }
  }
  throw new Error("Max retries exceeded");
};

// MINIO client singleton
let minioClient: Minio.Client | null = null;
let clientConfig: {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  region: string;
} | null = null;

const getMinioClient = (): Minio.Client => {
  // Parse configuration
  const endpoint = getEnvWithDefault("MINIO_ENDPOINT", DEFAULT_ENDPOINT);
  const accessKey = getEnvWithDefault("MINIO_USER", DEFAULT_ACCESS_KEY);
  const secretKey = getEnvWithDefault("MINIO_PASSWORD", DEFAULT_SECRET_KEY);
  const region = getEnvWithDefault("MINIO_REGION", DEFAULT_REGION);
  const useSSL = getEnvBoolean("MINIO_USE_SSL", DEFAULT_USE_SSL);

  // Parse endpoint URL to get host and port
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    // If no protocol provided, assume http
    url = new URL(`http://${endpoint}`);
  }

  const host = url.hostname;
  const port = parseInt(url.port) || (useSSL ? 443 : 80);

  const newConfig = {
    endPoint: host,
    port,
    useSSL,
    accessKey,
    secretKey,
    region,
  };

  // Check if we need to create a new client
  if (
    !minioClient ||
    !clientConfig ||
    JSON.stringify(clientConfig) !== JSON.stringify(newConfig)
  ) {
    clientConfig = newConfig;
    minioClient = new Minio.Client(clientConfig);

    logger.info("Created new MINIO client", {
      endpoint: `${useSSL ? "https" : "http"}://${host}:${port}`,
      region,
      useSSL,
    });
  }

  return minioClient;
};

const bucket = getEnvWithDefault("MINIO_BUCKET", STORAGE_PREFIX || "uploads");

export const createMinioFileStorage = (): FileStorage => {
  const client = getMinioClient();

  // Health check function
  const ensureBucketExists = async (): Promise<void> => {
    try {
      const bucketExists = await retryOperation(() =>
        client.bucketExists(bucket),
      );
      if (!bucketExists) {
        await retryOperation(() =>
          client.makeBucket(bucket, clientConfig?.region),
        );
        logger.info(`Created MINIO bucket: ${bucket}`);
      }
    } catch (error) {
      logger.error("Failed to ensure MINIO bucket exists", {
        bucket,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  return {
    async upload(content, options: UploadOptions = {}) {
      await ensureBucketExists();

      const buffer = await toBuffer(content);
      const filename = options.filename ?? "file";
      const key = buildKey(filename);

      try {
        await retryOperation(() =>
          client.putObject(bucket, key, buffer, undefined, {
            "Content-Type": options.contentType || "application/octet-stream",
          }),
        );
      } catch (error) {
        logger.error("Failed to upload file to MINIO", {
          bucket,
          key,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }

      const metadata: FileMetadata = {
        key,
        filename: key.split("/").pop() || filename,
        contentType: options.contentType || "application/octet-stream",
        size: buffer.byteLength,
        uploadedAt: new Date(),
      };

      const downloadUrl = await (async () => {
        try {
          const url = await retryOperation(
            () => client.presignedGetObject(bucket, key, 3600), // 1 hour expiry
          );
          return url;
        } catch (error) {
          logger.error("Failed to create presigned download URL", {
            bucket,
            key,
            error: error instanceof Error ? error.message : String(error),
          });
          return null;
        }
      })();

      // Use buildPublicUrl as fallback if getDownloadUrl fails
      const useSSL = getEnvBoolean("MINIO_USE_SSL", DEFAULT_USE_SSL);
      const endpoint = getEnvWithDefault(
        "MINIO_CONSOLE_ENDPOINT",
        DEFAULT_ENDPOINT,
      );
      const sourceUrl =
        downloadUrl || buildPublicUrl(endpoint, bucket, key, useSSL);

      logger.info("File uploaded to MINIO", {
        bucket,
        key,
        size: buffer.byteLength,
        sourceUrl: sourceUrl,
        contentType: options.contentType,
      });

      return { key, sourceUrl, metadata };
    },

    async createUploadUrl(
      options: UploadUrlOptions,
    ): Promise<UploadUrl | null> {
      await ensureBucketExists();

      const key = buildKey(options.filename);
      const expires = Math.max(
        60,
        Math.min(60 * 60 * 12, options.expiresInSeconds ?? 900),
      );

      try {
        const url = await retryOperation(() =>
          client.presignedPutObject(bucket, key, expires),
        );

        return {
          key,
          url,
          method: "PUT",
          expiresAt: new Date(Date.now() + expires * 1000),
          headers: { "Content-Type": options.contentType },
        };
      } catch (error) {
        logger.error("Failed to create presigned upload URL", {
          bucket,
          key,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    },

    async download(key) {
      try {
        const stream = await retryOperation(() =>
          client.getObject(bucket, key),
        );
        const chunks: Buffer[] = [];

        await new Promise<void>((resolve, reject) => {
          stream.on("data", (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          stream.once("end", () => resolve());
          stream.once("error", (error) => reject(error));
        });

        return Buffer.concat(chunks);
      } catch (error: any) {
        if (
          error.code === "NoSuchKey" ||
          error.message?.includes("Not Found")
        ) {
          throw new FileNotFoundError(key, error);
        }
        logger.error("Failed to download file from MINIO", {
          bucket,
          key,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },

    async delete(key) {
      try {
        await retryOperation(() => client.removeObject(bucket, key));
        logger.info("File deleted from MINIO", { bucket, key });
      } catch (error) {
        logger.error("Failed to delete file from MINIO", {
          bucket,
          key,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },

    async exists(key) {
      try {
        await retryOperation(() => client.statObject(bucket, key));
        return true;
      } catch (error: any) {
        if (
          error.code === "NoSuchKey" ||
          error.message?.includes("Not Found")
        ) {
          return false;
        }
        logger.error("Failed to check file existence in MINIO", {
          bucket,
          key,
          error: error instanceof Error ? error.message : String(error),
        });
        return false;
      }
    },

    async getMetadata(key) {
      try {
        const stat = await retryOperation(() => client.statObject(bucket, key));
        return {
          key,
          filename: key.split("/").pop() || key,
          contentType: (stat as any).contentType || "application/octet-stream",
          size: stat.size || 0,
          uploadedAt: stat.lastModified,
        } satisfies FileMetadata;
      } catch (error: any) {
        if (
          error.code === "NoSuchKey" ||
          error.message?.includes("Not Found")
        ) {
          return null;
        }
        logger.error("Failed to get file metadata from MINIO", {
          bucket,
          key,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },

    async getSourceUrl(key) {
      const useSSL = getEnvBoolean("MINIO_USE_SSL", DEFAULT_USE_SSL);
      const endpoint = getEnvWithDefault(
        "MINIO_CONSOLE_ENDPOINT",
        DEFAULT_ENDPOINT,
      );
      return buildPublicUrl(endpoint, bucket, key, useSSL);
    },

    async getDownloadUrl(key) {
      try {
        const url = await retryOperation(
          () => client.presignedGetObject(bucket, key, 3600), // 1 hour expiry
        );
        return url;
      } catch (error) {
        logger.error("Failed to create presigned download URL", {
          bucket,
          key,
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      }
    },
  } satisfies FileStorage;
};
