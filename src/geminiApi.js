export async function editImageWithGemini(apiKey, base64Data, mimeType, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { inline_data: { mime_type: mimeType, data: base64Data } },
          { text: prompt }
        ]
      }
    ],
    generationConfig: {
      responseModalities: ["IMAGE", "TEXT"]
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error(
        "Google ne quota block kar diya hai (free tier abhi image models ke liye 0 hai). Google AI Studio mein billing link karein ya thodi der baad naya API key try karein."
      );
    }
    if (res.status === 400) {
      throw new Error("Request format galat hai ya API key invalid hai. Settings mein API key check karein.");
    }
    if (res.status === 403) {
      throw new Error("API key ke paas is model ka access nahi hai. Naya key generate karein.");
    }
    throw new Error(`Google se error aaya (code ${res.status}). Thodi der baad try karein.`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];

  let imageOut = null;
  let textOut = "";

  for (const part of parts) {
    const inline = part.inlineData || part.inline_data;
    if (inline?.data) {
      imageOut = { data: inline.data, mimeType: inline.mimeType || inline.mime_type || "image/png" };
    }
    if (part.text) textOut += part.text;
  }

  if (!imageOut) {
    throw new Error(textOut || "Model ne image return nahi ki. Command clear karke dobara try karein.");
  }

  return imageOut;
}
