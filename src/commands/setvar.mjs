
import replace from 'replace-in-file'

import glob from 'glob';

import { projectHome } from './util'


const setvar = ({projectName, name, value}) =>
  replace({
    from: `<${name}>`,
    to: value,
    files: glob.sync("**/*", {dot: true, nodir: true, cwd: projectHome(projectName)}).filter(file => !file.includes('node_modules') && !file.includes('.git/')).map(file => `${projectHome(projectName)}/${file}`)
  })

export default setvar