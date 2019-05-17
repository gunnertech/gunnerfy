import fs from 'fs-extra';

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


const configure = ({stage, projectName, path}) =>
  Promise.resolve('Configuring Environment')
    .then(() => grab({
      stage, 
      projectName, 
      templateFile: `${path}/scripts/templates/environment.js.txt`,
      targetFile: `${path}/react-native-client/src/environment.js`
    }))
    .then(() => grab({
      stage, 
      projectName, 
      templateFile: `${path}/scripts/templates/.env.stage.txt`,
      targetFile: `${path}/react-client/.env.${stage}`
    }))
    .then(() => grab({
      stage, 
      projectName, 
      templateFile: `${path}/scripts/templates/secrets.yml.txt`,
      targetFile: `${path}/serverless/secrets.yml`
    }))
    .then(() => grab({
      stage, 
      projectName, 
      templateFile: `${path}/scripts/templates/env.yml.txt`,
      targetFile: `${path}/serverless/env.yml`
    }))
    .then(() => grab({
      stage, 
      projectName, 
      templateFile: `${path}/scripts/templates/git.txt`,
      targetFile: `${path}/.git/config`
    }))
    

export default configure