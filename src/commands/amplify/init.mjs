
import shell from 'shelljs'
import { projectHome, workspaceHome } from '../util'

const init = ({stage, projectName}) =>
  Promise.resolve(`
REACTCONFIG="{\\
\\"SourceDir\\":\\"src\\",\\
\\"DistributionDir\\":\\"build\\",\\
\\"BuildCommand\\":\\"npm-run-script-build\\",\\
\\"StartCommand\\":\\"npm-run-script-start\\"\\
}"
AWSCLOUDFORMATIONCONFIG="{\\
\\"configLevel\\":\\"project\\",\\
\\"useProfile\\":true,\\
\\"profileName\\":\\"${projectName.toLowerCase()}-${stage}developer\\",\\
\\"region\\":\\"us-east-1\\"\\
}"
AMPLIFY="{\\
\\"projectName\\":\\"${projectName}\\",\\
\\"envName\\":\\"${stage}\\",\\
\\"defaultEditor\\":\\"code\\"\\
}"
FRONTEND="{\\
\\"frontend\\":\\"javascript\\",\\
\\"framework\\":\\"none\\",\\
\\"config\\":$REACTCONFIG\\
}"
PROVIDERS="{\\
\\"awscloudformation\\":$AWSCLOUDFORMATIONCONFIG\\
}"

cd ${projectHome(projectName)} && git checkout ${stage} && ${process.env.NVM_BIN}/amplify init \\
--amplify $AMPLIFY \\
--frontend $FRONTEND \\
--providers $PROVIDERS \\
--yes    
`)
  .then(cmd => Promise.resolve(shell.exec(cmd).code))
  .then(code => code === 0 ? Promise.resolve(code) : Promise.reject("amplify init failed"))


export default init