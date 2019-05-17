import fs from 'fs-extra';
import AWS from 'aws-sdk';
import shell from 'shelljs'
import readline from 'readline'

import amplifyDeploy from '../amplify/deploy'
import migrate from '../rds/migrate'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

const backend = ({stage}) =>
  fs.readFile(`./gunnerfy.json`, 'utf8')
    .then(jsonString => Promise.resolve(JSON.parse(jsonString)))
    .then(({projectName}) =>
      Promise.resolve("Deploying backend")
        .then(() => Promise.resolve(
          shell.exec(`
            cd serverless &&
            ${process.env.NVM_BIN}/serverless deploy -s ${stage}
          `)   
        ))
        .then(() => amplifyDeploy({npmPath: process.env.NVM_BIN, path: "."}))
        .then(obj => new Promise((resolve, reject) => 
          rl.question('Would you like to run database migrations (y/N): ', answer => resolve(answer))
        ))
        .then(answer =>
          answer === 'y' ? (
            migrate({stage, projectName, path: "."})
          ) : (
            Promise.resolve("")
          )
        )  
    )
    .then(() => Promise.resolve(
      shell.exec(`
        echo $(${process.env.NVM_BIN}/serverless deploy list -s ${stage})
      `)
    ))
  

const web = ({stage}) =>
  fs.readFile(`./gunnerfy.json`, 'utf8')
    .then(jsonString => Promise.resolve(JSON.parse(jsonString)))
    .then(({projectName}) =>
      Promise.resolve(
        new AWS.Amplify({
          apiVersion: '2017-07-25',
          credentials: new AWS.SharedIniFileCredentials({
            profile: `${projectName.toLowerCase()}-${stage}developer`,
            filename: `${process.env['HOME']}/.aws/credentials`
          }),
          region: 'us-east-1'
        })
      )
    )
    .then(client =>
      client
        .listApps()
        .promise()
        .then(({apps}) => Promise.resolve(apps[0].appId)  
        .then(appId => 
          Promise.resolve(
            shell.exec(`
              git push
            `)
          )
          .then(() => sleep(5000))
          .then(() =>
            client
              .listJobs({appId, branchName: stage})
              .promise()
          )
        )
      )
    )
    .then(({jobSummaries}) => Promise.resolve(
      console.log((jobSummaries||[])[0])
    ))
    

const mobile = ({stage}) =>
  new Promise((resolve, reject) => 
    rl.question('Is this an over the air update? (Y/n): ', answer => resolve(answer))
  )
  .then(answer => Promise.resolve(
    answer === 'n' ? (
      shell.exec(`
        cd react-native-project &&
        echo "Starting. Are you sure you updated the build/version numbers?\\n\\n\\n" &&
        ${process.env.NVM_BIN}/expo build:ios --release-channel ${stage} &&
        ${process.env.NVM_BIN}/expo build:android --release-channel ${stage} &&
        echo "\\n\\n\\nThe builds have finished, but you still need to download them and publish them to the respective app stores"
      `)
    ) : (
      shell.exec(`
        ${process.env.NVM_BIN}/expo publish --release-channel ${stage}
      `)
    )   
  ))
  .then(() => Promise.resolve(
    shell.exec(`
      ${process.env.NVM_BIN}/expo publish:history --release-channel ${stage}
    `)
  ))


export {backend, web, mobile};