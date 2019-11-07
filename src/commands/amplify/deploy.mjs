
import shell from 'shelljs'
import { projectHome, workspaceHome } from '../util'
import fs from 'fs-extra';


const deploy = ({projectName}) =>
  Promise.resolve(`
CODEGEN="{\\
\\"generateCode\\":true,\\
\\"codeLanguage\\":\\"javascript\\",\\
\\"fileNamePattern\\":\\"src/graphql/**/*.js\\",\\
\\"generatedFileName\\":\\"api\\",\\
\\"generateDocs\\":true\\
}"

cd ${projectHome(projectName)} && amplify push \\
--codegen $CODEGEN \\
--yes

  `)
    .then(cmd => Promise.resolve(shell.exec(cmd).code))
    .then(code => code === 0 ? Promise.resolve(code) : Promise.reject("amplify deploy failed"))
    .then(() => shell.exec(`cd ${projectHome(projectName)} && amplify codegen statements`).code)
    .then(() => Promise.resolve(!fs.existsSync(`${projectHome(projectName)}/src/graphql`) ? "" : shell.exec(`
      rm -rf ${projectHome(projectName)}/amplify/src/graphql &&
      rm -rf ${projectHome(projectName)}/serverless/aws-exports.js &&
      cp ${projectHome(projectName)}/amplify/src/aws-exports.js ${projectHome(projectName)}/serverless/aws-exports.js &&  
      mv ${projectHome(projectName)}/src/graphql ${projectHome(projectName)}/amplify/src &&
      rm -rf ${projectHome(projectName)}/src
    `).code))
    


export default deploy