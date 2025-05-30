console.log("app stage:", $app.stage);
const stage = $app.stage || "qa";
let usersTable: any//sst.aws.Dynamo.get(`Users-${stage}`, `Users-${stage}`);
let sessionsTable: any//sst.aws.Dynamo.get(`Sessions-${stage}`, `Sessions-${stage}`);
console.log("Checking for existing DynamoDB tables...");
console.log("User Table Exists:", usersTable ? usersTable.name : "No");
console.log("Session Table Exists:", sessionsTable ? sessionsTable.name : "No");
if (!usersTable) {
    console.log("Creating Users table as it does not exist.");
    usersTable = new sst.aws.Dynamo(`Users-${stage}`, {
        fields: {
            id: "string",
            accessTokenExpiresTtl: "number",
            username: "string",
            session_id: "string"
        },
        primaryIndex: { hashKey: "id" },
        globalIndexes: {
            byaccessTokenExpiresTtl: { hashKey: "accessTokenExpiresTtl" },
            byusername: { hashKey: "username" },
            bysession_id: { hashKey: "session_id" }
        },
        ttl: "accessTokenExpiresTtl", // Assuming 'access_token_expires_ttl' is the TTL field
        transform: {
            table: {
                name: `Users-${stage}` // Use environment variable for stage
            }
        }
    });
}
if (!sessionsTable) {
    console.log("Creating Sessions table as it does not exist.");
    sessionsTable = new sst.aws.Dynamo(`Sessions-${stage}`, {
        fields: {
            id: "string",
            user_id: "string",
            expireAt: "string",
            sessionExpiresTtl: "number"
        },
        primaryIndex: { hashKey: "id" },
        globalIndexes: {
            byuser_id: { hashKey: "user_id" },
            byexpireAt: { hashKey: "expireAt" },
            bysessionExpiresTtl: { hashKey: "sessionExpiresTtl" }
        },
        ttl: "sessionExpiresTtl",
        transform: {
            table: {
                name: `Sessions-${stage}`
            }
        }
    });
}

// Create a managed policy for accessing only the specific tables
export const dynamoDBAccessPolicy = new aws.iam.Policy(`ssr-uce-compute-policy-${stage}`, {
    name: `ssr-uce-compute-policy-${stage}`,
    policy: $resolve([(usersTable?.arn ?? ""), (sessionsTable?.arn ?? "")]).apply(([usersTableArn, sessionsTableArn]) => JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Action: [
                    "dynamodb:GetItem",
                    "dynamodb:PutItem",
                    "dynamodb:UpdateItem",
                    "dynamodb:DeleteItem",
                    "dynamodb:Query",
                    "dynamodb:Scan",
                    "dynamodb:BatchWriteItem"
                ],
                Resource: [
                    usersTableArn,
                    sessionsTableArn
                ]
            }
        ]
    }))
});

const existingComputeRole: any = undefined;
console.log("Existing Role:", existingComputeRole ? existingComputeRole : "No existing role found");

let createcomputeRole: aws.iam.Role | undefined = undefined;
if (!existingComputeRole) {
    console.log("Creating new compute role with DynamoDB access policy");
    createcomputeRole = new aws.iam.Role(`ssr-uce-compute-role-${stage}`, {
        name: `ssr-uce-compute-role-${stage}`,
        assumeRolePolicy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Action: "sts:AssumeRole",
                Effect: "Allow",
                Sid: "",
                Principal: {
                    Service: "amplify.amazonaws.com",
                },
            }],
        }),
        managedPolicyArns: [
            dynamoDBAccessPolicy.arn
        ],
    });
} else {
    console.log("Attaching existing role to the DynamoDB access policy");
    new aws.iam.RolePolicyAttachment(`ssr-uce-compute-role-policy-attachment-${stage}`, {
        role: existingComputeRole.name,
        policyArn: dynamoDBAccessPolicy.arn,
    });
}
export const dynamodb_table_users = usersTable;
export const dynamodb_table_sessions = sessionsTable;
export const computeRole = createcomputeRole || existingComputeRole;
