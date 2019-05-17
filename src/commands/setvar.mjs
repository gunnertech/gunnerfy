
import replace from 'replace-in-file'

import glob from 'glob';


const setvar = ({path, name, value}) =>
  replace({
    from: `<${name}>`,
    to: value,
    files: glob.sync("**/*", {dot: true, nodir: true, cwd: path}).filter(file => !file.includes('node_modules') && !file.includes('.git/')).map(file => `${path}/${file}`)
  })

export default setvar