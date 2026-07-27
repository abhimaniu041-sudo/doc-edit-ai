function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function uploadImage(base64Data, mimeType) {
  const byteChars = atob(base64Data)
  const byteNumbers = new Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i)
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: mimeType })

  const ext = (mimeType.split('/')[1] || 'jpg').replace('jpeg', 'jpg')
  const formData = new FormData()
  formData.append('file', blob, `input.${ext}`)

  const res = await fetch('https://image.pollinations.ai/upload', {
    method: 'POST',
    body: formData
  })

  if (!res.ok) throw new Error(`Image upload fail hua (code ${res.status}). Dobara try karein.`)

  const data = await res.json()
  const url = data.ipfs || data.url || data.link
  if (!url) throw new Error('Upload se URL nahi mila, dobara try karein.')
  return url
}

export async function editImage(imageUrl, prompt, token) {
  const encodedPrompt = encodeURIComponent(prompt)
  const params = new URLSearchParams({ model: 'kontext', image: imageUrl, nologo: 'true' })
  if (token) params.append('token', token)

  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params.toString()}`
  const res = await fetch(url)

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('Bahut jaldi request bhej diya. 15 second ruk kar dobara try karein.')
    }
    throw new Error(`Edit fail hua (code ${res.status}). Dobara try karein.`)
  }

  const blob = await res.blob()
  const base64 = await blobToBase64(blob)
  return { data: base64, mimeType: blob.type || 'image/png' }
}
