# Description

A toolkit to assist in setup and operations of a serverless platform for a multi-developer team, leveraging AWS best practices, the Serverless Framework, AWS Amplify, AWS AppSync, GraphQL, React and Expo.

# Setup

## Prerequisites

Install the following

1. Brew: ``$ /usr/bin/ruby -e "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/master/install)"``
1. Python: ``$ brew install python; brew upgrade python``
1. [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-install.html#install-tool-pip) or ``$ brew install awscli; brew upgrade awscli``
1. Setup your aws cli if you haven't: ``aws configure``
1. [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
1. [NVM](https://github.com/creationix/nvm#installation-and-update)
1. Node: ``nvm install 12``

## Installation
````
npm install git+ssh://git@github.com/gunnertech/gunnerfy.git -g
````

## Platform
````
$ gunnerfy new <project-name> -i <identifier> -o <organization-name>
````

### Examples

#### Fine Grained Access Control

Allow gunnerfy to create a new group for each environment.

This gives developers fine-grained access to the different environments, i.e., developers can only access their environment and not the staging, production environments.

````
$ gunnerfy new sample-project -i gunnertech.com -o SampleClient
$ gunnerfy new sample-project -i gunnertech.com -o SampleClient -s staging
$ gunnerfy new sample-project -i gunnertech.com -o SampleClient -s production
````

#### Lax Access Control

If you only want one group created for all the environments in the project, pass a group name to the command.

This will create fewer groups, but each environment will be in one group, meaning a developer in the group will have access to all of the environments.

````
$ gunnerfy new sampleProject -i gunnertech.com -o SampleClient -g sampleProjectGroup
$ gunnerfy new sampleProject -i gunnertech.com -o SampleClient -s staging  -g sampleProjectGroup
$ gunnerfy new sampleProject -i gunnertech.com -o SampleClient -s production  -g sampleProjectGroup
````

## Sentry

When you create the project in sentry, make sure you use the exact ``<project-name>`` as the project name

1. [Create a new project](https://sentry.io/organizations/gunner-technology/projects/new/)
2. Note the url (i.e. https://xxxxxxxxx@sentry.io/xxxxx)
3. ``gunnerfy set-var -n sentry-url -v <url>``




# RDS Schema Migrations and Codegen
````
$ cd <project-name>
$ gunnerfy generate migration -n <migration-name> -s <sql-statement>
$ gunnerfy migrate
$ amplify env checkout <stage>
$ amplify api add-graphql-datasource
````

# Adding a Team Member
1. Dev requests access to ``<base-stage>`` from team lead (where pull requests are submitted, i.e. staging) with their IAM ``<user-name>``
1. If approved, team lead will add dev's IAM user to the IAM group with access to base-stage

````
$ gunnerfy users add -u <user-name> -s <base-stage>
````

2. The approve will give the team lead a command to send to the new developer for them to run like this:
````
$ gunnerfy add-project <project-name> -a <accountId> -b <baseStage>
````



# Workflow

## Running Locally

### Backend 

````
$ gunnerfy develop
````

### React Client 

````
$ cd react-client
$ npm run start
````

### React Native Client 

````
$ cd react-native-client
$ npm run <simulator> (ios|android)
````

## Start of iteration
````
$ git checkout <base-stage (staging|prod)>; git pull; # this makes sure you have the latest code and hotfixes
$ git checkout <stage>; git merge <base-stage>
$ amplify env checkout <stage>
````

## Work on issues
````
$ git checkout -b <issue-number>
$ # work work work
$ gunnerfy deploy backend # if you need to make backend changes
$ git add .; git commit -am “closes #<issue-number>”
$ git checkout <stage>
$ git merge <issue-number>
$ git push
$ git branch -D <issue-number>
$ # Repeat on all issues assigned
````

## Submit pull request

Each developer on the project will submit a pull request at the end of the iteration

````
$  gunnerfy git-submit -i <iteration-end-date: (format: YYYYMMDD)> -t <target-stage>
````

## Approve pull requests

Team lead reviews and approves pull requests

````
$ gunnerfy git-approve -i <request-id> -s <stage> # gunnerfy git-approve -i 2 -s staging
$ # repeat above for all pull requests
$ gunnerfy git-tag -s <stage> -i <iteration-end-date (format: YYYYMMDD)>
````  


## Deploying


### Backend

````
$ gunnerfy deploy backend
````

### React Native Front End
````
$ gunnerfy deploy mobile
````
### React Front End

````
$ gunnerfy deploy web
````


# Recommended Training Material
1. [Amplify GraphQL](https://aws-amplify.github.io/docs/cli/graphql)
1. [Amplify Workflow](https://aws-amplify.github.io/docs/cli/multienv?sdk=js)
1. [Amplify VSCode Extension](https://github.com/aws-amplify/amplify-js/wiki/VS-Code-Snippet-Extension#full-code-block-snippet-documentation)
1. [Amplify with AppSync](https://aws-amplify.github.io/docs/js/api#aws-appsync-sdk)
5. [Serverless Framework Docs](https://serverless.com/framework/docs/providers/aws/guide/quick-start/)
1. [AWS CloudFormation Docs](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-reference.html)
1. [AppSync with Aurora](https://docs.aws.amazon.com/appsync/latest/devguide/tutorial-rds-resolvers.html#create-database-and-table)
1. [Expo Docs](https://docs.expo.io/versions/latest/)
1. [React Native Docs](https://facebook.github.io/react-native/docs/getting-started.html)
1. [React Docs](https://reactjs.org/docs/getting-started.html)
1. [Apollo Docs](https://www.apollographql.com/docs/react/)
1. [Ramda Docs](https://ramdajs.com/docs/)
1. [RxJS Docs](https://rxjs-dev.firebaseapp.com/guide/overview)
1. [AppSync Docs](https://docs.aws.amazon.com/appsync/latest/devguide/welcome.html)

# Gotchas

## DynamoDB

### One index at a time

DynamoDB will not let you create or delete two GSIs at the same time and for some reason, CloudFormation isn't smart enough to wait and do them sequentially.

This is especially problematic with the @connection directive

Try using this snippet before deploying new indexes to make sure the coast is clear:

````
$ aws dynamodb describe-table --table-name <table-name> --query Table.GlobalSecondaryIndexes[*].IndexStatus --profile <profile>
````

If everything is "ACTIVE", you're safe to deploy

## Accounts

If you want to delete an account, simply close the account.

However, you should also remove the IAM Group and IAM Policy in the main account as well

# TODO

1. Refactor all serverless variables inside the Resource block in serverless.yml into Parameters and Refs
1. Add Branch integration
1. Document optional settings and resources (i.e. Guest User, IAM Groups, etc)
1. Put in generic Gunner Tech branding instead of SimpliSurvey
1. Add view generators
1. Add route generators
1. Allow sql migrations to have an up and a down
1. Add back in sentry integration
1. remove ``process.env.NVM_BIN``
1. Update amplify host on web deploy so it has most recent environment variables
1. Wrap all binaries (yarn, npm, expo, amplify) in ``gunnerfy``
1. Allow user to select package manager (yarn or npm)