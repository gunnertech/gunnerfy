#!/usr/bin/env node --experimental-modules --no-warnings --es-module-specifier-resolution=node
'use strict';

import * as path from 'path';
import chalk from 'chalk';
import program from 'commander'
import addEnvironment from '../src/commands/environment/add';
import getTemplate from '../src/commands/template/get';
import configureEnvironment from '../src/commands/environment/configure';
import setupAmplify from '../src/commands/amplify/setup'
import setupGit from '../src/commands/git/setup'
import setupServerless from '../src/commands/serverless/setup'
import setupAmplifyHosting from '../src/commands/amplify/hosting/setup'

const currentDir = path.resolve(path.dirname(''))

const throwError = message => 
  console.log(chalk.red(message)) ||
  process.exit(1)

const camelCased = myString => myString.replace(/-([a-z])/g, g => g[1].toUpperCase());


const assertRequiredArgs = cli =>
  !!cli.options.filter(option => 
    option.required && !cli.hasOwnProperty(camelCased(option.long.slice(2)))
  ).length &&
  throwError(`The following required parameters were ommitted: ${cli.options.filter(option => 
    option.required && !cli.hasOwnProperty(camelCased(option.long.slice(2)))
  ).map(option => option.long).join(', ')}`)
  


// gunnerfy -s cody -i gunnertech.com -o "Sample Client" -a 323318334161 -p CodySample5

// console.log(path.resolve(path.dirname('.')));
// console.log(path.resolve("./"));
// console.log(chalk.blue(process.env['HOME']));
// console.log(process.env._);
// console.log(process);

program
  .option('-s, --stage <stage>', 'Name of stage to create')
  .option('-i, --identifier <identifier>', 'Domain/package identifer of the account owner')
  .option('-o, --organizational-unit-name <organizationalUnitName>', 'Name of organizational unit to find or create')
  .option('-p, --project-name <projectName>', 'Name of the project')
  .option('-n, --account-name [accountName]', 'Name of account to find or create. If not passed, one will be geneated')
  .option('-r, --region [region]', 'AWS Region in which to create the new account', 'us-east-1')
  .option('-f, --source-profile [sourceProfile]', 'Profile for your root account credentials', 'default')
  .option('-e, --email [email]', 'Email address to use for the new account created. If not passed, one will be generated automatically')
  .option('-g, --group-name [groupName]', 'The name of the IAM group to find or create. If not passed, one will be generated automatically')
  .option('-a, --account-Id [accountId]', 'If passed will add the specified account to the organization and not create a new one.')
  .parse(process.argv);

assertRequiredArgs(program)

Promise.resolve("Building Project")
  // .then(() => getTemplate({projectName: program.projectName, path: currentDir}))
  // .then(() => setupGit({projectName: program.projectName, stage: program.stage, path: `${currentDir}/${program.projectName}`}) )
  // .then(() => addEnvironment(program) )
  .then(() => configureEnvironment({projectName: program.projectName, stage: program.stage,  path: `${currentDir}/${program.projectName}`}))
  // .then(() => setupAmplify({projectName: program.projectName, stage: program.stage, npmPath: process.env.NVM_BIN, path: `${currentDir}/${program.projectName}`}))
  // .then(() => setupServerless({projectName: program.projectName, stage: program.stage, npmPath: process.env.NVM_BIN, path: `${currentDir}/${program.projectName}`}))
  // .then(() => setupAmplifyHosting({projectName: program.projectName, stage: program.stage, path: `${currentDir}/${program.projectName}`}))
  .then(args => 
    console.log(args) ||
    console.log(chalk.green('All Finished!')) ||
    process.exit(0)
  )
  .catch(err => 
    console.log(err, err.stack) ||
    process.exit(1)
  )