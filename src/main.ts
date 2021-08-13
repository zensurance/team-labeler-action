import * as core from '@actions/core'
import {getTeamLabel} from './teams'
import {
  getPrNumber,
  getLabelsConfiguration,
  addLabels,
  createClient,
  getLabelKey
} from './github'

async function run() {
  try {
    const token = core.getInput('repo-token', {required: true})
    const configPath = core.getInput('configuration-path', {required: true})

    const prNumber = getPrNumber()
    if (!prNumber) {
      core.debug('Could not get pull request number from context, exiting')
      return
    }

    const client = createClient(token)

    const labelKey = getLabelKey(client)

    if (!labelKey) {
      core.debug(
        'Could not get pull request user or team from context, exiting'
      )
      return
    }

    const labelsConfiguration: Map<string, string[]> =
      await getLabelsConfiguration(client, configPath)

    const labels: string[] = getTeamLabel(labelsConfiguration, `@${labelKey}`)

    if (labels.length > 0) await addLabels(client, prNumber, labels)
  } catch (error) {
    core.error(error)
    core.setFailed(error.message)
  }
}

run()
