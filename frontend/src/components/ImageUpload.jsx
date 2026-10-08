import { useEffect, useState } from 'react';

export const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'];
export const MAX_BYTES = 5 * 1024 * 1024;
/** Returns an error message, or '' when the file is valid (PNG/JPG/WEBP, max 5 MB). */
export const validateImage = f => !f ? 'Choose an image.' : !ALLOWED.includes(f.type) ? 'Only PNG, JPG or WEBP images are allowed.' : f.size > MAX_BYTES ? 'Image must be 5 MB or smaller.' : '';

/** File input with validation + preview. Calls onChange(file) with a valid file, or null. */
export default function ImageUpload({ id = 'image-upload', label = 'Image', onChange, error }) {
  const [preview, setPreview] = useState(null);
  const [localErr, setLocalErr] = useState('');
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const pick = e => {
    const f = e.target.files[0]; if (!f) return;
    const msg = validateImage(f);
    if (msg) { setLocalErr(msg); setPreview(null); onChange(null); e.target.value = ''; return; }
    setLocalErr(''); setPreview(URL.createObjectURL(f)); onChange(f);
  };
  const msg = localErr || error;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="file" accept={ALLOWED.join(',')} onChange={pick} aria-invalid={!!msg} aria-describedby={msg ? `${id}-err` : undefined} />
      {preview && <img className="upload-preview" src={preview} alt="Selected file preview" />}
      {msg && <span id={`${id}-err`} className="err" role="alert">{msg}</span>}
    </div>
  );
}
