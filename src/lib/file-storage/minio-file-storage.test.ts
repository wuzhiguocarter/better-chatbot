import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as Minio from "minio";
import { createMinioFileStorage } from "./minio-file-storage";
import type { FileStorage } from "./file-storage.interface";
import { FileNotFoundError } from "lib/errors";

// Mock minio module
vi.mock("minio", () => ({
  default: vi.fn().mockImplementation((_config) => ({
    bucketExists: vi.fn(),
    makeBucket: vi.fn(),
    putObject: vi.fn(),
    getObject: vi.fn(),
    removeObject: vi.fn(),
    statObject: vi.fn(),
    presignedPutObject: vi.fn(),
    presignedGetObject: vi.fn(),
  })),
}));

// Mock logger
vi.mock("logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock utils
vi.mock("lib/utils", () => ({
  generateUUID: () => "test-uuid-123",
}));

// Clear all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  // Reset environment variables
  delete process.env.MINIO_ENDPOINT;
  delete process.env.MINIO_USER;
  delete process.env.MINIO_PASSWORD;
  delete process.env.MINIO_REGION;
  delete process.env.MINIO_USE_SSL;
  delete process.env.MINIO_BUCKET;
  delete process.env.MINIO_CONSOLE_PORT;
});

describe("createMinioFileStorage", () => {
  let storage: FileStorage;
  let mockMinioClient: any;

  beforeEach(() => {
    // Get the mock constructor instance
    const MinioConstructor = Minio.default as any;
    mockMinioClient = new MinioConstructor();
    storage = createMinioFileStorage();
  });

  describe("upload", () => {
    it("should upload a file successfully", async () => {
      const fileContent = Buffer.from("test content");
      const filename = "test.txt";

      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.putObject.mockResolvedValue({});

      const result = await storage.upload(fileContent, {
        filename,
        contentType: "text/plain",
      });

      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith("uploads");
      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        "uploads",
        expect.stringMatching(/^uploads\/test-uuid-123-test\.txt$/),
        fileContent,
        undefined,
        {
          "Content-Type": "text/plain",
        },
      );
      expect(result).toMatchObject({
        key: expect.stringMatching(/^uploads\/test-uuid-123-test\.txt$/),
        sourceUrl: expect.stringMatching(/^http:\/\/localhost:9000\/uploads\//),
        metadata: {
          filename: "test-uuid-123-test.txt",
          contentType: "text/plain",
          size: fileContent.byteLength,
          uploadedAt: expect.any(Date),
        },
      });
    });

    it("should create bucket if it doesn't exist", async () => {
      mockMinioClient.bucketExists.mockResolvedValue(false);
      mockMinioClient.makeBucket.mockResolvedValue({});
      mockMinioClient.putObject.mockResolvedValue({});

      await storage.upload(Buffer.from("test"), { filename: "test.txt" });

      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith("uploads");
      expect(mockMinioClient.makeBucket).toHaveBeenCalledWith(
        "uploads",
        "us-east-1",
      );
      expect(mockMinioClient.putObject).toHaveBeenCalled();
    });

    it("should use custom bucket from environment", async () => {
      process.env.MINIO_BUCKET = "custom-bucket";
      storage = createMinioFileStorage(); // Recreate with new env

      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.putObject.mockResolvedValue({});

      await storage.upload(Buffer.from("test"), { filename: "test.txt" });

      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith(
        "custom-bucket",
      );
      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        "custom-bucket",
        expect.any(String),
        expect.any(Buffer),
        undefined,
        expect.any(Object),
      );
    });
  });

  describe("createUploadUrl", () => {
    it("should create a presigned upload URL", async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.presignedPutObject.mockResolvedValue(
        "http://localhost:9000/presigned-put-url",
      );

      const result = await storage.createUploadUrl({
        filename: "test.txt",
        contentType: "text/plain",
        expiresInSeconds: 3600,
      });

      expect(result).toMatchObject({
        key: expect.stringMatching(/^uploads\/test-uuid-123-test\.txt$/),
        url: "http://localhost:9000/presigned-put-url",
        method: "PUT",
        expiresAt: expect.any(Date),
        headers: { "Content-Type": "text/plain" },
      });
    });

    it("should return null on error", async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.presignedPutObject.mockRejectedValue(
        new Error("MinIO error"),
      );

      const result = await storage.createUploadUrl({
        filename: "test.txt",
        contentType: "text/plain",
      });

      expect(result).toBeNull();
    });
  });

  describe("download", () => {
    it("should download a file successfully", async () => {
      const fileContent = Buffer.from("downloaded content");
      const mockStream = {
        on: vi.fn().mockImplementation((event, callback) => {
          if (event === "data") {
            callback(fileContent);
          }
          if (event === "end") {
            setTimeout(() => callback(), 0);
          }
        }),
        once: vi.fn().mockImplementation((event, callback) => {
          if (event === "end") {
            setTimeout(() => callback(), 0);
          }
        }),
      };

      mockMinioClient.getObject.mockResolvedValue(mockStream);

      const result = await storage.download("uploads/test-uuid-123-test.txt");

      expect(result).toEqual(fileContent);
      expect(mockMinioClient.getObject).toHaveBeenCalledWith(
        "uploads",
        "uploads/test-uuid-123-test.txt",
      );
    });

    it("should throw FileNotFoundError for missing file", async () => {
      const error = new Error("Not Found") as any;
      error.code = "NoSuchKey";
      mockMinioClient.getObject.mockRejectedValue(error);

      await expect(storage.download("uploads/nonexistent.txt")).rejects.toThrow(
        FileNotFoundError,
      );
    });
  });

  describe("delete", () => {
    it("should delete a file successfully", async () => {
      mockMinioClient.removeObject.mockResolvedValue({});

      await storage.delete("uploads/test-uuid-123-test.txt");

      expect(mockMinioClient.removeObject).toHaveBeenCalledWith(
        "uploads",
        "uploads/test-uuid-123-test.txt",
      );
    });
  });

  describe("exists", () => {
    it("should return true for existing file", async () => {
      mockMinioClient.statObject.mockResolvedValue({
        size: 100,
        lastModified: new Date(),
        contentType: "text/plain",
      });

      const result = await storage.exists("uploads/test-uuid-123-test.txt");

      expect(result).toBe(true);
      expect(mockMinioClient.statObject).toHaveBeenCalledWith(
        "uploads",
        "uploads/test-uuid-123-test.txt",
      );
    });

    it("should return false for non-existing file", async () => {
      const error = new Error("Not Found") as any;
      error.code = "NoSuchKey";
      mockMinioClient.statObject.mockRejectedValue(error);

      const result = await storage.exists("uploads/nonexistent.txt");

      expect(result).toBe(false);
    });
  });

  describe("getMetadata", () => {
    it("should return file metadata", async () => {
      const mockStat = {
        size: 150,
        lastModified: new Date("2023-01-01"),
        contentType: "text/plain",
      };
      mockMinioClient.statObject.mockResolvedValue(mockStat);

      const result = await storage.getMetadata(
        "uploads/test-uuid-123-test.txt",
      );

      expect(result).toMatchObject({
        key: "uploads/test-uuid-123-test.txt",
        filename: "test-uuid-123-test.txt",
        contentType: "text/plain",
        size: 150,
        uploadedAt: mockStat.lastModified,
      });
    });

    it("should return null for non-existing file", async () => {
      const error = new Error("Not Found") as any;
      error.code = "NoSuchKey";
      mockMinioClient.statObject.mockRejectedValue(error);

      const result = await storage.getMetadata("uploads/nonexistent.txt");

      expect(result).toBeNull();
    });
  });

  describe("getSourceUrl", () => {
    it("should return public URL", async () => {
      const result = await storage.getSourceUrl(
        "uploads/test-uuid-123-test.txt",
      );

      expect(result).toBe(
        "http://localhost:9000/uploads/uploads%2Ftest-uuid-123-test.txt",
      );
    });

    it("should return HTTPS URL when SSL is enabled", async () => {
      process.env.MINIO_USE_SSL = "true";
      storage = createMinioFileStorage(); // Recreate with new env

      const result = await storage.getSourceUrl(
        "uploads/test-uuid-123-test.txt",
      );

      expect(result).toBe(
        "https://localhost:9000/uploads/uploads%2Ftest-uuid-123-test.txt",
      );
    });
  });

  describe("getDownloadUrl", () => {
    it("should create presigned download URL", async () => {
      mockMinioClient.presignedGetObject.mockResolvedValue(
        "http://localhost:9000/presigned-get-url",
      );

      const result = await storage.getDownloadUrl(
        "uploads/test-uuid-123-test.txt",
      );

      expect(result).toBe("http://localhost:9000/presigned-get-url");
      expect(mockMinioClient.presignedGetObject).toHaveBeenCalledWith(
        "uploads",
        "uploads/test-uuid-123-test.txt",
        3600,
      );
    });

    it("should return null on error", async () => {
      mockMinioClient.presignedGetObject.mockRejectedValue(
        new Error("MinIO error"),
      );

      const result = await storage.getDownloadUrl(
        "uploads/test-uuid-123-test.txt",
      );

      expect(result).toBeNull();
    });
  });

  describe("environment configuration", () => {
    it("should use custom endpoint", () => {
      process.env.MINIO_ENDPOINT = "https://minio.example.com:9000";
      process.env.MINIO_USER = "customuser";
      process.env.MINIO_PASSWORD = "custompass";
      process.env.MINIO_REGION = "custom-region";
      process.env.MINIO_USE_SSL = "true";

      const MinioConstructor = Minio.default as any;
      createMinioFileStorage();

      expect(MinioConstructor).toHaveBeenCalledWith({
        endPoint: "minio.example.com",
        port: 9000,
        useSSL: true,
        accessKey: "customuser",
        secretKey: "custompass",
        region: "custom-region",
      });
    });

    it("should handle endpoint without protocol", () => {
      process.env.MINIO_ENDPOINT = "minio.example.com:8080";

      const MinioConstructor = Minio.default as any;
      createMinioFileStorage();

      expect(MinioConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          endPoint: "minio.example.com",
          port: 8080,
          useSSL: false,
        }),
      );
    });
  });

  describe("error handling and retries", () => {
    it("should retry on network errors", async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      mockMinioClient.putObject
        .mockRejectedValueOnce(new Error("ECONNREFUSED"))
        .mockResolvedValue({});

      await storage.upload(Buffer.from("test"), { filename: "test.txt" });

      expect(mockMinioClient.putObject).toHaveBeenCalledTimes(2);
    });

    it("should not retry on non-network errors", async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);
      const error = new Error("Access Denied") as any;
      error.code = "AccessDenied";
      mockMinioClient.putObject.mockRejectedValue(error);

      await expect(
        storage.upload(Buffer.from("test"), { filename: "test.txt" }),
      ).rejects.toThrow("Access Denied");

      expect(mockMinioClient.putObject).toHaveBeenCalledTimes(1);
    });
  });
});
