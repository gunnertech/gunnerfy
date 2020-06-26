import fs from 'fs-extra';
import shell from 'shelljs'
import readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

import AWS from 'aws-sdk'

import { 
  getAllAccounts 
} from '../util'


const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const createAccountAlias = args =>
  // Promise.resolve(
  //   new AWS.IAM({
  //     credentials: new AWS.SharedIniFileCredentials({
  //         profile: args.profile,
  //         filename: `${process.env['HOME']}/.aws/credentials`
  //     }),
  //     region: args.region
  //   })
  // )
  //   .then(iamNew => 
  //     iamNew.createAccountAlias({AccountAlias: args.accountAlias}).promise()
  //   )
  //   .catch(err => 
  //     err.code === 'EntityAlreadyExists' ? (
  //       console.log("Account Alias Already Created") ||
  //       Promise.resolve(args)
  //     ) : (
  //       //Promise.reject(err)
  //       console.log("Let's Try this again!") ||
  //       createAccountAlias(args)
  //     )
  //   )
  Promise.resolve(shell.exec(
    `aws iam create-account-alias --account-alias ${args.accountAlias} --profile ${args.profile}`
  ))
    .then(() => Promise.resolve(args))

const writeCredentialsToFile = args =>
  fs.readFile(`${process.env['HOME']}/.aws/credentials`, 'utf8')
    .then(contents =>
      contents.includes(`[${args.accountAlias}developer]`) ? (
        Promise.resolve(args)
      ) : (
        Promise.resolve(
`
[profile ${args.accountAlias}developer]\\r
role_arn = arn:aws:iam::${args.accountId}:role/${args.roleName}\\r
source_profile = ${args.sourceProfile}\\r
region = ${args.region}\\r
\
`
        )
          // .then(str => 
          //   Promise.all([
          //     fs.appendFile(`${process.env['HOME']}/.aws/credentials`, str.replace(`[profile `, `[`)),
          //     fs.appendFile(`${process.env['HOME']}/.aws/config`, str)
          //   ])
          // )
          .then(str => 
            Promise.resolve(shell.exec(`
              echo "${str.replace('[profile ', '[')}" >> ${process.env['HOME']}/.aws/credentials &&
              echo "${str}" >> ${process.env['HOME']}/.aws/config
            `))
          )
      )
    )
    .then(() => Promise.resolve({
      ...args,
      profile: `${args.accountAlias}developer`
    }))

const addUserToGroup = args =>
  args.iam.getUser()
    .promise()
    .then(({User}) => 
      args.iam.listGroupsForUser({MaxItems: 1000, UserName: User.UserName})
        .promise()
        .then(({Groups}) =>
          console.log("You're in ", Groups.length, " groups") ||
          Groups.length >= 10 ? Promise.reject(User.UserName + " already belongs to 10 groups") :
          args.iam.addUserToGroup({
            GroupName: args.groupName,
            UserName: User.UserName,
          })
          .promise()
        )
    )
    .then(() => Promise.resolve(args))
  

const attachGroupPolicy = args =>
  args.iam.attachGroupPolicy({
    GroupName: args.groupName,
    PolicyArn: args.policyArn,
  })
  .promise()
  .then(() => Promise.resolve(args))

const createGroup = args =>
  args.iam.createGroup({GroupName: args.groupName})
    .promise()
    .catch(err => console.log("Already created the Group") || Promise.resolve(args))
    .then(({Group}) => Promise.resolve(args))

const createPolicy = args =>
  Promise.resolve(`${args.accountName}Access`)
    .then(policyName =>
      args.iam.createPolicy({
        PolicyDocument: JSON.stringify({
          "Version": "2012-10-17",
          "Statement": [{
              "Effect": "Allow",
              "Action": [
                  "sts:AssumeRole"
              ],
              "Resource": [
                  `arn:aws:iam::${args.accountId}:role/${args.roleName}`
              ]
          }]
        }),
        PolicyName: policyName,
      })
      .promise()
      .then(data => Promise.resolve(
        `arn:aws:iam::${args.rootAccountId}:policy/${policyName}`
      ))
      .catch(err => console.log("Policy Already Created") || Promise.resolve(
        `arn:aws:iam::${args.rootAccountId}:policy/${policyName}`
      ))  
    )
    .then(policyArn => Promise.resolve({
      ...args,
      policyArn
    }))

