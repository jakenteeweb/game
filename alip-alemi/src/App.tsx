import { useEffect } from 'react';
import { setSafeToReload } from './updates';
import { AppProvider, useApp } from './state';
import { Garden, Home, ProfilePicker, Welcome } from './ui/ChildScreens';
import { Parent } from './ui/Parent';
import { GameScreen, GamesScreen } from './games/GameScreens';
import { SessionScreen } from './ui/SessionScreen';
import { Mascot } from './ui/Mascot';
import { LevelToast } from './ui/LevelToast';

function Router() {
  const { screen, profile } = useApp();
  // Обновление применяется только там, где перезагрузка ничего не прервёт.
  useEffect(() => setSafeToReload(['loading', 'welcome', 'pick', 'home', 'garden', 'games'].includes(screen.name)), [screen.name]);
  switch (screen.name) {
    case 'loading':
      return <div className="screen"><div className="center"><Mascot size="big" mood="sleep" /></div></div>;
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
    case 'games':
      return profile ? <GamesScreen /> : <ProfilePicker />;
    case 'game':
      return profile ? <GameScreen key={screen.id} game={screen.game} /> : <ProfilePicker />;
    case 'parent':
      return <Parent />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <Router />
      <LevelToast />
    </AppProvider>
  );
}
