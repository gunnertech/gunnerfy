import * as path from 'path';
import fs from 'fs-extra';
import AWS from 'aws-sdk';

const getAllAccounts = ({accounts=[], nextToken, sourceProfile='default'} = {accounts: [], sourceProfile: 'default'}) =>
  new AWS.Organizations({
    credentials: new AWS.SharedIniFileCredentials({
      profile: sourceProfile,
      filename: `${process.env['HOME']}/.aws/credentials`
    }),
    region: 'us-east-1'
  })
    .listAccounts({NextToken: nextToken})
    .promise()
    .then(data =>
      !!data.NextToken ? (
        getAllAccounts({
          accounts: [
            ...accounts,
            ...data.Accounts
          ],
          nextToken: data.NextToken
        })
      ) : (
        Promise.resolve([
          ...accounts,
          ...data.Accounts
        ])
      )
    )

const projectHome = (projectName = '') =>
  fs.existsSync(`${path.resolve(path.dirname(''))}/gunnerfy.json`) ? (
    path.resolve(path.dirname(
      JSON.parse(
        fs.readFileSync(`${path.resolve(path.dirname(''))}/gunnerfy.json`, 'utf8')
      )
      .projectName
    ))
  ) : (
    path.resolve(path.dirname(`./${projectName}`), projectName)
  )

const workspaceHome = projectName => 
  path.resolve(projectHome(projectName), "..")

const projectName = pn =>
  !!pn ? (
    pn
  ) : (
    JSON.parse(
      fs.readFileSync(`${projectHome(pn)}/gunnerfy.json`, 'utf8')
    )
    .projectName
  )

export { projectHome, projectName, workspaceHome, getAllAccounts }
