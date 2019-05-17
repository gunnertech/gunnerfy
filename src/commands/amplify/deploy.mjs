
import shell from 'shelljs'


const deploy = ({npmPath, path}) =>
  Promise.resolve(`
CODEGEN="{\\
\\"generateCode\\":true,\\
\\"codeLanguage\\":\\"javascript\\",\\
\\"fileNamePattern\\":\\"src/graphql/**/*.js\\",\\
\\"generatedFileName\\":\\"api\\",\\
\\"generateDocs\\":true\\
}"

cd ${path}/serverless && ${npmPath}/amplify push \\
--codegen $CODEGEN \\
--yes    
  `)
    .then(cmd => Promise.resolve(shell.exec(cmd).code))
    .then(code => code === 0 ? Promise.resolve(code) : Promise.reject("amplify deploy failed"))


export default deploy