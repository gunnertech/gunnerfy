
import shell from 'shelljs'
import AWS from 'aws-sdk'

import setvar from '../setvar';
import awscreds from '../awscreds'

import { projectHome } from '../util'

const setup = ({stage, projectName}) =>
  Promise.resolve('Setting up Serverless')
		.then(() => Promise.resolve(shell.exec(`
      cd ${projectHome(projectName)} && 
      git checkout ${stage};
		`).code))
		.then(code => Promise.resolve(shell.exec(`
      cd ${projectHome(projectName)}/services/base && 
      npm install
    `).code))
    .then(code => Promise.resolve(shell.exec(`
      cd ${projectHome(projectName)}/services/base && 
      serverless deploy -s ${stage}
    `).code))
    .then(() => 
      awscreds({stage, projectName})
        .then(credentials =>
          new AWS.CloudFront({
            credentials,
            region: 'us-east-1'
          })
          .listDistributions()
          .promise()
        )
        .then(({DistributionList: {Items}}) => Promise.resolve(Items[0].DomainName))
        .then(domainName => setvar({projectName, name: `${stage}-cloudfront-domain`, value: domainName}))
    )
		.then(code => Promise.resolve(shell.exec(`
      cd ${projectHome(projectName)} && 
      git add . && 
      git commit -am "sets variables"
		`).code))


export default setup