export default function MangaPanel({ children, className = '', as: Tag = 'div', ...rest }) {
  return <Tag className={`manga-panel ${className}`} {...rest}>{children}</Tag>;
}
