#!/usr/bin/env node --experimental-modules --no-warnings --es-module-specifier-resolution=node
'use strict';

import * as path from 'path';
import chalk from 'chalk';
import program from 'commander'
import shell from 'shelljs'
import fs from 'fs-extra';
import AWS from 'aws-sdk';
import { execSync, spawn } from 'child_process';

import setvar from '../src/commands/setvar';
import addEnvironment from '../src/commands/environment/add';
import createEnvironment from '../src/commands/environment/create';
import getTemplate from '../src/commands/template/get';
import configureEnvironment from '../src/commands/environment/configure';
import setupAmplify from '../src/commands/amplify/setup'
import setupGit from '../src/commands/git/setup'
import setupServerless from '../src/commands/serverless/setup'
// import setupAmplifyHosting from '../src/commands/amplify/hosting/setup'
import setupRds from '../src/commands/rds/setup'
import migrateRds from '../src/commands/rds/migrate'
import addUser from '../src/commands/users/add'
import addProject from '../src/commands/project/add'
import { 
  backend as deployBackend,
  web as deployWeb,
  mobile as deployMobile
} from '../src/commands/deploy'

import { 
  submit as gitSubmit,
  approve as gitApprove,
  tag as gitTag
} from '../src/commands/git'

import { 
  projectHome, 
  projectName as getProjectName, 
  workspaceHome,
  getAllAccounts 
} from '../src/commands/util'


const sts = ({profile='default', region='us-east-1'}) =>
  new AWS.STS({
    credentials: new AWS.SharedIniFileCredentials({
      profile,
      filename: `${process.env['HOME']}/.aws/credentials`
    }),
    region
  })