const moveAccount = args => 
  args.organizations.moveAccount({
    AccountId: args.accountId,
    SourceParentId: args.rootOrganziationalUnitId,
    DestinationParentId: args.organizationalUnitId
  })
  .promise()
  .then(data => Promise.resolve(args))
  .catch(err =>
    console.log("Account already moved") ||
    Promise.resolve(args)
  )

const findOrganizationalUnit = (args, ous, nextToken) =>
  !ous || !!nextToken ? (
    args.organizations.listOrganizationalUnitsForParent({
      ParentId: args.rootOrganziationalUnitId,
      NextToken: nextToken
    })
    .promise()
    .then(data => findOrganizationalUnit(args, [...(ous||[]), ...data.OrganizationalUnits], data.NextToken))
  ) : Promise.resolve({
    ...args,
    organizationalUnitId: (ous.find(ou => ou.Name === args.organizationalUnitName) || {}).Id
  })

    

const createOrganizationalUnit = args =>
  args.organizations.createOrganizationalUnit({
    Name: args.organizationalUnitName,
    ParentId: args.rootOrganziationalUnitId
  })
  .promise()
  .then(({OrganizationalUnit}) =>
    Promise.resolve({
      ...args,
      organizationalUnitId: OrganizationalUnit.Id
    })
  )
  
const getRootOrganizationalUnitId = args =>
  args.organizations.listRoots({})
    .promise()
    .then(({Roots}) => Promise.resolve({
      ...args,
      rootOrganziationalUnitId: Roots[0].Id
    }))

const getRootAccountId = args =>
  args.organizations.describeOrganization({})
    .promise()
    .then(({Organization}) => Promise.resolve({
      ...args,
      rootAccountId: Organization.MasterAccountArn.split(':')[4]
    }))

const createAccount = args =>
  (!!args.email || !!args.accountId ? (
    Promise.resolve(args)
  ) : (new Promise(resolve => 
    rl.question('Enter a unique email address to be used for this AWS account: ', answer => resolve({
      ...args,
      email: answer
    }))
  )))
  .then(args => (
    !args.account ? (
      getAllAccounts({profile: args.sourceProfile})
        .then(accounts => Promise.resolve(
          accounts.find(account => account.Name === args.accountName)
        ))
        .then(account => (
          !!account ? (
            Promise.resolve({
              ...args,
              accountId: account.Id,
              account: {
                ...args.account,
                accountId: account.Id
              }
            })
          ) : (
            args.organizations.createAccount({
              AccountName: args.accountName,
              Email: args.email,
              RoleName: args.roleName
            })
            .promise()
            .then(({CreateAccountStatus}) => 
              console.log(CreateAccountStatus) ||
              createAccount({
                ...args,
                account: {
                  creationStatusId: CreateAccountStatus.Id
                }
              })
            )
          )
        ))
    ) : args.account.accountStatus === 'SUCCEEDED' ? (
      Promise.resolve({
        ...args,
        accountId: args.account.accountId
      })
    ) : (
      args.organizations.describeCreateAccountStatus({
        CreateAccountRequestId: args.account.creationStatusId
      })
      .promise()
      .then(({CreateAccountStatus}) =>
        console.log(`Creating AWS Account`, CreateAccountStatus) ||
        sleep(5000)
          .then(() => CreateAccountStatus.State === 'FAILED' ? Promise.reject(CreateAccountStatus) : createAccount({
            ...args,
            accountId: CreateAccountStatus.AccountId,
            account: {
              ...args.account,
              accountStatus: CreateAccountStatus.State,
              accountId: CreateAccountStatus.AccountId
            }
          }))
      )
    )
  ))



export {
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
};