import shell from 'shelljs'
import AWS from 'aws-sdk';
import fs from 'fs-extra';
import chalk from 'chalk';

const tag = ({stage, iterationEndDate}) =>
  fs.readFile(`./gunnerfy.json`, 'utf8')
    .then(jsonString => Promise.resolve(JSON.parse(jsonString)))
    .then(({projectName}) =>
      Promise.resolve(
        shell.exec(`
          git checkout ${stage} &&
          git pull ${stage} &&
          git tag released/${iterationEndDate} &&
          git push ${stage} released/${iterationEndDate}
        `)
      )
    )


const approve = ({stage, requestId}) =>
  fs.readFile(`./gunnerfy.json`, 'utf8')
    .then(jsonString => Promise.resolve(JSON.parse(jsonString)))
    .then(({projectName}) =>
      Promise.resolve(
        `Approve git pull request`
      )
      .then(() => 
        new AWS.CodeCommit({
          credentials: new AWS.SharedIniFileCredentials({
            profile: `${projectName.toLowerCase()}-${stage}developer`,
            filename: `${process.env['HOME']}/.aws/credentials`
          }),
          region: 'us-east-1'
        })
        .mergePullRequestByFastForward({
          pullRequestId: requestId,
          repositoryName: `${projectName.toLowerCase()}-${stage}`,
        })
        .promise()
      )
    )


const submit = ({stage, targetStage, iterationEndDate}) =>
  fs.readFile(`./gunnerfy.json`, 'utf8')
    .then(jsonString => Promise.resolve(JSON.parse(jsonString)))
    .then(({projectName}) =>
      Promise.resolve(
        shell.exec(`
          git checkout -b ${stage}-${iterationEndDate} &&
          git push ${targetStage} ${stage}-${iterationEndDate}
        `)
      )
      .then(() => 
        new AWS.CodeCommit({
          credentials: new AWS.SharedIniFileCredentials({
            profile: `${projectName.toLowerCase()}-${stage}developer`,
            filename: `${process.env['HOME']}/.aws/credentials`
          }),
          region: 'us-east-1'
        })
        .createPullRequest({
          title: `${iterationEndDate} Iteration Pull Request`,
          description: `${iterationEndDate} Iteration Pull Request`,
          clientRequestToken: iterationEndDate,
          targets: [{
            repositoryName: `${projectName.toLowerCase()}-${targetStage}`,
            sourceReference: `${stage}-${iterationEndDate}`,
          }]
        })
        .promise()
        .then(({pullRequest}) => Promise.resolve(console.log(chalk.green(`
********************************************************************
*                                                                  *
*                                                                  *
* Your pull request id is: ${pullRequest.pullRequestId}            *
*                                                                  *
*                                                                  *
********************************************************************
        `))))
      )
    )

  export { submit, approve, tag }