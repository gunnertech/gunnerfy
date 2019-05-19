import shell from 'shelljs'

import setvar from '../setvar'
import { projectHome, workspaceHome } from '../util'

const get = ({projectName}) =>
  Promise.resolve("Getting template")
    .then(() => shell.exec(`
      cd ${workspaceHome(projectHome)} &&
      git clone --depth=1 --single-branch -b amplify-template git@github.com:gunnertech/aws-severless-react-template.git ${projectName}
    `).code)
    .then(() => setvar({path: `${projectHome(projectName)}`, name: `project-name-lower`, value: projectName.toLowerCase()}))
    .then(() => setvar({path: `${projectHome(projectName)}`, name: `project-name`, value: projectName}))

export default get