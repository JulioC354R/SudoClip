import { getCurrentWindow } from '@tauri-apps/api/window';
import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut';
import { debug } from '@tauri-apps/plugin-log';
export async function setupShortcuts() {
  debug('REGISTER SHORTCUT: Alt+V');
  await register('Alt+V', async (event) => {
    // event.state will be either "Pressed" or "Released"
    // Use if prevents the default behavior of the shortcut that is to trigger on both key press and release
    if (event.state === 'Pressed') {
      const window = getCurrentWindow();
      const isVisible = await window.isVisible();
      debug('Is Visible: ' + isVisible);
      if (isVisible) {
        window.hide();
      } else {
        window.show();
        window.setFocus();
      }
    }
  });
}

export async function destroyShortcuts() {
  debug('UNREGISTER SHORTCUTS');
  await unregisterAll();
}
