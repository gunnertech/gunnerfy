import fs from 'fs-extra';
import AWS from 'aws-sdk';
import shell from 'shelljs'
import readline from 'readline'

import amplifyDeploy from '../amplify/deploy'
import hostingSetup from '../amplify/hosting/setup'
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
            serverless deploy -s ${stage}
          `)   
        ))
        .then(() => amplifyDeploy({projectName}))
        .then(() => migrate({stage, projectName}))
        // .then(obj => new Promise((resolve, reject) => 
        //   rl.question('Would you like to run database migrations (y/N): ', answer => resolve(answer))
        // ))
        // .then(answer =>
        //   answer === 'y' ? (
        //     migrate({stage, projectName})
        //   ) : (
        //     Promise.resolve("")
        //   )
        // )  
    )
    .then(() => Promise.resolve(
      shell.exec(`
        echo $(serverless deploy list -s ${stage})
      `)
    ))
  

const web = ({stage}) =>
  fs.readFile(`./gunnerfy.json`, 'utf8')
    .then(jsonString => JSON.parse(jsonString))
    .then(({projectName}) => Promise.all([
      Promise.resolve(
        shell.exec(`
          git checkout ${stage}; git add .; git commit -am "deploying web front end";
        `).code
      ),
      hostingSetup({stage, projectName}),
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
    ]))
    .then(([_, p, client]) =>
      client
        .listApps()
        .promise()
        .then(({apps}) => apps[0].appId)
        .then(appId =>
          client
            .listJobs({appId, branchName: stage})
            .promise()
            .then(({jobSummaries}) => (
              !!jobSummaries.find(js => ["PENDING", "PROVISIONING", "RUNNING", "CANCELLING"].includes(js.status)) ? (
                console.log("There's already a job in progress")
              ) : (
                client
                  .startJob({appId, branchName: stage, jobType: "RELEASE"})
                  .promise()
              )
            ))
          .then(() => sleep(5000))
          .then(() =>
            client
              .listJobs({appId, branchName: stage})
              .promise()
          )
        )
    )
    .then(({jobSummaries}) =>
      console.log((jobSummaries||[])[0])
    )
    

const mobile = ({stage}) =>
  new Promise((resolve, reject) => 
    rl.question('Is this an over the air update? (Y/n): ', answer => resolve(answer))
  )
  .then(answer => Promise.resolve(
    answer === 'n' ? (
      shell.exec(`
        cd react-native-project &&
        echo "Starting. Are you sure you updated the build/version numbers?\\n\\n\\n" &&
        expo build:ios --release-channel ${stage} &&
        expo build:android --release-channel ${stage} &&
        echo "\\n\\n\\nThe builds have finished, but you still need to download them and publish them to the respective app stores"
      `)
    ) : (
      shell.exec(`
        expo publish --release-channel ${stage}
      `)
    )   
  ))
  .then(() => Promise.resolve(
    shell.exec(`
      expo publish:history --release-channel ${stage}
    `)
  ))


export {backend, web, mobile};