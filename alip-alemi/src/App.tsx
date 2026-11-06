import { useEffect } from 'react';
import { setSafeToReload } from './updates';
import { AppProvider, useApp } from './state';
import { Garden, Home, ProfilePicker, Welcome } from './ui/ChildScreens';
import { Parent } from './ui/Parent';
import { SessionScreen } from './ui/SessionScreen';
import { Fox } from './ui/Fox';

function Router() {
  const { screen, profile } = useApp();
  // Обновление применяется только там, где перезагрузка ничего не прервёт.
  useEffect(() => setSafeToReload(['loading', 'welcome', 'pick', 'home', 'garden'].includes(screen.name)), [screen.name]);
  switch (screen.name) {
    case 'loading':
      return <div className="screen"><div className="center"><Fox size="big" mood="sleep" /></div></div>;
    case 'welcome':
      return <Welcome />;
    case 'pick':
      return <ProfilePicker />;
    case 'home':
      return profile ? <Home /> : <ProfilePicker />;
    case 'session':
      return profile ? <SessionScreen key={screen.id} track={screen.track} /> : <ProfilePicker />;
    case 'garden':
      return <Garden />;
    case 'parent':
      return <Parent />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  );
}
