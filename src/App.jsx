import React, { useState, useEffect, useRef } from 'react'
import { Preferences } from '@capacitor/preferences'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { editImageWithGemini } from './geminiApi.js'

export default function App() {
  const [apiKey, setApiKey] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [imageData, setImageData] = useState(null) // { base64, mimeType, previewUrl }
  const [command, setCommand] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    (async () => {
      const { value } = await Preferences.get({ key: 'gemini_api_key' })
      if (value) setApiKey(value)
      else setShowSettings(true)
    })()
  }, [])

  const saveApiKey = async () => {
    await Preferences.set({ key: 'gemini_api_key', value: apiKey })
    setShowSettings(false)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result // data:image/png;base64,xxxx
      const [meta, base64] = result.split(',')
      const mimeType = meta.match(/data:(.*);base64/)[1]
      setImageData({ base64, mimeType, previewUrl: result })
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const handleApply = async () => {
    if (!apiKey) { setShowSettings(true); return }
    if (!imageData) { setError('Pehle ek document image upload karein.'); return }
    if (!command.trim()) { setError('Kya karna hai wo likhein (command).'); return }

    setLoading(true)
    setError('')
    try {
      const result = await editImageWithGemini(apiKey, imageData.base64, imageData.mimeType, command)
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
      await Filesystem.writeFile({
        path: fileName,
        data: imageData.base64,
        directory: Directory.Documents
      })
      const uriResult = await Filesystem.getUri({ path: fileName, directory: Directory.Documents })
      await Share.share({
        title: 'Edited Document',
        url: uriResult.uri
      })
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
            <h2>Gemini API Key</h2>
            <p className="hint">Free key: aistudio.google.com/apikey se banayein</p>
            <input
              type="text"
              placeholder="API key paste karein"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <div className="modal-actions">
              <button onClick={saveApiKey} disabled={!apiKey}>Save</button>
              {apiKey && <button className="secondary" onClick={() => setShowSettings(false)}>Band karein</button>}
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
