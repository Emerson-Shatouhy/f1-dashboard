// electron-builder afterPack hook: VMP-sign the packaged app with castLabs EVS.
//
// Onboard video is Widevine DRM. F1 TV's licence server rejects the development certificate an
// unsigned castLabs Electron build presents (DEVELOPMENT_CERTIFICATE_NOT_ALLOWED), so macOS and
// Windows builds must be signed. afterPack runs before electron-builder's own code signing,
// which is the order castLabs requires. Linux needs no signing.
//
// Credentials come from EVS_ACCOUNT_NAME / EVS_PASSWD (CI secrets). Without them the build still
// succeeds, but onboard video won't play in it.
const { spawnSync } = require('child_process')

exports.default = async function evsSign(context) {
  const { electronPlatformName, appOutDir } = context
  if (electronPlatformName === 'linux') return

  const account = process.env.EVS_ACCOUNT_NAME
  const passwd = process.env.EVS_PASSWD
  if (!account || !passwd) {
    console.warn(
      '[evsSign] EVS_ACCOUNT_NAME / EVS_PASSWD not set: skipping VMP signing. Onboard video will not play in this build.'
    )
    return
  }

  const python = process.platform === 'win32' ? 'python' : 'python3'
  console.log(`[evsSign] signing ${appOutDir}`)
  const res = spawnSync(
    python,
    ['-m', 'castlabs_evs.vmp', 'sign-pkg', '-A', account, '-P', passwd, appOutDir],
    { stdio: 'inherit' }
  )
  if (res.status !== 0) {
    throw new Error(`[evsSign] VMP signing failed (exit ${res.status})`)
  }
}
