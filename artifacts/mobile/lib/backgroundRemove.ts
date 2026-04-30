import * as FileSystem from "expo-file-system/legacy";

/**
 * Background removal via remove.bg API.
 * User supplies their own free API key (50 images/month free tier).
 * Returns local file URI of the cutout PNG, or throws.
 */
export async function removeBackground(
  imageUri: string,
  apiKey: string
): Promise<string> {
  if (!apiKey) throw new Error("API key required");

  const blob = await (await fetch(imageUri)).blob();
  const formData = new FormData();
  formData.append("size", "auto");
  formData.append("image_file", blob as any, "image.png");

  const res = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": apiKey },
    body: formData,
  });

  if (!res.ok) {
    if (res.status === 402)
      throw new Error("Free credits exhausted. Top up at remove.bg or wait for next month.");
    if (res.status === 403)
      throw new Error("Invalid API key. Get a free key at remove.bg/api");
    throw new Error(`Background removal failed (${res.status})`);
  }

  const resultBlob = await res.blob();
  const reader = new FileReader();
  return await new Promise<string>((resolve, reject) => {
    reader.onloadend = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const fileUri = `${FileSystem.cacheDirectory}cutout_${Date.now()}.png`;
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        resolve(fileUri);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read response"));
    reader.readAsDataURL(resultBlob);
  });
}
