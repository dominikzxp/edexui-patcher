const fs = require('fs');
const path = require('path');
const root = process.cwd();

const bundledGyp = path.join(root, 'node_modules', 'electron-rebuild', 'node_modules', 'node-gyp');
if (fs.existsSync(bundledGyp)) {
    fs.rmSync(bundledGyp, { recursive: true, force: true });
    console.log('[OK] bundled node-gyp v7 removed');
} else {
    console.log('[OK] bundled node-gyp already absent');
}

const configureFile = path.join(root, 'node_modules', 'node-gyp', 'lib', 'configure.js');
let configure = fs.readFileSync(configureFile, 'utf8');
if (!configure.includes('openssl_fips')) {
    configure = configure.replace(
        "argv.push('-Dvisibility=default')",
        "argv.push('-Dvisibility=default')\n  argv.push('-Dopenssl_fips=')"
    );
    fs.writeFileSync(configureFile, configure, 'utf8');
    console.log('[OK] configure.js patched');
} else {
    console.log('[OK] configure.js already patched');
}

const findVSFile = path.join(root, 'node_modules', 'node-gyp', 'lib', 'find-visualstudio.js');
let findVS = fs.readFileSync(findVSFile, 'utf8');
if (!findVS.includes('EDEXUI_PATCH_V3')) {
    const oldEntry = 'findVisualStudio: function findVisualStudio () {';
    findVS = findVS.replace(
        /findVisualStudio: function findVisualStudio \(\) \{ \/\/ EDEXUI_[^\n]*\n[\s\S]*?var vsInfo = edexFindVS\(\);[\s\S]*?}\n    /,
        'findVisualStudio: function findVisualStudio () {\n    '
    );
    const newEntry = `findVisualStudio: function findVisualStudio () { // EDEXUI_PATCH_V3
    function edexFindVS() {
      var fse = require('fs');
      var pt = require('path');
      var cpe = require('child_process');
      var pf86 = process.env['ProgramFiles(x86)'] || 'C:\\\\Program Files (x86)';
      var pf64 = process.env['ProgramFiles'] || 'C:\\\\Program Files';

      var vsPath = null;
      var vswherePaths = [
        pt.join(pf86, 'Microsoft Visual Studio', 'Installer', 'vswhere.exe'),
        pt.join(pf64, 'Microsoft Visual Studio', 'Installer', 'vswhere.exe'),
      ];
      for (var vi = 0; vi < vswherePaths.length; vi++) {
        if (!fse.existsSync(vswherePaths[vi])) continue;
        try {
          var out = cpe.execFileSync(vswherePaths[vi],
            ['-latest','-products','*','-property','installationPath'],
            { encoding: 'utf8', stdio: ['ignore','pipe','ignore'] });
          if (out.trim()) { vsPath = out.trim(); break; }
        } catch(e2) {}
      }
      if (!vsPath) {
        var defaultPaths = [
          pt.join(pf64, 'Microsoft Visual Studio', '2022', 'BuildTools'),
          pt.join(pf64, 'Microsoft Visual Studio', '2022', 'Community'),
          pt.join(pf64, 'Microsoft Visual Studio', '2022', 'Professional'),
          pt.join(pf64, 'Microsoft Visual Studio', '2022', 'Enterprise'),
          pt.join(pf86, 'Microsoft Visual Studio', '2022', 'BuildTools'),
          pt.join(pf86, 'Microsoft Visual Studio', '2022', 'Community'),
        ];
        for (var di = 0; di < defaultPaths.length; di++) {
          if (fse.existsSync(pt.join(defaultPaths[di], 'MSBuild'))) {
            vsPath = defaultPaths[di]; break;
          }
        }
      }
      if (!vsPath && process.env.VCINSTALLDIR) {
        vsPath = pt.resolve(process.env.VCINSTALLDIR, '..');
      }
      if (!vsPath) return null;

      var msbuildCandidates = [
        pt.join(vsPath, 'MSBuild', 'Current', 'Bin', 'amd64', 'MSBuild.exe'),
        pt.join(vsPath, 'MSBuild', 'Current', 'Bin', 'MSBuild.exe'),
        pt.join(vsPath, 'MSBuild', 'Current', 'Bin', 'arm64', 'MSBuild.exe'),
        pt.join(vsPath, 'MSBuild', '17.0', 'Bin', 'amd64', 'MSBuild.exe'),
        pt.join(vsPath, 'MSBuild', '17.0', 'Bin', 'MSBuild.exe'),
      ];
      var msbuild = null;
      for (var mi = 0; mi < msbuildCandidates.length; mi++) {
        if (fse.existsSync(msbuildCandidates[mi])) { msbuild = msbuildCandidates[mi]; break; }
      }
      if (!msbuild) return null;

      var sdkVer = '10.0.19041.0';
      try {
        var sdkBase = pt.join(pf86, 'Windows Kits', '10', 'Include');
        var sdkDirs = fse.readdirSync(sdkBase)
          .filter(function(d) { return /^10\\.0\\.\\d+\\.\\d+$/.test(d); })
          .sort().reverse();
        if (sdkDirs.length > 0) sdkVer = sdkDirs[0];
      } catch(e3) {}

      return { path: vsPath, msBuild: msbuild, sdk: sdkVer };
    }

    var vsInfo = edexFindVS();
    if (vsInfo) {
      this.log.info('EDEXUI VS2022: ' + vsInfo.path + ' MSBuild: ' + vsInfo.msBuild + ' SDK: ' + vsInfo.sdk);
      return process.nextTick(this.callback.bind(null, null, {
        path: vsInfo.path, version: '17.0.0', versionMajor: 17, versionMinor: 0,
        versionYear: 2022, msBuild: vsInfo.msBuild, toolset: 'v143', sdk: vsInfo.sdk
      }));
    }`;
    findVS = findVS.replace(oldEntry, newEntry);
    fs.writeFileSync(findVSFile, findVS, 'utf8');
    console.log('[OK] find-visualstudio.js patched');
} else {
    console.log('[OK] find-visualstudio.js already patched');
}

