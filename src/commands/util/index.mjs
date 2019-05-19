import * as path from 'path';
import fs from 'fs-extra';

const projectHome = (projectName = '') =>
  fs.existsSync(`${path.resolve(path.dirname(''))}/gunnerfy.json`) ? (
    path.resolve(path.dirname(
      JSON.parse(
        fs.readFileSync(`${path.resolve(path.dirname(''))}/gunnerfy.json`, 'utf8')
      )
      .projectName
    ))
  ) : (
    path.resolve(path.dirname(`./${projectName}`), projectName)
  )

const workspaceHome = projectName => 
  path.resolve(projectHome(projectName), "..")

const projectName = projectName =>
  !!projectName ? (
    projectName
  ) : (
    JSON.parse(
      fs.readFileSync(`${projectHome(projectName)}/gunnerfy.json`, 'utf8')
    )
    .projectName
  )

export { projectHome, projectName, workspaceHome }
