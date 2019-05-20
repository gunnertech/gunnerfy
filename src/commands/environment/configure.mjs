import fs from 'fs-extra';

import { projectHome, workspaceHome } from '../util'

const grab = ({stage, projectName, targetFile, templateFile}) =>
  Promise.resolve('Configuring Environment')
    .then(() => fs.readFile(templateFile, 'utf8'))
    .then(contents => Promise.resolve(contents.replace(/<stage>/g, stage)) )
    .then(contents => Promise.resolve(contents.replace(/<project-name>/g, projectName)) )
    .then(contents => Promise.resolve(contents.replace(/<project-name-lower>/g, projectName.toLowerCase())) )
    .then(contents => 
      fs.existsSync(targetFile) ? (
        fs.readFile(targetFile, 'utf8')
          .then(existingContents =>
            existingContents.replace(new RegExp(projectName, 'g'), "").includes(stage) ? (
              Promise.resolve("")
            ) : (
              fs.writeFile(targetFile, existingContents.replace(/(\/\/|#)<new-environment>/g, contents), 'utf8')
            )
          )
      ) : (
        fs.writeFile(targetFile, contents, 'utf8')
      )
    )


const configure = ({stage, projectName}) =>
  Promise.resolve('Configuring Environment')
    .then(() => grab({
      stage, 
      projectName, 
      templateFile: `${projectHome(projectName)}/templates/environment.js.txt`,
      targetFile: `${projectHome(projectName)}/react-native-client/src/environment.js`
    }))
    .then(() => grab({
      stage, 
      projectName, 
      templateFile: `${projectHome(projectName)}/templates/.env.stage.txt`,
      targetFile: `${projectHome(projectName)}/react-client/.env.${stage}`
    }))
    .then(() => grab({
      stage, 
      projectName, 
      templateFile: `${projectHome(projectName)}/templates/secrets.yml.txt`,
      targetFile: `${projectHome(projectName)}/serverless/secrets.yml`
    }))
    .then(() => grab({
      stage, 
      projectName, 
      templateFile: `${projectHome(projectName)}/templates/env.yml.txt`,
      targetFile: `${projectHome(projectName)}/serverless/env.yml`
    }))
    .then(() => grab({
      stage, 
      projectName, 
      templateFile: `${projectHome(projectName)}/templates/git.txt`,
      targetFile: `${projectHome(projectName)}/.git/config`
    }))
    

export default configure