const defaultStage = ({profile='default', region='us-east-1'}) =>
  sts({profile, region})
    .getCallerIdentity()
    .promise()
    .then(({Arn}) => Promise.resolve(
      Arn.replace(/arn:aws:iam::\d+:user\//,"")
    ))

program
  .version('1.4.5')

program
  .command('migrate')
  .description("Runs all migrations")
  .option('-s, --stage [stage]', 'Stage - if omitted, default stage is used')
  .option('-r, --region [region]', 'AWS Region in which to create the new account', 'us-east-1')
  .option('-f, --source-profile [sourceProfile]', 'Profile for your root account credentials', 'default')
  .action((type, args) => 
    defaultStage({profile: args.sourceProfile, region: args.region})
      .then(defaultStage => Promise.resolve({
        ...args,
        stage: args.stage || defaultStage
      }))
      .then(args =>
        Promise.resolve("Migrating")
          .then(() => Promise.resolve([
            ((args||{}).stage || shell.exec(`
              git branch
            `).stdout.replace(/(\s|\*)+/g,"")),
            path.resolve(path.dirname('.')),
            path.basename(path.resolve(path.dirname('.')))
          ]))
          .then(([stage, path, projectName]) =>
            migrateRds(({stage, projectName, path}))
          )
      )
      .then(args => 
        console.log(args) ||
        console.log(chalk.green('All Finished!')) ||
        process.exit(0)
      )
      .catch(err => 
        console.log(err, err.stack) ||
        process.exit(1)
      )
  )

program
  .command('add-project <projectName>')
  .description("Adds an existing project for a user")
  .option('-s, --stage <stage>', 'Name of stage to create.', 'staging')
  .option('-a, --account-id [accountId]', 'The AWS account id for the base stage. If omitted, gunnerfy will try to find the account by its name.')
  .option('-r, --region [region]', 'AWS Region in which to create the new account', 'us-east-1')
  .option('-p, --profile [sourceProfile]', 'Profile for your root account credentials', 'default')
  .action((projectName, args) => 
    // defaultStage({profile: args.sourceProfile, region: args.region})
    //   .then(defaultStage => console.log("defaultStage", defaultStage) || Promise.resolve({
    //     ...args,
    //     stage: args.stage || defaultStage
    //   }))
    Promise.resolve(args)
      .then(args =>
        !!args.accountId ? (
          Promise.resolve(args)
        ) : (
          getAllAccounts({sourceProfile: args.sourceProfile})
            .then(accounts => Promise.resolve(
              accounts.find(account => account.Name === `${projectName}-${args.stage}`)
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
      )
      .then(args =>
        Promise.resolve("Adding project")
          .then(() => addProject({...args, projectName})) //check
          .then(() => setupGit({projectName: projectName, stage: args.stage}) ) // don't need
          .then(() => fs.readFile(`${projectHome(projectName)}/gunnerfy.json`, 'utf8'))
          .then(jsonString => Promise.resolve(JSON.parse(jsonString)))
          .then(json => addEnvironment({...args, projectName, ...json}) )
          .then(() => configureEnvironment({projectName: projectName, stage: args.stage}))
          .then(() => setupAmplify({projectName: projectName, stage: args.stage}))
          .then(code => Promise.resolve(shell.exec(`
            cd ${projectHome(projectName)} && 
            amplify env checkout ${args.stage} &&
            amplify env pull
          `).code))
          .then(code => Promise.resolve(shell.exec(`
            cd ${projectHome(projectName)}/react-native-client && 
            npm install
          `).code))
          .then(code => Promise.resolve(shell.exec(`
            cd ${projectHome(projectName)}/react-client && 
            npm install
          `).code))
          .then(code => Promise.resolve(shell.exec(`
            cd ${projectHome(projectName)}/services/base && 
            npm install
          `).code))
          // .then(() => setupRds({projectName: projectName, stage: args.stage}))
          .then(() => args)
      )
      .then(args => 
        console.log("") ||
        console.log("") ||
        console.log("") ||
        console.log(chalk.green(`${projectName} added with stage ${args.stage}. If there was an RDS cluster setup with this stage, please get the secrets.yml info from the stage owner`)) ||
        console.log("") ||
        console.log("") ||
        console.log("") ||
        console.log(chalk.green(`To congifure this project with your own environment, run:`)) ||
        console.log(chalk.green(`$ gunnerfy new ${projectName} -o ${JSON.parse(fs.readFileSync(`${projectHome(projectName)}/gunnerfy.json`, 'utf8')).organizationalUnitName}`)) ||
        console.log("") ||
        console.log("") ||
        console.log("") ||
        process.exit(0)
      )
      .catch(err => 
        console.log(err, err.stack) ||
        process.exit(1)
      )
  )

program
  .command('users <type>')
  .description("Adds a user to a group, so they can access that stage")
  .option('-u, --user-name <userName>', 'The AWS username to add to the group')
  .option('-s, --stage <stage>', 'The stage you are giving the user access to')
  .option('-p, --profile <profile>', 'The profile associated with the main AWS account.', 'default')
  .option('-n, --project-name [projectName]', 'The name of the project. If not provided, will use the name in gunnerfy.json.')
  .action((type, args) => 
    Promise.resolve("Adding user to group")
      .then(() => addUser({
        ...args,
        projectName: args.projectName || JSON.parse(fs.readFileSync(`${projectHome()}/gunnerfy.json`, 'utf8')).projectName
      }))
      .then(args => 
        console.log(args) ||
        console.log(chalk.green('All Finished!')) ||
        process.exit(0)
      )
      .catch(err => 
        console.log(err, err.stack) ||
        process.exit(1)
      )
  )

program
  .command('generate <type>')
  .description("Generates an RDS migration file to be run with the migrate command")
  .option('-n, --name <name>', 'The name of the migration')
  .option('-s, --sql <sql>', 'SQL Statement to run')
  .action((type, args) => 
    Promise.resolve(`Write ${args.sql} to ${projectHome()}/services/base/migrations/${new Date().getTime()}-${args.name}.sql`)
      .then(() => Promise.resolve(shell.mkdir('-p', `${projectHome()}/services/base/migrations`)))
      .then(() => fs.writeFile(`${projectHome()}/services/base/migrations/${new Date().getTime()}-${args.name}.sql`, args.sql, 'utf8'))
      .then(args => 
        console.log(args) ||
        console.log(chalk.green('All Finished!')) ||
        process.exit(0)
      )
      .catch(err => 
        console.log(err, err.stack) ||
        process.exit(1)
      )
  )

program
  .command('deploy <type>')
  .description("Deploys <type> where type is mobile, web or backend")
  .option('-s, --stage [stage]', 'Name of stage to deploy. Uses default stage if none is passed')
  .option('-r, --region [region]', 'AWS Region in which to create the new account', 'us-east-1')
  .option('-f, --source-profile [sourceProfile]', 'Profile for your root account credentials', 'default')
  .action((type, args) =>
    defaultStage({profile: args.sourceProfile, region: args.region})
      .then(defaultStage => Promise.resolve({
        ...args,
        stage: args.stage || defaultStage
      }))
      .then(args =>
        Promise.resolve(`Deploying`)
          // .then(() => Promise.resolve(
          //   shell.exec(`
          //     git add .; git commit -am "deploying"; git checkout ${args.stage}
          //   `)   
          // ))
          .then(() => Promise.resolve(
            shell.exec(`
              amplify env checkout ${args.stage}
            `)   
          ))
          .then(() =>
            type === 'backend' ? (
              deployBackend(args)
            ) : type === 'web' ? (
              deployWeb(args)
            ) : type === 'mobile' ? (
              deployMobile(args)
            ) : (
              Promise.reject({stack: `Invalid deploy type: ${type}`})
            )
          )
      )
      .then(args => 
        console.log(args) ||
        console.log(chalk.green('All Finished!')) ||
        process.exit(0)
      )
      .catch(err => 
        console.log(err, err.stack) ||
        process.exit(1)
      )
  )

program
  .command('git-approve') 
  .option('-i, --request-id <requestId>', 'The pull request id')
  .option('-s, --stage [stage]', 'Name of stage you are submitting for approval. If omitted, will user default stage')
  .option('-r, --region [region]', 'AWS Region in which to create the new account', 'us-east-1')
  .option('-f, --source-profile [sourceProfile]', 'Profile for your root account credentials', 'default')
  .action(args =>
    defaultStage({profile: args.sourceProfile, region: args.region})
      .then(defaultStage => Promise.resolve({
        ...args,
        stage: args.stage || defaultStage
      }))
      .then(({stage, requestId}) => gitApprove({stage, requestId}))
      .then(args => 
        console.log(args) ||
        console.log(chalk.green('All Finished!')) ||
        process.exit(0)
      )
      .catch(err => 
        console.log(err, err.stack) ||
        process.exit(1)
      )
  )

program
  .command('git-tag') 
  .option('-i, --iteration-end-date <iterationEndDate>', 'The date the iteration ends in YYYYMMDD format')
  .option('-s, --stage [stage]', 'Name of stage you are submitting for approval. If omitted, will user default stage')
  .option('-r, --region [region]', 'AWS Region in which to create the new account', 'us-east-1')
  .option('-f, --source-profile [sourceProfile]', 'Profile for your root account credentials', 'default')
  .action(args =>
    defaultStage({profile: args.sourceProfile, region: args.region})
      .then(defaultStage => Promise.resolve({
        ...args,
        stage: args.stage || defaultStage
      }))
      .then(({stage, iterationEndDate}) => gitTag({stage, iterationEndDate}))
      .then(args => 
        console.log(args) ||
        console.log(chalk.green('All Finished!')) ||
        process.exit(0)
      )
      .catch(err => 
        console.log(err, err.stack) ||
        process.exit(1)
      )
  )

program
  .command('git-submit') 
  .option('-t, --target-stage <targetStage>', 'Name of stage where code will be merged into, i.e. staging')
  .option('-i, --iteration-end-date <iterationEndDate>', 'The date the iteration ends in YYYYMMDD format')
  .option('-s, --stage [stage]', 'Name of stage you are submitting for approval. If omitted, will user default stage')
  .option('-r, --region [region]', 'AWS Region in which to create the new account', 'us-east-1')
  .option('-f, --source-profile [sourceProfile]', 'Profile for your root account credentials', 'default')
  .action(args =>
    defaultStage({profile: args.sourceProfile, region: args.region})
      .then(defaultStage => Promise.resolve({
        ...args,
        stage: args.stage || defaultStage
      }))
      .then(({stage, targetStage, iterationEndDate}) => gitSubmit({stage, targetStage, iterationEndDate}))
      .then(args => 
        console.log(args) ||
        console.log(chalk.green('All Finished!')) ||
        process.exit(0)
      )
      .catch(err => 
        console.log(err, err.stack) ||
        process.exit(1)
      )
  )

program
  .command('develop') /// Deprecated
  .description("Runs watch to allow development locally")
  .action(() => {
    const child = spawn(
      `watch`, [
        `rm -rf ${projectHome()}/react-client/src/aws-exports.js && 
        cp ${projectHome()}/amplify/src/aws-exports.js ${projectHome()}/react-client/src/aws-exports.js && 
        rm -rf ${projectHome()}/react-client/src/graphql && 
        rm -rf ${projectHome()}/react-client/src/api && 
        cp -R  ${projectHome()}/amplify/src/graphql ${projectHome()}/react-client/src && 
        cp -R ${projectHome()}/amplify/src/api ${projectHome()}/react-client/src
        rm -rf ${projectHome()}/react-native-client/aws-exports.js && 
        cp ${projectHome()}/amplify/src/aws-exports.js ${projectHome()}/react-native-client/aws-exports.js &&  
        rm -rf ${projectHome()}/react-native-client/src/graphql && 
        rm -rf ${projectHome()}/react-native-client/src/api && 
        cp -R ${projectHome()}/amplify/src/graphql ${projectHome()}/react-native-client/src &&
        cp -R ${projectHome()}/amplify/src/api ${projectHome()}/react-native-client/src
        rm -rf ${projectHome()}/services/base/aws-exports.js && 
        cp ${projectHome()}/amplify/src/aws-exports.js ${projectHome()}/services/base/aws-exports.js &&  
        rm -rf ${projectHome()}/services/base/src/graphql && 
        rm -rf ${projectHome()}/services/base/src/api && 
        cp -R ${projectHome()}/amplify/src/graphql ${projectHome()}/services/base/src &&
        cp -R ${projectHome()}/amplify/src/api ${projectHome()}/services/base/src
        `,
        `${projectHome()}/amplify`
      ]
    )
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', console.log);
    child.stderr.on('data', console.log);

    child.on('close', code => process.exit(0))
    child.on('error', code => process.exit(1))
  })
    

program 
  .command('rds-setup [projectName]')
  .option('-s, --stage [stage]', 'Name of stage to create. If omitted, will user default stage')
  .option('-r, --region [region]', 'AWS Region in which to create the new account', 'us-east-1')
  .option('-f, --source-profile [sourceProfile]', 'Profile for your root account credentials', 'default')
  .action((projectName, args) => 
    defaultStage({profile: args.sourceProfile, region: args.region})
      .then(defaultStage => Promise.resolve({
        ...args,
        stage: args.stage || defaultStage
      }))
      .then(args =>
        setupRds({projectName: getProjectName(projectName), stage: args.stage, force: true})
      )
      .then(args => 
        console.log(args) ||
        console.log(chalk.green('All Finished!')) ||
        process.exit(0)
      )
      .catch(err => 
        console.log(err, err.stack) ||
        process.exit(1)
      )
  )
    

// gunnerfy new toybox -i gunnertech.com -o JaredKelly
// -a 323318334161
// -s cody 
program
  .command('new <projectName>')
  .description("Creates a new gunnerfied serverless project")
  .option('-o, --organizational-unit-name <organizationalUnitName>', 'Name of organizational unit to find or create')
  .option('-e, --email [email]', 'unique email address to associate with the new account - required for new accounts')
  .option('-s, --stage [stage]', 'Name of stage to create. If omitted, will user default stage')
  .option('-n, --account-name [accountName]', 'Name of account to find or create. If not passed, one will be geneated')
  .option('-r, --region [region]', 'AWS Region in which to create the new account', 'us-east-1')
  .option('-p, --profile [sourceProfile]', 'Profile for your root account credentials', 'default')
  .option('-g, --group-name [groupName]', 'The name of the IAM group to find or create. If not passed, one will be generated automatically')
  .option('-a, --account-Id [accountId]', 'If passed will add the specified account to the organization and not create a new one.')
  .action((projectName, args) =>
    defaultStage({profile: args.sourceProfile, region: args.region})
      .then(defaultStage => Promise.resolve({
        ...args,
        stage: args.stage || defaultStage
      }))
      .then(args =>
        Promise.resolve(`Building Project ${projectName}`)
        .then(() => getTemplate({projectName: projectName}))
        .then(() => setupGit({projectName: projectName, stage: args.stage}) )
        .then(() =>
          !!args.accountId ? (
            Promise.resolve(args)
          ) : (
            getAllAccounts({sourceProfile: args.sourceProfile})
              .then(accounts => Promise.resolve(
                accounts.filter(account => account.Status !== 'SUSPENDED').find(account => account.Name === `${projectName}-${args.stage}`)
              ))
              .then(account => Promise.resolve(!account ? args : {
                ...args,
                accountId: account.Id,
                account: {
                  ...args.account,
                  accountId: account.Id
                }
              }))
          )
        )
        .then(args =>
          createEnvironment({...args, projectName}) 
            // .then(() => configureEnvironment({projectName: projectName, stage: args.stage}))
            // .then(() => setupAmplify({projectName: projectName, stage: args.stage}))
            // .then(() => setupServerless({projectName: projectName, stage: args.stage}))
            // .then(code => Promise.resolve(shell.exec(`
            //   cd ${projectHome(projectName)}/react-client && 
            //   npm install
            // `).code))
            // .then(code => Promise.resolve(shell.exec(`
            //   cd ${projectHome(projectName)}/react-native-client && 
            //   npm install
            // `).code))
            // .then(() => setupRds({projectName: projectName, stage: args.stage}))
            // .then(() => fs.readFile(`${projectHome(projectName)}/gunnerfy.json`, 'utf8'))
            // .then(jsonString => Promise.resolve(JSON.parse(jsonString)))
            // .then(json => 
            //   fs.writeFile(
            //     `${projectHome(projectName)}/gunnerfy.json`, 
            //     JSON.stringify({
            //       ...json,
            //       projectName,
            //       region: args.region,
            //       email: args.email,
            //       organizationalUnitName: args.organizationalUnitName
            //     }),
            //     'utf8'
            //   )
            // )
            // .then(() => Promise.resolve(shell.exec(`
            //   cd ${projectHome(projectName)} && 
            //   git add . && 
            //   git commit -am "Initial commit" && 
            //   git push ${args.stage} ${args.stage}
            // `)))
        )
      )
      .then(args => 
        console.log(args) ||
        console.log(chalk.green('All Finished!')) ||
        process.exit(0)
      )
      .catch(err => 
        console.log(chalk.red(err), chalk.red(err.stack)) ||
        process.exit(1)
      )
  )
  
  


program
  .command('set-var')
  .description("Adds an existing project for a user")
  .option('-n, --name <name>', 'The name of the variable')
  .option('-v, --value <value>', 'The value')
  .action(args =>
    setvar({name: args.name, value: args.value})
      .then(args => 
        console.log(args) ||
        console.log(chalk.green('All Finished!')) ||
        process.exit(0)
      )
      .catch(err => 
        console.log(err, err.stack) ||
        process.exit(1)
      )
  )

program.parse(process.argv);

// assertRequiredArgs(program)

// const throwError = message => 
//   console.log(chalk.red(message)) ||
//   process.exit(1)

// const camelCased = myString => myString.replace(/-([a-z])/g, g => g[1].toUpperCase());


// const assertRequiredArgs = cli =>
//   !!cli.options.filter(option => 
//     option.required && !cli.hasOwnProperty(camelCased(option.long.slice(2)))
//   ).length &&
//   throwError(`The following required parameters were omitted: ${cli.options.filter(option => 
//     option.required && !cli.hasOwnProperty(camelCased(option.long.slice(2)))
//   ).map(option => option.long).join(', ')}`)
  

// console.log(path.resolve(path.dirname('.')));
// console.log(path.resolve("./"));
// console.log(chalk.blue(process.env['HOME']));
// console.log(process.env._);
// console.log(process);