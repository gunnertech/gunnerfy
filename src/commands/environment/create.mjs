import AWS from 'aws-sdk'

import {
  createAccount,
  sleep,
  createAccountAlias,
  writeCredentialsToFile,
  addUserToGroup,
  attachGroupPolicy,
  createGroup,
  createPolicy,
  moveAccount,
  findOrganizationalUnit,
  createOrganizationalUnit,
  getRootOrganizationalUnitId,
  getRootAccountId
} from "./index"

const create = ({
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
  .then(getRootAccountId)
  .then(getRootOrganizationalUnitId)
  .then(args =>
    (!args.accountId ? (
      createAccount(args)
        .catch(err => console.log(err, err.stack) ||
          getAllAccounts({profile: args.sourceProfile})
            .then(accounts => Promise.resolve(
              accounts.find(account => account.Name === args.accountName)
            ))
            .then(account => Promise.resolve({
              ...args,
              accountId: account.Id,
              account: {
                ...args.account,
                accountId: account.Id
              }
            }))
        )
    ) : (
      Promise.resolve(args)) 
    ))
  .then(findOrganizationalUnit)
  .then(args => !args.organizationalUnitId ? createOrganizationalUnit(args) : Promise.resolve(args))
  .then(moveAccount)
  .then(createPolicy)
  .then(createGroup)
  .then(attachGroupPolicy)
  .then(addUserToGroup)
  .then(writeCredentialsToFile)
  .then(createAccountAlias)
  .then(() => console.log("Sleep for 30 seconds....") || sleep(30000))




export default create;