// This package assumes a site has already been built and the files exist in the current workspace
// If there's an artifact named `artifact.tar`, it can upload that to actions on its own,
// without the user having to do the tar process themselves.

const core = require('@actions/core')

const { Deployment } = require('./deployment')
const getContext = require('./context')

const deployment = new Deployment()

async function cancelHandler(evtOrExitCodeOrError) {
  await deployment.cancel()
  process.exit(isNaN(+evtOrExitCodeOrError) ? 1 : +evtOrExitCodeOrError)
}

async function main() {
  const { isPreview } = getContext()

  let idToken = ''
  try {
    idToken = await core.getIDToken()
  } catch (error) {
    console.log(error)
    core.setFailed(`Ensure GITHUB_TOKEN has permission "id-token: write".`)
    return
  }

  try {
    const deploymentInfo = await deployment.create(idToken)

    // Output the deployed Pages URL
    let pageUrl = deploymentInfo?.['page_url'] || ''
    const previewUrl = deploymentInfo?.['preview_url'] || ''
    if (isPreview && previewUrl) {
      pageUrl = previewUrl
    }
    core.setOutput('page_url', pageUrl)

    await deployment.check()
  } catch (error) {
    core.setFailed(error)
  }
}

// Register signal handlers for workflow cancellation
process.on('SIGINT', cancelHandler)
process.on('SIGTERM', cancelHandler)

// Main
const emitTelemetry = core.getInput('emit_telemetry')
if (emitTelemetry === 'true') {
  // For compatibility, treat the use of this deprecated input as a no-op
} else {
  main()
}
