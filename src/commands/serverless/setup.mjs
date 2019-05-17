
import shell from 'shelljs'
import AWS from 'aws-sdk'

import setvar from '../setvar';


const setup = ({stage, projectName, path, npmPath}) =>
  Promise.resolve('Setting up Serverless')
		.then(() => Promise.resolve(shell.exec(`
			cd ${path} && git checkout ${stage};
		`).code))
		.then(code => Promise.resolve(shell.exec(`
      cd ${path}/serverless && npm install
    `).code))
    .then(code => Promise.resolve(shell.exec(`
      cd ${path}/serverless && ${npmPath}/serverless deploy -s ${stage}
    `).code))
    .then(() => 
      new AWS.CloudFront({
        credentials: new AWS.SharedIniFileCredentials({
          profile: `${projectName.toLowerCase()}-${stage}developer`,
          filename: `${process.env['HOME']}/.aws/credentials`
        }),
        region: 'us-east-1'
      })
        .listDistributions()
        .promise()
        .then(({DistributionList: {Items}}) => Promise.resolve(Items[0].DomainName))
        .then(domainName => setvar({path, name: `${stage}-cloudfront-domain`, value: domainName}))
    )
		.then(code => Promise.resolve(shell.exec(`
      cd ${path} && git add . && git commit -am "sets variables"
		`).code))


export default setup

// --help