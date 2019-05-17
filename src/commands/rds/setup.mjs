import shell from 'shelljs'
import yaml from 'js-yaml'
import fs from 'fs-extra';
import readline from 'readline'
import AWS from 'aws-sdk'


const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const rds = ({projectName, stage}) =>
  new AWS.RDS({
    credentials: new AWS.SharedIniFileCredentials({
      profile: `${projectName.toLowerCase()}-${stage}developer`,
      filename: `${process.env['HOME']}/.aws/credentials`
    }),
    region: 'us-east-1'
  })

const sts = ({projectName, stage}) =>
  new AWS.STS({
    credentials: new AWS.SharedIniFileCredentials({
      profile: `${projectName.toLowerCase()}-${stage}developer`,
      filename: `${process.env['HOME']}/.aws/credentials`
    }),
    region: 'us-east-1'
  })


const init = ({stage, projectName, path}) =>
  Promise.resolve('Setting up RDS')
    .then(obj => new Promise((resolve, reject) => 
      rl.question('Would you like to setup an RDS Cluster (y/N): ', answer => resolve(answer))
    ))
    .then(answer =>
      answer === 'y' ? (
        Promise.resolve(yaml.safeLoad(fs.readFileSync(`${path}/serverless/secrets.yml`, 'utf8')))
          .then(obj => new Promise((resolve, reject) => 
            rl.question('DB username: ', answer => resolve([obj, answer]))
          ))
          .then(([obj, username]) => new Promise((resolve, reject) => 
            rl.question('DB password: ', answer => resolve([obj, username, answer]))
          ))
          .then(([obj, username, password]) => console.log(([obj, username, password])) || Promise.resolve({
            ...obj,
            [stage]: {
              DB_CLUSTER_MASTER_USERNAME: username,
              DB_CLUSTER_MASTER_PASSWORD: password
            }
          }))
          .then(obj => 
            fs.writeFile(`${path}/serverless/secrets.yml`, yaml.safeDump(obj), 'utf8')
          )
          .then(code => Promise.resolve(shell.exec(`
            cd ${path}/serverless && ${npmPath}/serverless deploy -s ${stage}
          `).code))
          .then(() => rds({projectName, stage}).describeDBClusters({DBClusterIdentifier: `${projectName.toLowerCase()}-${stage}-cluster`}).promise())
          .then(({DBClusters: clusters}) => Promise.resolve(
            clusters.find(cluster => cluster.DBClusterIdentifier === `${projectName.toLowerCase()}-${stage}-cluster`)
          ))
          .then(cluster =>
            rds({projectName, stage})
              .modifyDBCluster({
                DBClusterIdentifier: cluster.DBClusterIdentifier,
                ApplyImmediately: true,
                EnableHttpEndpoint: true
              })
              .promise()
              .then(() => Promise.resolve(cluster))
          )
          .then(cluster => 
            rds({projectName, stage})
              .describeDBInstances({Filters: [{Name: 'db-cluster-id', Values: [cluster.DBClusterIdentifier]}]})
              .promise()
              .then(({DBInstances}) => Promise.resolve([cluster, DBInstances]))
          )
          .then(([cluster, DBInstances]) =>
            !!DBInstances.length ? (
              Promise.resolve("")
            ) : (
              sts({projectName, stage})
                .getCallerIdentity()
                .promise()
                .then(({Account}) => Promise.resolve(shell.exec(`
                  aws rds-data execute-sql --db-cluster-or-instance-arn "arn:aws:rds:us-east-1:${Account}:cluster:${cluster.DBClusterIdentifier}" \\
                    --schema "mysql"  --aws-secret-store-arn "HttpRDSSecret"  \\
                    --region us-east-1 --sql-statements "create DATABASE ${projectName.toLowerCase()}_${stage}_db" \\
                    --profile ${projectName.toLowerCase()}-${stage}developer
                `).code))
            )
          )
      ) : (
        Promise.resolve("")
      )
    )
    .then(() => Promise.resolve(rl.close()))


export default init