
import shell from 'shelljs'


const init = ({stage, projectName, path}) =>
  Promise.resolve('Setting up Git')
		.then(() => Promise.resolve(shell.exec(`
			cd ${path} && git init
		`).code))
		.then(code => Promise.resolve(shell.exec(`
cat >> ${path}/.git/config << EndOfMessage\n
[credential "https://git-codecommit.us-east-1.amazonaws.com/v1/repos/${projectName}-${stage}/"]\r
	UseHttpPath = true\r
	helper = !aws --profile ${projectName}-${stage}developer codecommit credential-helper \$@\r
[remote "${stage}"]\r
	url = https://git-codecommit.us-east-1.amazonaws.com/v1/repos/${projectName}-${stage}\r
	fetch = +refs/heads/*:refs/remotes/origin/*\r
	pushurl = https://git-codecommit.us-east-1.amazonaws.com/v1/repos/${projectName}-${stage}\r
[branch "${stage}"]\r
	remote = ${stage}\r
	merge = refs/heads/${stage}\r
EndOfMessage
		`).code))
		.then(code => Promise.resolve(shell.exec(`
			cd ${path} && git checkout -b ${stage} && git add . && git commit -am "initial commit"
		`).code))


export default init

// --help