/** Небольшие интерфейсные значки без зависимости от шрифта эмодзи. */
export function Icon({ name }: { name: 'arrow' | 'star' | 'game' | 'garden' | 'sound' | 'home' | 'check' }) {
  const paths = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z" />,
    game: <><path d="M7 7h10c3 0 5 12 2 12-2 0-3-4-4-4H9c-1 0-2 4-4 4C2 19 4 7 7 7Z" /><path d="M7 10v4m-2-2h4m7-1h.01M18 13h.01" /></>,
    garden: <><path d="M12 21V10m0 6C3 17 3 9 3 9s8-1 9 7Zm0-5C12 3 21 3 21 3s1 8-9 8Z" /><path d="M7 21h10" /></>,
    sound: <><path d="m11 4-6 5H2v6h3l6 5Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14" /></>,
    home: <><path d="m3 10 9-7 9 7M5 9v12h14V9" /><path d="M9 21v-8h6v8" /></>,
    check: <path d="m5 12 4 4L19 6" />,
  };
  return <svg className="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
