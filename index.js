const core = require('@actions/core');
const github = require('@actions/github');

(async function main() {
    const issue = core.getInput('ISSUE_NUMBER', {required: true, trimWhitespace: true})
    const repository = core.getInput('REPO',{required: true, trimWhitespace: true})
    const token = core.getInput('TOKEN', {required: true, trimWhitespace: true})
    const teams = core.getInput('TEAMS', {required: true, trimWhitespace: true}).split(',')
    const org = repository.split('/')[0]
    const repo = repository.split('/')[1]

    const client = await github.getOctokit(token)

    if(teams.length === 0) {
        core.setFailed(`No teams found, check your workflow definition for valid teams`)
        process.exit(1)
    }

    const assignees = {}
    for(const team of teams) {
        console.log(`Retrieving team ${org}/${repo}/team/${team}`)
        let response = await client.paginate(client.rest.teams.listMembersInOrg,{
            org: org,
            team_slug: team,
            per_page: 100
        })
        assignees[team] = response.map(member => member.login)
    }

    core.info(`Retrieving labels for ${org}/${repo}#${issue}`)
    let response = await client.paginate(client.rest.issues.listLabelsOnIssue,{
        owner: org,
        repo: repo,
        issue_number: issue
    })
    const labels = response.map(label => label.name)

    core.info(`Evaluating matching team labels`)
    for(const team of teams) {
        if(labels.includes(team)) {
            core.info(`Found label ${team} matching the ${team} team`)
            core.info(`Adding the following team members to ${org}/${repo}#${issue} as part of the ${team} team: ${JSON.stringify(assignees[team])}`)
            await client.rest.issues.addAssignees({
                owner: org,
                repo: repo,
                issue_number: issue,
                assignees: assignees[team]
            })
        }
    }

})();
