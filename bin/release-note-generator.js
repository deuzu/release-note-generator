#!/usr/bin/env node

const { exec } = require('child_process');
const JiraApi = require('jira-client');

const args = process.argv.slice(2);
require('dotenv').config();
const jira = new JiraApi({
    protocol: process.env.ISSUE_TRACKER_PROTOCOL,
    host: process.env.ISSUE_TRACKER_HOST,
    port: process.env.ISSUE_TRACKER_PORT,
    username: process.env.ISSUE_TRACKER_USERNAME,
    password: process.env.ISSUE_TRACKER_PASSWORD
});

const commitIssuePattern = /[a-zA-Z]+\((WEB-[0-9]+)\):.*/;
const promises = [];

const generateReleaseNote = (from, to) => {
    exec(`git log --pretty='format:%s' ${from}..${to}`, (err, stdout, stderr) => {
        const commits = stdout.split(/\r?\n/);
        const releaseNote = [];

        commits.map(commit => {
            const issueKey = commit.match(commitIssuePattern);

            if (issueKey) {
                const promise = jira.findIssue(issueKey[1]).then(issue => {
                    if (!issue.fields.parent) {
                        return { key: issue.key, summary: issue.fields.summary };
                    }
                });

                promises.push(promise);
            }
        });

        Promise.all(promises).then(issues => {
            issues = issues.filter((issue, index, self) =>
                self.findIndex(i => i.key === issue.key) === index
            );

            for (issue of issues) {
                console.log(`${issue.key} > ${issue.summary}`);
            }
        }).catch(error => {});
    });
};

generateReleaseNote(...args);
