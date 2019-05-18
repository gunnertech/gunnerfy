import fs from 'fs-extra';
// import IAM from 'aws-sdk/clients/iam';

import AWS from 'aws-sdk'


const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const createAccountAlias = args =>
  Promise.resolve(
    new AWS.IAM({
      credentials: new AWS.SharedIniFileCredentials({
          profile: args.profile,
          filename: `${process.env['HOME']}/.aws/credentials`
      }),
      region: args.region
    })
  )
    .then(iamNew => 
      iamNew.createAccountAlias({AccountAlias: args.accountAlias}).promise()
    )
    .catch(err => 
      err.code === 'EntityAlreadyExists' ? (
        console.log("Account Alias Already Created") ||
        Promise.resolve(args)
      ) : (
        //Promise.reject(err)
        console.log("Let's Try this again!") ||
        createAccountAlias(args)
      )
    )
    .then(() => Promise.resolve(args))

const writeCredentialsToFile = args =>
  fs.readFile(`${process.env['HOME']}/.aws/credentials`, 'utf8')
    .then(contents =>
      contents.includes(`[${args.accountAlias}developer]`) ? (
        Promise.resolve(args)
      ) : (
        Promise.resolve(
`
[profile ${args.accountAlias}developer]
role_arn = arn:aws:iam::${args.accountId}:role/${args.roleName}
source_profile = ${args.sourceProfile}
region = ${args.region}

`
        )
          .then(str => 
            Promise.all([
              fs.appendFile(`${process.env['HOME']}/.aws/credentials`, str.replace(`[profile `, `[`)),
              fs.appendFile(`${process.env['HOME']}/.aws/config`, str)
            ])
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
      args.iam.addUserToGroup({
        GroupName: args.groupName,
        UserName: User.UserName,
      })
      .promise()
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
  console.log("createAccount...") ||
  !args.account ? (
    args.organizations.createAccount({
      AccountName: args.accountName,
      Email: args.email,
      RoleName: args.roleName
    })
    .promise()
    .then(({CreateAccountStatus}) => 
      createAccount({
        ...args,
        account: {
          creationStatusId: CreateAccountStatus.Id
        }
      })
    )
  ) : args.account.accountStatus === 'SUCCEEDED' ? (
    Promise.resolve(args)
  ) : (
    args.organizations.describeCreateAccountStatus({
      CreateAccountRequestId: args.account.creationStatusId
    })
    .promise()
    .then(({CreateAccountStatus}) =>
      console.log(`Creating AWS Account: ${CreateAccountStatus.State}`) ||
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

const add = ({
  stage,
  identifier,
  organizationalUnitName,
  accountName,
  region = "us-east-1",
  sourceProfile = "default",
  email,
  groupName,
  accountId,
  projectName
}) => 
  Promise.resolve({
    stage,
    identifier,
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
    accountAlias: (args.accountName || `${args.projectName}-${args.stage}`).toLowerCase(),
    groupName: (args.groupName || `${args.accountName || `${args.projectName}-${args.stage}`}Admins`),
    email: (args.email || `${args.accountName || `${args.projectName}-${args.stage}`}@${args.identifier}`),
    roleName: `${(args.accountName || `${args.projectName}-${args.stage}`).replace(/ /,'')}OrganizationAccountAccessRole`
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
  .then(args => !args.accountId ? createAccount(args) : Promise.resolve(args))
  .then(getRootAccountId)
  .then(getRootOrganizationalUnitId)
  .then(findOrganizationalUnit)
  .then(args => !args.organizationalUnitId ? createOrganizationalUnit(args) : Promise.resolve(args))
  .then(moveAccount)
  .then(createPolicy)
  .then(createGroup)
  .then(attachGroupPolicy)
  .then(addUserToGroup)
  .then(writeCredentialsToFile)
  .then(createAccountAlias)

export default add;