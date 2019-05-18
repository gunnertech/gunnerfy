import { execSync } from 'child_process';
import AWS from 'aws-sdk'
import fs from 'fs-extra';

import init from './init';
import deploy from './deploy';
import setvar from '../setvar';
import awscreds from '../awscreds'


const setup = ({stage, projectName, path, npmPath}) =>
  init({stage, projectName, npmPath, path})
    .then(() => fs.existsSync(`${path}/serverless/amplify/backend/api`))
    .then(hasAmplify => Promise.resolve(
      hasAmplify ? (
        ''
      ) : (
        Promise.resolve(execSync(` 
          (cd ${path}/serverless && amplify add api || true) && \\
          (cd ${path}/serverless && amplify add auth || true) && \\
          (cd ${path}/serverless && amplify add analytics || true) && \\
          (cd ${path}/serverless && amplify add storage || true)
        `, {stdio: ['inherit','inherit','inherit']}))
      )
    ))
    .then(() => deploy({npmPath, path}))
    .then(() => 
      awscreds({projectName, stage})
        .then(credentials => Promise.resolve(
          (new AWS.CognitoIdentityServiceProvider({
            credentials,
            region: 'us-east-1'
          }))
          .listUserPools({MaxResults: 1})
          .promise()
          .then(({UserPools}) => setvar({path, name: `${stage}-user-pool-id`, value: UserPools[0].Id}))
        ))
    )
    .then(() => 
      awscreds({projectName, stage})
        .then(credentials => Promise.resolve(
          (new AWS.IAM({
            credentials,
            region: 'us-east-1'
          }))
          .listRoles()
          .promise()
          .then(({Roles}) => Roles.find(role => role.RoleName.endsWith('-authRole')).RoleName)
          .then(roleName => setvar({path, name: `${stage}-auth-role-name`, value: roleName}))
        ))
    )
    .then(() => 
      awscreds({projectName, stage})
        .then(credentials => Promise.resolve(
          (new AWS.S3({
            credentials,
            region: 'us-east-1'
          }))
          .listBuckets()
          .promise()
          .then(({Buckets}) => Buckets.find(bucket => bucket.Name.endsWith(`-${stage}`)).Name)
          .then(bucketName => setvar({path, name: `${stage}-bucket-name`, value: bucketName}))
        ))
    )



export default setup