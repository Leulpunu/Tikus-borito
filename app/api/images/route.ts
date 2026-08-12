import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const allowedTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Image uploads require Supabase configuration." }, { status: 503 });
  }
  const user = await getAuthenticatedUser(request);
  if (user?.profile.role !== "Manager") {
    return NextResponse.json({ error: "Only a manager can upload product images." }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
    }
    const extension = allowedTypes[file.type];
    if (!extension) {
      return NextResponse.json({ error: "Only JPG, PNG, and WebP images are supported." }, { status: 400 });
    }
    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "The image must be smaller than 5 MB." }, { status: 400 });
    }

    const objectPath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${extension}`;
    const admin = createAdminClient();
    const { error } = await admin.storage.from("product-images").upload(objectPath, await file.arrayBuffer(), {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw new Error(error.message);

    const { data } = admin.storage.from("product-images").getPublicUrl(objectPath);
    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
