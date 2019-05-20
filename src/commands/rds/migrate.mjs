import shell from 'shelljs'
import fs from 'fs-extra';
import AWS from 'aws-sdk'

import awscreds from '../awscreds'
import { projectHome } from '../util'

const sts = ({projectName, stage}) =>
  awscreds({projectName, stage})
    .then(credentials => Promise.resolve(
      new AWS.STS({
        credentials,
        region: 'us-east-1'
      })
    ))


const migrate = ({stage, projectName}) =>
  Promise.resolve('Migrating RDS')
    .then(() =>
      sts({projectName, stage})
        .then(sts => sts.getCallerIdentity().promise())
        .then(({Account}) =>
          fs.readdir(`${projectHome(projectName)}/serverless/migrations`)
            .then(files => Promise.resolve([Account, files.sort()]))
        )
        .then(([Account, files]) => Promise.resolve(
          files.map(file =>
            console.log(`Migrating ${file}....`) ||
            shell.exec(`
              aws rds-data execute-sql --db-cluster-or-instance-arn "arn:aws:rds:us-east-1:${Account}:cluster:${projectName.toLowerCase()}-${stage}-cluster" \\
              --schema "mysql"  --aws-secret-store-arn "HttpRDSSecret"  \\
              --region us-east-1 --sql-statements "${fs.readFileSync(`${projectHome(projectName)}/serverless/migrations/${file}`, 'utf8')}" \\
              --database ${projectName.toLowerCase().replace(/-/g,"_")}_${stage}_db \\
              --profile ${projectName.toLowerCase()}-${stage}developer
            `).code  
          )
        ))
    )


export default migrate