import { execSync } from 'child_process';
import fs from 'fs-extra';

import init from './init';
import deploy from './deploy';
import { projectHome } from '../util'


const setup = ({stage, projectName}) =>
  init({stage, projectName})
    .then(() => fs.existsSync(`${projectHome(projectName)}/amplify/backend/api`))
    .then(hasAmplify => Promise.resolve(
      hasAmplify ? (
        ''
      ) : (
        execSync(` 
          (cd ${projectHome(projectName)} && amplify add api || true) && \\
          (cd ${projectHome(projectName)} && amplify add auth || true) && \\
          (cd ${projectHome(projectName)} && amplify add analytics || true) && \\
          (cd ${projectHome(projectName)} && amplify add storage || true)
        `, {stdio: ['inherit','inherit','inherit']})
      )
    ))
    .then(() => deploy({projectName}))



export default setup