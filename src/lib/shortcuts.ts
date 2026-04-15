import {
  register,
  unregister,
  unregisterAll,
} from '@tauri-apps/plugin-global-shortcut';
export async function setupShortcuts() {
  console.log('REGISTER');
  await register('Alt+V', (event) => {
    // event.state will be either "Pressed" or "Released"
    // Use if prevents the default behavior of the shortcut that is to trigger on both key press and release
    if (event.state === 'Pressed') {
      console.log('TRIGGER');
      
    }
  });
}

export async function destroyShortcuts() {
  console.log('UNREGISTER');
  await unregisterAll();
}
