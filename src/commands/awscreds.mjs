import AWS from 'aws-sdk'
import fs from 'fs-extra';


// new AWS.SharedIniFileCredentials({
//   profile: `${projectName.toLowerCase()}-${stage}developer`,
//   filename: `${process.env['HOME']}/.aws/credentials`
// })

const awscreds = ({projectName, stage}) =>
  fs.readFile(`${process.env['HOME']}/.aws/credentials`, 'utf8')
    .then(contents => Promise.resolve( 
        contents
          .split(/( |\n|\r)/)
          .find(line => line.includes(`role/${projectName}-${stage}`))
          .replace(/role_arn *= */, "")
    ))
    .then(roleArn => console.log(`THE ROLE ARN IS:"${roleArn.trim()}"`, ) || Promise.resolve(
      new AWS.STS()
        .assumeRole({
          RoleArn: roleArn.trim(),
          RoleSessionName: `gunnerfy-${(new Date()).getTime()}`
        })
        .promise()
        .then(({Credentials}) => Promise.resolve(
          new AWS.Credentials({
            accessKeyId: Credentials.AccessKeyId,
            secretAccessKey: Credentials.SecretAccessKey,
            sessionToken: Credentials.SessionToken,
          })
        ))
    ))

export default awscreds