import { Component, StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initUpdates } from './updates';
import './styles.css';

/** Вместо белого экрана при сбое — понятное сообщение и кнопка перезагрузки. */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return <Crash message={this.state.error} />;
  }
}

function Crash({ message }: { message: string }) {
  return (
    <div className="screen">
      <div className="center">
        <div style={{ fontSize: 72 }}>🦊</div>
        <p style={{ maxWidth: 360 }}>Бірдеңе дұрыс болмады. «Жаңарту» батырмасын басыңыз. Көмектеспесе, сілтемені Chrome немесе Safari браузерінде тікелей ашыңыз.</p>
        <button className="btn primary" onClick={() => location.reload()}>Жаңарту</button>
        <p className="muted" style={{ fontSize: 12, maxWidth: 360, wordBreak: 'break-word' }}>{message}</p>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Ошибка до запуска React (например, очень старый браузер).
window.addEventListener('error', (e) => {
  const el = document.getElementById('root');
  if (el && !el.childElementCount) root.render(<Crash message={String(e.message)} />);
});

// Офлайн-режим и автообновление: service worker кэширует приложение и уроки.
initUpdates();
