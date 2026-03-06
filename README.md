### Usage

1. Copy the `path` folder into your **edex-ui** directory (the one that contains the root `package.json` and the `src` folder).
2. Open the `path` folder and run **`setup.bat`** *(right-click → Run as Administrator is recommended)*.
3. The script will automatically:
   - Download the required patched files from GitHub
   - Install npm dependencies
   - Build native modules (node-pty)
4. Once setup completes successfully, you can optionally launch eDEX-UI right away.
5. The `path` folder can be **deleted** afterwards — it is no longer needed.

### Requirements

- [Node.js](https://nodejs.org) (LTS version recommended)
- [Python](https://www.python.org) (3.8–3.12)
- Visual Studio Build Tools 2022 *(the script installs it automatically if missing)*
- Internet connection (required to download the patched files)
