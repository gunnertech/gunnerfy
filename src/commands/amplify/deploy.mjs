
import shell from 'shelljs'
import { projectHome, workspaceHome } from '../util'


const deploy = ({projectName}) =>
  Promise.resolve(`
CODEGEN="{\\
\\"generateCode\\":true,\\
\\"codeLanguage\\":\\"javascript\\",\\
\\"fileNamePattern\\":\\"src/graphql/**/*.js\\",\\
\\"generatedFileName\\":\\"api\\",\\
\\"generateDocs\\":true\\
}"

cd ${projectHome(projectName)} && ${process.env.NVM_BIN}/amplify push \\
--codegen $CODEGEN \\
--yes

  `)
    .then(cmd => Promise.resolve(shell.exec(cmd).code))
    .then(code => code === 0 ? Promise.resolve(code) : Promise.reject("amplify deploy failed"))
    .then(cmd => Promise.resolve(shell.exec(`
      rm -rf ${projectHome(projectName)}/amplify/src/graphql &&
      mv ${projectHome(projectName)}/src/graphql ${projectHome(projectName)}/amplify/src &&
      rm -rf ${projectHome(projectName)}/src
    `).code))


export default deploy