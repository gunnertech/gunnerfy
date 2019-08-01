import shell from 'shelljs'
import fs from 'fs-extra';

import { projectHome } from '../util'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))


const awsConfig = ({stage, accountId, projectName}) => `

[profile ${projectName.toLowerCase()}-${stage}developer]
role_arn = arn:aws:iam::${accountId}:role/OrganizationAccountAccessRole
source_profile = default
region = us-east-1

`

const awsCredentials = ({stage, accountId, projectName}) => `

[${projectName.toLowerCase()}-${stage}developer]
role_arn = arn:aws:iam::${accountId}:role/OrganizationAccountAccessRole
source_profile = default
region = us-east-1

`

const gitConfig = ({stage, accountId, projectName}) => `
[credential "https://git-codecommit.us-east-1.amazonaws.com/v1/repos/${projectName.toLowerCase()}-${stage}/"]
	UseHttpPath = true
  helper = !aws --profile ${projectName.toLowerCase()}-${stage}developer codecommit credential-helper \$@
  
`

const gitClone = ({stage, accountId, projectName}) => console.log(`
  git clone https://git-codecommit.us-east-1.amazonaws.com/v1/repos/${projectName.toLowerCase()}-${stage} ${projectName}
`) || `
  git clone https://git-codecommit.us-east-1.amazonaws.com/v1/repos/${projectName.toLowerCase()}-${stage} ${projectName}
`

const projectGitConfig = ({stage, accountId, projectName}) => `

[credential "https://git-codecommit.us-east-1.amazonaws.com/v1/repos/${projectName.toLowerCase()}-${stage}/"]
	UseHttpPath = true
	helper = !aws --profile ${projectName.toLowerCase()}-${stage}developer codecommit credential-helper \$@

[remote "${stage}"]
	url = https://git-codecommit.us-east-1.amazonaws.com/v1/repos/${projectName.toLowerCase()}-${stage}
	fetch = +refs/heads/*:refs/remotes/${stage}/*
	pushurl = https://git-codecommit.us-east-1.amazonaws.com/v1/repos/${projectName.toLowerCase()}-${stage}

[branch "${stage}"]
	remote = ${stage}
  merge = refs/heads/${stage}
  
`

const appendToFile = ({file, contents}) =>
  fs.readFileSync(file).includes(contents) ? (
    Promise.resolve(contents)
  ) : (
    fs.appendFile(file, contents, 'utf8')
  )



const add = ({projectName, stage, accountId}) =>
  Promise.resolve('Adding User to Group')
    .then(() => appendToFile({file: `${process.env['HOME']}/.aws/config`, contents: awsConfig({stage, accountId, projectName})}))
    .then(() => appendToFile({file: `${process.env['HOME']}/.aws/credentials`, contents: awsCredentials({stage, accountId, projectName})}))
    .then(() => appendToFile({file: `${process.env['HOME']}/.gitconfig`, contents: gitConfig({stage, accountId, projectName})}))
    .then(() => sleep(10000))
    .then(() => Promise.resolve(
      shell.exec(
        gitClone({stage, accountId, projectName})
      )
      .code
    ))
    .then(() => appendToFile({file: `${projectHome(projectName)}/.git/config`, contents: projectGitConfig({stage, accountId, projectName})}))
    


export default add