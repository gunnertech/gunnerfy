import shell from 'shelljs'
import fs from 'fs-extra';
import AWS from 'aws-sdk'




const sts = ({projectName, stage}) =>
  new AWS.STS({
    credentials: new AWS.SharedIniFileCredentials({
      profile: `${projectName.toLowerCase()}-${stage}developer`,
      filename: `${process.env['HOME']}/.aws/credentials`
    }),
    region: 'us-east-1'
  })


const migrate = ({stage, projectName, path}) =>
  Promise.resolve('Migrating RDS')
    .then(() =>
      sts({projectName, stage})
        .getCallerIdentity()
        .promise()
        .then(({Account}) =>
          fs.readdir(`${path}/serverless/migrations`)
            .then(files => Promise.resolve([Account, files.sort()]))
        )
        .then(([Account, files]) => Promise.resolve(
          files.map(file =>
            console.log(`Migrating ${file}....`) ||
            shell.exec(`
              aws rds-data execute-sql --db-cluster-or-instance-arn "arn:aws:rds:us-east-1:${Account}:cluster:${projectName.toLowerCase()}-${stage}-cluster" \\
              --schema "mysql"  --aws-secret-store-arn "HttpRDSSecret"  \\
              --region us-east-1 --sql-statements "${fs.readFileSync(`${path}/serverless/migrations/${file}`, 'utf8')}" \\
              --database ${projectName.toLowerCase()}_${stage}_db \\
              --profile ${projectName.toLowerCase()}-${stage}developer
            `).code  
          )
        ))
    )


export default migrate