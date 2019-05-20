import AWS from 'aws-sdk'
import chalk from 'chalk';
import readline from 'readline'

import awscreds from '../awscreds'

const rl2 = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});



const sts = ({projectName, stage}) =>
  awscreds({projectName, stage})
    .then(credentials => Promise.resolve(
      new AWS.STS({
        credentials,
        region: 'us-east-1'
      })
    ))

const iam = ({profile}) =>
  new AWS.IAM({
    credentials: new AWS.SharedIniFileCredentials({
      profile: profile,
      filename: `${process.env['HOME']}/.aws/credentials`
    }),
    region: 'us-east-1'
  })


const add = ({projectName, stage, userName, profile='default'}) =>
  Promise.resolve('Adding User to Group')
    .then(() => 
      iam({profile})
      .listGroups({})
      .promise()
    )
    .then(({Groups}) => Promise.resolve(
      Object.assign(Groups.map(group => group.GroupName))
    ))
    .then(groups => 
      new Promise((resolve, reject) => {
        console.log(chalk.green('Please enter the group number to add the user to:'));
        Object.entries(groups).forEach(([key,value]) => console.log(`${key}: ${value}`) );
        rl2.question(chalk.green('Enter choice: '), answer => resolve(groups[answer]));
      })
    )
    .then(groupName =>
      !!groupName ? (
        Promise.resolve(groupName)
      ) : (
        Promise.reject("Invalid group selection!")
      ) 
    )
    .then(groupName =>
      iam({profile})
        .addUserToGroup({GroupName: groupName, UserName: userName})
        .promise()
    )
    .then(() =>
      sts({projectName, stage})
        .then(sts => sts.getCallerIdentity().promise())
        
    )
    .then(({Account}) => Promise.resolve(
      console.log(chalk.green(`${userName} has been added. To start developing, they can run: $ gunnerfy add-project ${projectName} -s ${stage}`))
    ))


export default add