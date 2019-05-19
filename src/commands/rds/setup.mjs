import shell from 'shelljs'
import yaml from 'js-yaml'
import fs from 'fs-extra';
import readline from 'readline'
import AWS from 'aws-sdk'

import awscreds from '../awscreds'

import { projectHome } from '../util'


const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const rds = ({projectName, stage}) =>
  awscreds({projectName, stage})
    .then(credentials => Promise.resolve(
      new AWS.RDS({
        credentials,
        region: 'us-east-1'
      })
    ))

const sts = ({projectName, stage}) =>
  awscreds({projectName, stage})
    .then(credentials => Promise.resolve(
      new AWS.STS({
        credentials,
        region: 'us-east-1'
      })
    ))


const setup = ({stage, projectName}) =>
  Promise.resolve('Setting up RDS')
    .then(obj => new Promise((resolve, reject) => 
      rl.question('Would you like to setup an RDS Cluster (y/N): ', answer => resolve(answer))
    ))
    .then(answer =>
      answer === 'y' ? (
        Promise.resolve(yaml.safeLoad(fs.readFileSync(`${projectHome(projectName)}/serverless/secrets.yml`, 'utf8')))
          .then(obj => new Promise((resolve, reject) => 
            rl.question('DB username (alpha-numeric maximum 16 characters): ', answer => resolve([obj, answer]))
          ))
          .then(([obj, username]) => new Promise((resolve, reject) => 
            rl.question('DB password: ', answer => resolve([obj, username, answer]))
          ))
          .then(([obj, username, password]) => console.log(`Username: ${username.replace(/[^a-z0-9]/i,"").substring(0, 16)}`) || Promise.resolve({
            ...obj,
            [stage]: {
              DB_CLUSTER_MASTER_USERNAME: username.replace(/[^a-z0-9]/i,"").substring(0, 16).trim(),
              DB_CLUSTER_MASTER_PASSWORD: password.trim()
            }
          }))
          .then(obj => 
            fs.writeFile(`${projectHome(projectName)}/serverless/secrets.yml`, yaml.safeDump(obj), 'utf8')
          )
          .then(code => Promise.resolve(shell.exec(`
            cd ${projectHome(projectName)}/serverless && ${process.env.NVM_BIN}/serverless deploy -s ${stage}
          `).code))
          .then(() => 
            rds({projectName, stage})
              .then(rds => 
                rds.describeDBClusters({DBClusterIdentifier: `${projectName.toLowerCase()}-${stage}-cluster`}).promise()
              )
          )
          .then(({DBClusters: clusters}) => Promise.resolve(
            clusters.find(cluster => cluster.DBClusterIdentifier === `${projectName.toLowerCase()}-${stage}-cluster`)
          ))
          .then(cluster =>
            rds({projectName, stage})
              .then(rds => 
                rds.modifyDBCluster({
                  DBClusterIdentifier: cluster.DBClusterIdentifier,
                  ApplyImmediately: true,
                  EnableHttpEndpoint: true
                })
                .promise()
              )
              .then(() => Promise.resolve(cluster))
          )
          .then(cluster => 
            rds({projectName, stage})
              .then(rds => rds.describeDBInstances({Filters: [{Name: 'db-cluster-id', Values: [cluster.DBClusterIdentifier]}]}).promise())
              .then(({DBInstances}) => Promise.resolve([cluster, DBInstances]))
          )
          .then(([cluster, DBInstances]) =>
            !!DBInstances.length ? (
              Promise.resolve("")
            ) : (
              sts({projectName, stage})
                .then(sts => sts.getCallerIdentity().promise())
                .then(({Account}) => Promise.resolve(shell.exec(`
                  aws rds-data execute-sql --db-cluster-or-instance-arn "arn:aws:rds:us-east-1:${Account}:cluster:${cluster.DBClusterIdentifier}" \\
                    --schema "mysql"  --aws-secret-store-arn "HttpRDSSecret"  \\
                    --region us-east-1 --sql-statements "create DATABASE ${projectName.toLowerCase()}_${stage}_db" \\
                    --profile ${projectName.toLowerCase().replace(/-/g,"_")}-${stage}developer
                `).code))
            )
          )
      ) : (
        Promise.resolve("")
      )
    )
    .then(() => Promise.resolve(rl.close()))


export default setup