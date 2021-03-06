import AWS from 'aws-sdk'

import {
  writeCredentialsToFile,
  addUserToGroup,
} from "./index"

const add = ({
  stage,
  email,
  organizationalUnitName,
  accountName,
  region = "us-east-1",
  sourceProfile = "default",
  groupName,
  accountId,
  projectName
}) => 
  Promise.resolve({
    stage,
    organizationalUnitName,
    accountName,
    region,
    sourceProfile,
    email,
    groupName,
    accountId,
    projectName
})
  .then(args => ({
    ...args,
    accountName: args.accountName || `${args.projectName}-${args.stage}`,
    accountAlias: (args.accountName || `${args.projectName}-${args.stage}`).toLowerCase().replace(/ /g, ""),
    groupName: (args.groupName || `${args.accountName || `${args.projectName}-${args.stage}`}Admins`),
    roleName: `OrganizationAccountAccessRole`
  }))
  .then(args => ({
    ...args,
    iam: new AWS.IAM({
      credentials: new AWS.SharedIniFileCredentials({
        profile: args.sourceProfile,
        filename: `${process.env['HOME']}/.aws/credentials`
      }),
      region: args.region
    }),
    organizations: new AWS.Organizations({
      credentials: new AWS.SharedIniFileCredentials({
        profile: args.sourceProfile,
        filename: `${process.env['HOME']}/.aws/credentials`
      }),
      region: 'us-east-1'
    })
  }))
  .then(addUserToGroup)
  .then(writeCredentialsToFile)
  

export default add;