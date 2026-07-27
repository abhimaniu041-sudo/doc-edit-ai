import React, { useState, useEffect, useRef } from 'react'
import { Preferences } from '@capacitor/preferences'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { uploadImage, editImage } from './pollinationsApi.js'

export default function App() {
  const [token, setToken] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [imageData, setImageData] = useState(null)
  const [command, setCommand] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    (async () => {
      const { value } = await Preferences.get({ key: 'pollinations_token' })
      if (value) setToken(value)
    })()
  }, [])

  const saveToken = async () => {
    await Preferences.set({ key: 'pollinations_token', value: token })
    setShowSettings(false)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      const [meta, base64] = result.split(',')
      const mimeType = meta.match(/data:(.*);base64/)[1]
      setImageData({ base64, mimeType, previewUrl: result })
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const handleApply = async () => {
    if (!imageData) { setError('Pehle ek document image upload karein.'); return }
    if (!command.trim()) { setError('Kya karna hai wo likhein (command).'); return }

    setLoading(true)
    setError('')
    try {
      const publicUrl = await uploadImage(imageData.base64, imageData.mimeType)
      const result = await editImage(publicUrl, command, token)
      const newPreview = `data:${result.mimeType};base64,${result.data}`
      setImageData({ base64: result.data, mimeType: result.mimeType, previewUrl: newPreview })
      setCommand('')
    } catch (err) {
      setError(err.message || 'Kuch galat ho gaya, dobara try karein.')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!imageData) return
    try {
      const fileName = `docedit_${Date.now()}.png`
      await Filesystem.writeFile({ path: fileName, data: imageData.base64, directory: Directory.Documents })
      const uriResult = await Filesystem.getUri({ path: fileName, directory: Directory.Documents })
      await Share.share({ title: 'Edited Document', url: uriResult.uri })
    } catch (err) {
      setError('Save/Share fail hua: ' + err.message)
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>DocEdit AI</h1>
        <button className="icon-btn" onClick={() => setShowSettings(true)}>⚙️</button>
      </header>

      {showSettings && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>Optional Token</h2>
            <p className="hint">Bina token ke bhi chal jaayega. Zyada limit ke liye auth.pollinations.ai se free token banayein.</p>
            <input
              type="text"
              placeholder="Token (optional)"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <div className="modal-actions">
              <button onClick={saveToken}>Save</button>
              <button className="secondary" onClick={() => setShowSettings(false)}>Band karein</button>
            </div>
          </div>
        </div>
      )}

      <main className="content">
        {!imageData ? (
          <div className="upload-box" onClick={() => fileInputRef.current.click()}>
            <p>📄 Document image yahan tap karke upload karein</p>
          </div>
        ) : (
          <div className="preview-box">
            <img src={imageData.previewUrl} alt="document" />
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        {imageData && (
          <button className="secondary small" onClick={() => fileInputRef.current.click()}>
            Doosri image upload karein
          </button>
        )}

        {error && <p className="error">{error}</p>}

        <div className="command-bar">
          <input
            type="text"
            placeholder="Command likhein... e.g. background white karo"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
          />
          <button onClick={handleApply} disabled={loading}>
            {loading ? '...' : 'Apply'}
          </button>
        </div>

        {imageData && (
          <button className="save-btn" onClick={handleSave}>
            💾 Save / Share
          </button>
        )}
      </main>
    </div>
  )
}
