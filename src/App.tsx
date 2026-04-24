import { useEffect, useState } from 'react';
import { Button } from './components/ui/button';
import { readText } from '@tauri-apps/plugin-clipboard-manager';
import { debug } from '@tauri-apps/plugin-log';
import ClipboardItemComponent from './components/ui/clipboardItemComponent';

function App() {
  const [clipboardList, setClipboardList] = useState<string[]>([]);

  useEffect(() => {
    const loadClipboardItems = async () => {
      const contentFromClipboard = await readText();
      setClipboardList((prev) => {
        if (prev.includes(contentFromClipboard)) {
          return prev;
        }
        debug('New content added to the list: ' + contentFromClipboard);
        return [...prev, contentFromClipboard];
      });
    };

    const interval = setInterval(loadClipboardItems, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-6">
      <h1 className="text-3xl font-bold">sudoclip 🚀</h1>
      <Button className="px-4 py-2 ">Button</Button>
      <p>Content from clipboard:</p>
      {clipboardList.map((item, index) => {
        return <ClipboardItemComponent key={index} content={item} />;
      })}
    </main>
  );
}

export default App;
