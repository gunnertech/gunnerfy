import AWS from 'aws-sdk'
import fs from 'fs-extra';
import shell from 'shelljs'

import setvar from '../../setvar';
import awscreds from '../../awscreds'
import { projectHome } from '../../util'

const getServiceRoleArn = credentials =>
  Promise.resolve(new AWS.IAM({
    credentials,
    region: 'us-east-1'
  }))
    .then(iam =>
      iam.getRole({RoleName: "amplifyconsole-backend-role2"})
        .promise()
        .then(({Role: {Arn}}) => Arn)
        .catch(() => 
          iam.createRole({
            Path: "/",
            RoleName: "amplifyconsole-backend-role2",
            AssumeRolePolicyDocument: JSON.stringify({"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"amplify.amazonaws.com"},"Action":"sts:AssumeRole"}]})
          })
          .promise()
          .then(({Role: {Arn}}) => 
            iam
              .attachRolePolicy({RoleName: "amplifyconsole-backend-role2", PolicyArn: Arn})
              .promise()
              .then(() => Arn)
          )
        )
    )

const removeProperties = ((props, obj) => {
  let copy = {...obj};
  props.forEach(key => {delete copy[key];} );
  return copy
})

const setup = ({stage, projectName}) =>
  awscreds({projectName, stage})
    .then(credentials =>
      Promise.all([
        Promise.resolve(
          new AWS.Amplify({
            apiVersion: '2017-07-25',
            credentials,
            region: 'us-east-1'
          })
        ),
        getServiceRoleArn(credentials)
      ])
    )
    .then(([client, serviceRoleArn]) => 
      fs.readFile(`${projectHome(projectName)}/react-client/.env.${stage}`, 'utf8')
        .then(contents => contents.split("\n").reduce((obj, currentValue) => !currentValue.split('=')[0] ? obj : ({
          ...obj,
          [currentValue.split('=')[0]]: currentValue.split('=')[1].replace(/('|")/g,"")
        }),{}))
        .then(options => Promise.resolve([client, options, serviceRoleArn]))
    )
    .then(([client, options, serviceRoleArn]) => Promise.resolve([client, {
      name: `${projectName}-${stage}`,
      platform: 'WEB',
      customRules: [
        {
          "source":"</^[^.]+$|\.(?!(mov|mp4|css|json|gif|ico|jpg|js|png|txt|svg|woff|ttf)$)([^.]+$)/>",
          "target":"/index.html",
          "status":"200"
        },
        {
          "source":"/<*>",
          "target":"/index.html",
          "status":"404"
        }
      ],
      enableBasicAuth: false,
      enableBranchAutoBuild: true,
      environmentVariables: options,
      iamServiceRoleArn: serviceRoleArn
    }]))
    .then(([client, options]) =>
      client
        .listApps()
        .promise()
        .then(({apps}) =>
          !!apps.length ? (
            client.updateApp({
              ...options,
              appId: apps[0].appId,
            })
            .promise()
            .then(() => Promise.resolve({app: apps[0]}))
            .then(({app}) =>
              client.createBranch({
                ...removeProperties(["iamServiceRoleArn", "customRules", "platform", "name", "enableBranchAutoBuild"], options),
                appId: app.appId,
                framework: 'react',
                enableNotification: true,
                branchName: stage,
                stage: "PRODUCTION"
              })
              .promise()
              .then(() => Promise.resolve({app}))
              .catch(err => Promise.resolve({app}))
            )
          ) : (
            client
              .createApp({
                ...options, 
                oauthToken: 'STRING_VALUE',
                repository: `https://git-codecommit.us-east-1.amazonaws.com/v1/repos/${projectName.toLowerCase()}-${stage}/`, /* required */
              })
              .promise()
              .then(({app}) =>
                client.createBranch({
                  ...removeProperties(["iamServiceRoleArn", "customRules", "platform", "name", "enableBranchAutoBuild"], options),
                  appId: app.appId,
                  framework: 'react',
                  enableNotification: true,
                  branchName: stage,
                  stage: "PRODUCTION"
                })
                .promise()
                .then(() => ({app}))
                .catch(err => Promise.resolve({app}))
              )
          )
        )
    )
    .then(({app}) => setvar({projectName, name: `${stage}-app-id`, value: app.appId}))
    .then(() => Promise.resolve(shell.exec(`
      cd ${projectHome(projectName)} && git add . && git commit -am "sets variables; sets up amplify hosting"
		`).code))



export default setup