import { useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';

/** Small contentEditable rich-text editor. Output is sanitized before it leaves the component. */
export default function RichText({ id, label, value, onChange }) {
  const ref = useRef(null);
  useEffect(() => { ref.current.innerHTML = DOMPurify.sanitize(value || ''); }, []); // eslint-disable-line -- set once on mount
  const emit = () => onChange(DOMPurify.sanitize(ref.current.innerHTML));
  const cmd = (c, a) => { ref.current.focus(); document.execCommand(c, false, a); emit(); };
  const btns = [['B', 'bold', null, 'Bold'], ['I', 'italic', null, 'Italic'], ['U', 'underline', null, 'Underline'], ['H2', 'formatBlock', 'h2', 'Heading'], ['•', 'insertUnorderedList', null, 'Bullet list']];
  return (
    <div className="rich-wrap">
      <div className="rich-bar" role="toolbar" aria-label="Formatting">
        {btns.map(([t, c, a, l]) => <button key={t} type="button" aria-label={l} onClick={() => cmd(c, a)}>{t}</button>)}
        <button type="button" aria-label="Link" onClick={() => { const u = prompt('Link URL (https://…)'); if (u) cmd('createLink', u); }}>🔗</button>
      </div>
      <div id={id} ref={ref} className="rich" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label={label} onInput={emit} />
    </div>
  );
}
