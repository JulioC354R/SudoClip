import { useEffect, useState } from 'react';
import { Button } from './components/ui/button';
import { readText } from '@tauri-apps/plugin-clipboard-manager';
import { debug } from '@tauri-apps/plugin-log';

function App() {
  const [clipboardList, setClipboardList] = useState<String[]>([]);

  useEffect(() => {
    const loadClipboardItems = async () => {
      const contentFromClipboard = await readText();
      const newList = [...clipboardList, contentFromClipboard];
      setClipboardList([...new Set(newList)]);
      debug('Reading Content From Clipboard');
    };

    // make a function to compare the content of the clipboard
    // add the clipboard for the list if it's new
    const interval = setInterval(loadClipboardItems, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-6">
      <h1 className="text-3xl font-bold">sudoclip 🚀</h1>
      <Button className="px-4 py-2 ">Button</Button>
      <p>Content from clipboard:</p>
      {clipboardList.map((item) => {
        return <p>{item}</p>;
      })}
    </main>
  );
}

export default App;
