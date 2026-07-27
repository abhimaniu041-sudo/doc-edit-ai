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
    const errText = await res.text();
    throw new Error(`API error (${res.status}): ${errText}`);
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
    throw new Error(textOut || "Model ne koi image return nahi ki. Command clear karke dobara try karein.");
  }

  return imageOut;
}
