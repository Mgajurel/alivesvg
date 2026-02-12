import { supabaseAdmin } from "@/lib/supabase/server";
import { MAX_ZIP_UPLOAD_BYTES } from "@/lib/studioUpload";

const DEFAULT_BUCKET = "studio-uploads";
const ZIP_ALLOWED_MIME_TYPES = [
  "application/zip",
  "application/x-zip-compressed",
];

export function getStudioUploadsBucket(): string {
  const envBucket = process.env.STUDIO_UPLOADS_BUCKET?.trim();
  return envBucket && envBucket.length > 0 ? envBucket : DEFAULT_BUCKET;
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

async function ensureBucket(bucket: string): Promise<void> {
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) {
    throw new Error(`Failed to list storage buckets: ${listError.message}`);
  }

  const exists = (buckets ?? []).some((item) => item.id === bucket);
  if (exists) return;

  const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: MAX_ZIP_UPLOAD_BYTES,
    allowedMimeTypes: ZIP_ALLOWED_MIME_TYPES,
  });

  if (createError && createError.message !== "Bucket already exists") {
    throw new Error(`Failed to create storage bucket: ${createError.message}`);
  }
}

export async function uploadStudioZipSource(params: {
  userDbId: string;
  iconSetId: string;
  jobId: string;
  fileName: string;
  fileType: string;
  fileBuffer: ArrayBuffer;
}): Promise<{ bucket: string; path: string }> {
  const bucket = getStudioUploadsBucket();
  await ensureBucket(bucket);

  const safeFileName = sanitizeFileName(params.fileName || "icons.zip");
  const path = `${params.userDbId}/${params.iconSetId}/${params.jobId}/${Date.now()}-${safeFileName}`;

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(path, params.fileBuffer, {
      contentType: params.fileType || "application/zip",
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload ZIP source to storage: ${error.message}`);
  }

  return { bucket, path };
}
