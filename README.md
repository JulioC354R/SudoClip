# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

```bash
# Start on development Mode
npm run tauri dev
```

how to test shortcuts in wayland:

make a build and run the binary directly:

```bash
npm run tauri build
./src-tauri/target/release/tauri-app
```

after it you can open another terminal and run:

```bash
# You can add tthe full path if you want to try the shortcut on wayland
./src-tauri/target/release/tauri-app toggle
```