const siUtilFile = path.join(root, 'src', 'node_modules', 'systeminformation', 'lib', 'util.js');
const siNetFile  = path.join(root, 'src', 'node_modules', 'systeminformation', 'lib', 'network.js');

if (fs.existsSync(siUtilFile)) {
    let siUtil = fs.readFileSync(siUtilFile, 'utf8');
    if (!siUtil.includes('EDEXUI_WMIC_FIX')) {
        siUtil = siUtil.replace(
`function getWmic() {
  if (os.type() === 'Windows_NT' && !wmicPath) {
    wmicPath = WINDIR + '\\\\system32\\\\wbem\\\\wmic.exe';
    if (!fs.existsSync(wmicPath)) {
      try {
        const wmicPathArray = execSync('WHERE WMIC', execOptsWin).toString().split('\\r\\n');
        if (wmicPathArray && wmicPathArray.length) {
          wmicPath = wmicPathArray[0];
        } else {
          wmicPath = 'wmic';
        }
      } catch (e) {
        wmicPath = 'wmic';
      }
    }
  }
  return wmicPath;
}`,
`function getWmic() { // EDEXUI_WMIC_FIX
  if (os.type() === 'Windows_NT' && !wmicPath) {
    const defaultPath = WINDIR + '\\\\system32\\\\wbem\\\\wmic.exe';
    if (fs.existsSync(defaultPath)) {
      wmicPath = defaultPath;
    } else {
      try {
        const arr = execSync('WHERE WMIC 2>nul', execOptsWin).toString().split('\\r\\n').filter(p => p && !p.startsWith('INFO:'));
        wmicPath = (arr.length && fs.existsSync(arr[0])) ? arr[0] : '';
      } catch (e) {
        wmicPath = '';
      }
    }
  }
  return wmicPath || '';
}`
        );
        siUtil = siUtil.replace(
            `exec(WINDIR + '\\\\system32\\\\chcp.com 65001 | ' + getWmic() + ' ' + command, options, function (error, stdout) {
          resolve(stdout, error);
        }).stdin.end();`,
            `const _wmicExe = getWmic();
        if (!_wmicExe) { resolve(''); return; }
        exec(WINDIR + '\\\\system32\\\\chcp.com 65001 | ' + _wmicExe + ' ' + command, options, function (error, stdout) {
          resolve(stdout || '', error);
        }).stdin.end();`
        );
        fs.writeFileSync(siUtilFile, siUtil, 'utf8');
        console.log('[OK] systeminformation/util.js wmic fix applied');
    } else {
        console.log('[OK] systeminformation/util.js already patched');
    }
} else {
    console.log('[SKIP] systeminformation/util.js not found');
}

if (fs.existsSync(siNetFile)) {
    let siNet = fs.readFileSync(siNetFile, 'utf8');
    if (!siNet.includes('EDEXUI_WMIC_FIX')) {
        siNet = siNet.replace(
`function getWindowsNics() {
  const cmd = util.getWmic() + ' nic get /value';
  const cmdnicconfig = util.getWmic() + ' nicconfig get dhcpEnabled /value';`,
`function getWindowsNics() { // EDEXUI_WMIC_FIX
  const wmicExe = util.getWmic();
  if (!wmicExe) { return []; }
  const cmd = wmicExe + ' nic get /value';
  const cmdnicconfig = wmicExe + ' nicconfig get dhcpEnabled /value';`
        );
        fs.writeFileSync(siNetFile, siNet, 'utf8');
        console.log('[OK] systeminformation/network.js wmic fix applied');
    } else {
        console.log('[OK] systeminformation/network.js already patched');
    }
} else {
    console.log('[SKIP] systeminformation/network.js not found');
}
