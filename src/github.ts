import * as github from '@actions/github'
import * as yaml from 'js-yaml'
import {graphql, GraphQLSchema, GraphQLObjectType, GraphQLString} from 'graphql'

export function getPrNumber(): number | undefined {
  const pullRequest = github.context.payload.pull_request
  if (!pullRequest) {
    return undefined
  }

  return pullRequest.number
}

export function getPrAuthor(): string | undefined {
  const pullRequest = github.context.payload.pull_request
  if (!pullRequest) {
    return undefined
  }

  return pullRequest.user.login
}

export function getPrOrganization(): string | undefined {
  return github.context.payload.organization
}

export async function getAuthorTeam(
  client: github.GitHub
): Promise<string | undefined> {
  const response = (await client.graphql(
    `
      {
        organization(login: "${getPrOrganization()}") {
          teams(first: 1, userLogins: ["${getPrAuthor()}"]) {
            totalCount
            edges {
              node {
                name
              }
            }
          }
        }
      }
    `
  )) as any

  if (response.errors) {
    throw response.errors
  }

  const team = response.data.organization.teams.edges[0].node.name

  return team
}

export async function getLabelKey(
  useTeams: boolean,
  client: github.GitHub
): Promise<string | undefined> {
  if (useTeams) {
    const team = await getAuthorTeam(client)
    return `zensurance/${team}`
  } else {
    return getPrAuthor()
  }
}

export async function getLabelsConfiguration(
  client: github.GitHub,
  configurationPath: string
): Promise<Map<string, string[]>> {
  const configurationContent: string = await fetchContent(
    client,
    configurationPath
  )
  const configObject: any = yaml.safeLoad(configurationContent)
  return getLabelGlobMapFromObject(configObject)
}

async function fetchContent(
  client: github.GitHub,
  repoPath: string
): Promise<string> {
  const response = await client.repos.getContents({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    path: repoPath,
    ref: github.context.sha
  })

  if (
    !Array.isArray(response.data) &&
    typeof response.data === 'object' &&
    response.data.content
  )
    return Buffer.from(response.data.content, 'base64').toString()
  throw new Error('Invalid yaml file')
}

function getLabelGlobMapFromObject(configObject: any): Map<string, string[]> {
  const labelGlobs: Map<string, string[]> = new Map()
  for (const label in configObject) {
    if (typeof configObject[label] === 'string') {
      labelGlobs.set(label, [configObject[label]])
    } else if (configObject[label] instanceof Array) {
      labelGlobs.set(label, configObject[label])
    } else {
      throw Error(
        `found unexpected type for label ${label} (should be string or array of globs)`
      )
    }
  }

  return labelGlobs
}

export function createClient(token: string): github.GitHub {
  return new github.GitHub(token)
}

export async function addLabels(
  client: github.GitHub,
  prNumber: number,
  labels: string[]
) {
  await client.issues.addLabels({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: prNumber,
    labels
  })
}
