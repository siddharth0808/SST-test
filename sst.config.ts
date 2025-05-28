/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
    app(input) {
        return {
            name: "amplify-test",
            removal: input?.stage === "production" ? "retain" : "remove",
            protect: ["production"].includes(input?.stage),
            home: "aws"
        };
    },
    async run() {
        const infra = await import("./infra");
        return {
            stack: {
                dynamoDB: {
                    usersTable: infra.dynamodb_table_users.arn,
                    sessionsTable: infra.dynamodb_table_sessions.arn,
                },
                computeRole: {
                    arn: infra.computeRole.arn,
                    name: infra.computeRole.name,
                }
            }
        }
    },
});
