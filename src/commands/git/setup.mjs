
import shell from 'shelljs'
import fs from 'fs-extra';

import { projectHome } from '../util'


const init = ({stage, projectName}) =>
	fs.readFile(`${projectHome(projectName)}/.git/config`, 'utf8')
		.then(contents =>
			contents.includes(`[branch "${stage}"]`) ? (
				Promise.resolve("")
			) : (
				Promise.resolve('Setting up Git')
					.then(() => Promise.resolve(shell.exec(`
						cd ${projectHome(projectName)} && git init
					`).code))
					.then(code => Promise.resolve(shell.exec(`
cat >> ${projectHome(projectName)}/.git/config << EndOfMessage\n
[credential "https://git-codecommit.us-east-1.amazonaws.com/v1/repos/${projectName.toLowerCase()}-${stage}/"]\r
	UseHttpPath = true\r
	helper = !aws --profile ${projectName.toLowerCase()}-${stage}developer codecommit credential-helper \$@\r
[remote "${stage}"]\r
	url = https://git-codecommit.us-east-1.amazonaws.com/v1/repos/${projectName.toLowerCase()}-${stage}\r
	fetch = +refs/heads/*:refs/remotes/origin/*\r
	pushurl = https://git-codecommit.us-east-1.amazonaws.com/v1/repos/${projectName.toLowerCase()}-${stage}\r
[branch "${stage}"]\r
	remote = ${stage}\r
	merge = refs/heads/${stage}\r
EndOfMessage
					`).code))
					.then(code => Promise.resolve(shell.exec(`
						cd ${projectHome(projectName)} && git checkout -b ${stage} && git add . && git commit -am "initial commit"
					`).code))
			)
		)


export default init