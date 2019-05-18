import shell from 'shelljs'

import setvar from '../setvar'

const get = ({path, projectName}) =>
  Promise.resolve("Getting template")
    .then(() => shell.exec(`
      cd ${path} &&
      git clone --depth=1 --single-branch -b amplify-template git@github.com:gunnertech/aws-severless-react-template.git ${projectName}
    `).code)
    .then(() => setvar({path: `${path}/${projectName}`, name: `project-name-lower`, value: projectName.toLowerCase()}))
    .then(() => setvar({path: `${path}/${projectName}`, name: `project-name`, value: projectName}))

export default get