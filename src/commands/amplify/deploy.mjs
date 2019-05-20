
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


export default deploy